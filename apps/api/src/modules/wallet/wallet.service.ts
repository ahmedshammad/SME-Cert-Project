import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(private prisma: PrismaService) {}

  async getWalletInfo(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { organization: true },
    });

    const certCount = await this.prisma.certificate.count({
      where: { holderEmail: user?.email },
    });

    return {
      userId: user?.id,
      email: user?.email,
      organization: user?.organization?.name,
      certificateCount: certCount,
    };
  }

  async rotateKeys(userId: string) {
    const newKey = crypto.randomBytes(32);

    await this.prisma.encryptionKey.create({
      data: {
        keyId: `key-${Date.now()}`,
        purpose: 'CERTIFICATE_PAYLOAD',
        algorithm: 'AES-256-GCM',
        encryptedKey: newKey,
        active: true,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        action: 'ENCRYPTION_KEY_ROTATED',
        userId,
        details: { timestamp: new Date().toISOString() },
      },
    });

    this.logger.log(`Encryption keys rotated for user ${userId}`);
    return { success: true };
  }
}
