import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EmailService } from '../../common/email/email.service';

export interface ContactDto {
  name: string;
  email: string;
  organization?: string;
  interest?: string;
  message: string;
}

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  async submit(dto: ContactDto, ipAddress?: string): Promise<{ success: boolean }> {
    if (!dto.name?.trim()) throw new BadRequestException('Name is required');
    if (!dto.email?.trim()) throw new BadRequestException('Email is required');
    if (!dto.message?.trim()) throw new BadRequestException('Message is required');
    if (dto.message.length > 5000) throw new BadRequestException('Message too long (max 5000 chars)');

    // Always persist to DB regardless of email config
    await this.prisma.contactSubmission.create({
      data: {
        name: dto.name.trim(),
        email: dto.email.trim().toLowerCase(),
        organization: dto.organization?.trim() || null,
        interest: dto.interest?.trim() || null,
        message: dto.message.trim(),
        ipAddress: ipAddress || null,
      },
    });

    // Send notification email (non-throwing)
    const recipientEmail = this.config.get<string>('CONTACT_TO_EMAIL', 'ahmeds_hammad@hotmail.com');
    await this.emailService.sendContactNotification(dto, recipientEmail);

    this.logger.log(`Contact submission received from ${dto.email}`);
    return { success: true };
  }
}
