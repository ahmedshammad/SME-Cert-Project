import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private senderName: string;
  private senderEmail: string;

  constructor(private readonly config: ConfigService) {
    this.initTransporter();
  }

  private initTransporter() {
    const host = this.config.get<string>('SMTP_HOST');
    const port = this.config.get<number>('SMTP_PORT', 587);
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');

    if (!host || !user || !pass) {
      this.logger.warn('SMTP not configured — emails will be skipped (set SMTP_HOST, SMTP_USER, SMTP_PASS)');
      return;
    }

    this.senderName = this.config.get<string>('PLATFORM_NAME', 'SME Certificate Trust Platform');
    this.senderEmail = user;

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      tls: { rejectUnauthorized: this.config.get('NODE_ENV') === 'production' },
    });

    this.logger.log(`SMTP configured: ${host}:${port} (from: ${user})`);
  }

  get isConfigured(): boolean {
    return this.transporter !== null;
  }

  /** Low-level send — catches and logs errors so callers never throw due to email. */
  async send(options: {
    to: string;
    subject: string;
    html: string;
    replyTo?: string;
  }): Promise<void> {
    if (!this.transporter) {
      this.logger.warn(`[Email skipped — SMTP not configured] Subject: "${options.subject}" To: ${options.to}`);
      return;
    }
    try {
      await this.transporter.sendMail({
        from: `"${this.senderName}" <${this.senderEmail}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        replyTo: options.replyTo,
      });
      this.logger.log(`Email sent: "${options.subject}" → ${options.to}`);
    } catch (err: any) {
      this.logger.error(`Failed to send email to ${options.to}: ${err.message}`);
      // Never throw — email failure must not break the main request
    }
  }

  // ─── Templated email helpers ───────────────────────────────────────────────

  /** Welcome email after registration */
  async sendWelcome(user: { firstName: string; email: string; role: string }): Promise<void> {
    const appUrl = this.config.get<string>('APP_URL', 'http://localhost:5173');
    const roleLabel: Record<string, string> = {
      ISSUER_ADMIN: 'Issuer Administrator',
      ISSUER_OPERATOR: 'Issuer Operator',
      SME_USER: 'SME User',
      VERIFIER_USER: 'Verifier',
      AUDITOR_USER: 'Auditor',
    };

    await this.send({
      to: user.email,
      subject: `Welcome to ${this.config.get('PLATFORM_NAME', 'SME Certificate Trust Platform')}`,
      html: this.wrap(`
        <h2 style="color:#1B3A5C;">Welcome, ${this.escape(user.firstName)}!</h2>
        <p>Your account has been created on the <strong>SME Certificate Trust Platform</strong> with the role of
           <strong>${roleLabel[user.role] || user.role}</strong>.</p>
        <p>This platform provides blockchain-anchored digital certificate issuance and verification,
           aligned with Egypt Vision 2030.</p>
        <p>
          <a href="${appUrl}/login"
             style="display:inline-block;padding:12px 24px;background:#1B3A5C;color:#fff;border-radius:6px;text-decoration:none;font-weight:bold;">
            Sign In to Your Account
          </a>
        </p>
        <p style="color:#888;font-size:13px;">
          If you did not create this account, please contact us immediately at
          <a href="mailto:ahmeds_hammad@hotmail.com">ahmeds_hammad@hotmail.com</a>.
        </p>
      `),
    });
  }

  /** Password reset email */
  async sendPasswordReset(user: { firstName: string; email: string }, resetUrl: string): Promise<void> {
    await this.send({
      to: user.email,
      subject: 'Password Reset Request — SME Certificate Trust Platform',
      html: this.wrap(`
        <h2 style="color:#1B3A5C;">Password Reset Request</h2>
        <p>Hi ${this.escape(user.firstName)},</p>
        <p>We received a request to reset the password for your account (<strong>${this.escape(user.email)}</strong>).</p>
        <p>Click the button below to set a new password. This link is valid for <strong>1 hour</strong>.</p>
        <p>
          <a href="${resetUrl}"
             style="display:inline-block;padding:12px 24px;background:#C5A23D;color:#1B3A5C;border-radius:6px;text-decoration:none;font-weight:bold;">
            Reset My Password
          </a>
        </p>
        <p style="color:#888;font-size:13px;">
          If you did not request a password reset, you can safely ignore this email.
          Your password will not change until you click the link above.
        </p>
        <p style="color:#aaa;font-size:12px;word-break:break-all;">
          If the button does not work, paste this link into your browser:<br/>${resetUrl}
        </p>
      `),
    });
  }

  /** Contact form notification to admin */
  async sendContactNotification(
    dto: { name: string; email: string; organization?: string; interest?: string; message: string },
    recipientEmail: string,
  ): Promise<void> {
    const platformName = this.config.get<string>('PLATFORM_NAME', 'SME Certificate Trust Platform');
    await this.send({
      to: recipientEmail,
      replyTo: dto.email,
      subject: `[Contact] ${dto.interest || 'General Inquiry'} from ${this.escape(dto.name)}`,
      html: this.wrap(`
        <h2 style="color:#1B3A5C;">New Contact Form Submission</h2>
        <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
          <tr><td style="padding:6px 0;font-weight:bold;width:140px;">Name:</td><td>${this.escape(dto.name)}</td></tr>
          <tr><td style="padding:6px 0;font-weight:bold;">Email:</td><td><a href="mailto:${this.escape(dto.email)}">${this.escape(dto.email)}</a></td></tr>
          <tr><td style="padding:6px 0;font-weight:bold;">Organization:</td><td>${this.escape(dto.organization || '—')}</td></tr>
          <tr><td style="padding:6px 0;font-weight:bold;">Interest:</td><td>${this.escape(dto.interest || '—')}</td></tr>
        </table>
        <h3 style="color:#1B3A5C;">Message:</h3>
        <div style="background:#f5f7fa;padding:14px;border-radius:6px;border-left:4px solid #1B3A5C;white-space:pre-wrap;">${this.escape(dto.message)}</div>
        <p style="font-size:12px;color:#aaa;margin-top:20px;">Submitted via ${platformName}</p>
      `),
    });
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  /** Wraps HTML fragment in a consistent branded email shell */
  private wrap(body: string): string {
    const platformName = this.config.get<string>('PLATFORM_NAME', 'SME Certificate Trust Platform');
    return `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"/></head>
      <body style="margin:0;padding:0;background:#f0f4f8;font-family:'Segoe UI',Arial,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:32px 0;">
          <tr><td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
              <!-- Header -->
              <tr>
                <td style="background:linear-gradient(135deg,#1B3A5C,#2D5F8A);padding:24px 32px;">
                  <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700;">🛡️ ${platformName}</h1>
                  <p style="margin:4px 0 0;color:rgba(255,255,255,0.7);font-size:12px;">Egypt Vision 2030 · Blockchain-Anchored Certificates</p>
                </td>
              </tr>
              <!-- Body -->
              <tr>
                <td style="padding:32px;color:#222;font-size:15px;line-height:1.6;">
                  ${body}
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0;">
                  <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;">
                    &copy; ${new Date().getFullYear()} ${platformName} · Alexandria, Egypt<br/>
                    Developed by Ahmed Hammad under the supervision of Prof. Ghada El Khayat, Alexandria University
                  </p>
                </td>
              </tr>
            </table>
          </td></tr>
        </table>
      </body>
      </html>
    `;
  }

  escape(str: string): string {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
