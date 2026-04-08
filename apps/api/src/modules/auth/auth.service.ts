import { Injectable, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EmailService } from '../../common/email/email.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: { organization: true },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return user;
  }

  async login(email: string, password: string) {
    const user = await this.validateUser(email, password);

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    await this.prisma.session.create({
      data: {
        userId: user.id,
        token: accessToken,
        refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        action: 'USER_LOGIN',
        userId: user.id,
        details: { email: user.email },
      },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        organizationId: user.organizationId,
        organizationName: user.organization?.name,
        locale: user.locale || 'en',
      },
    };
  }

  async register(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: string;
    organizationName?: string;
  }) {
    const passwordHash = await bcrypt.hash(data.password, 12);

    const user = await this.prisma.user.create({
      data: {
        email: data.email.toLowerCase().trim(),
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role as any,
        status: 'ACTIVE',
      },
    });

    // Send welcome email (fire-and-forget — never block registration)
    this.emailService.sendWelcome({ firstName: user.firstName, email: user.email, role: user.role }).catch(() => {});

    return this.login(data.email.toLowerCase().trim(), data.password);
  }

  async logout(userId: string, token: string) {
    await this.prisma.session.deleteMany({
      where: { userId, token },
    });

    await this.prisma.auditLog.create({
      data: {
        action: 'USER_LOGOUT',
        userId,
        details: {},
      },
    });
  }

  // ─── Password Reset ───────────────────────────────────────────────────────

  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });

    // Silent return — never reveal whether the email exists (prevent enumeration)
    if (!user) {
      this.logger.warn(`Password reset requested for unknown email: ${email}`);
      return;
    }

    // Invalidate any existing unused tokens for this user
    await this.prisma.passwordResetToken.deleteMany({
      where: { userId: user.id, usedAt: null },
    });

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });

    const appUrl = this.configService.get<string>('APP_URL', 'http://localhost:5173');
    const resetUrl = `${appUrl}/reset-password?token=${rawToken}`;

    await this.emailService.sendPasswordReset({ firstName: user.firstName, email: user.email }, resetUrl);
    this.logger.log(`Password reset email sent to ${user.email}`);
  }

  async resetPassword(rawToken: string, newPassword: string): Promise<void> {
    if (!rawToken || !newPassword) {
      throw new BadRequestException('Token and new password are required');
    }
    if (newPassword.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }

    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const tokenRecord = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!tokenRecord) {
      throw new BadRequestException('Invalid or expired password reset link');
    }
    if (tokenRecord.usedAt) {
      throw new BadRequestException('This reset link has already been used');
    }
    if (tokenRecord.expiresAt < new Date()) {
      throw new BadRequestException('This reset link has expired. Please request a new one');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: tokenRecord.userId },
        data: { passwordHash },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: tokenRecord.id },
        data: { usedAt: new Date() },
      }),
      // Invalidate all sessions for security
      this.prisma.session.deleteMany({
        where: { userId: tokenRecord.userId },
      }),
    ]);

    this.logger.log(`Password reset completed for user ${tokenRecord.user.email}`);
  }
}
