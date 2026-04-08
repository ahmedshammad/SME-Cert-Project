import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import { FabricService } from '../../common/fabric/fabric.service';

@Injectable()
export class CertificatesService {
  private readonly logger = new Logger(CertificatesService.name);

  constructor(
    private prisma: PrismaService,
    private fabricService: FabricService,
    private configService: ConfigService,
  ) {}

  /**
   * Resolve a template by either DB primary key (id) or business key (templateId).
   * Returns the templateId and version needed for the certificate record.
   */
  private async resolveTemplate(templateIdOrDbId: string) {
    // Try by DB primary key first (what the frontend sends)
    let template = await this.prisma.template.findUnique({
      where: { id: templateIdOrDbId },
    });

    // Fallback: try by business templateId
    if (!template) {
      template = await this.prisma.template.findFirst({
        where: { templateId: templateIdOrDbId },
      });
    }

    if (!template) {
      throw new BadRequestException(`Template not found: ${templateIdOrDbId}`);
    }

    return template;
  }

  /**
   * Resolve an organization ID. Throws if the organization cannot be found,
   * so certificates are never silently attributed to the wrong organization.
   */
  private async resolveOrganizationId(organizationId?: string): Promise<string> {
    if (!organizationId) {
      throw new BadRequestException(
        'Your account is not associated with an organization. Please ask your administrator to assign you to an organization before issuing certificates.',
      );
    }

    const org = await this.prisma.organization.findUnique({ where: { id: organizationId } });
    if (!org) {
      throw new BadRequestException(
        `Organization not found (id: ${organizationId}). Please contact your administrator.`,
      );
    }

    return org.id;
  }

  /**
   * Resolve an issuer ID. Falls back to finding or creating a system user.
   */
  private async resolveIssuerId(issuerId?: string): Promise<string> {
    if (issuerId) {
      const user = await this.prisma.user.findUnique({ where: { id: issuerId } });
      if (user) return user.id;
    }

    // Use the first available admin/issuer user (must match UserRole enum exactly)
    const issuerUser = await this.prisma.user.findFirst({
      where: { role: { in: ['PLATFORM_ADMIN', 'CONSORTIUM_ADMIN', 'ISSUER_ADMIN', 'ISSUER_OPERATOR'] } },
      orderBy: { createdAt: 'asc' },
    });
    if (issuerUser) return issuerUser.id;

    // Last resort: use any user
    const anyUser = await this.prisma.user.findFirst({ orderBy: { createdAt: 'asc' } });
    if (anyUser) return anyUser.id;

    throw new BadRequestException('No issuer user found. Please create a user account first.');
  }

  async issue(data: {
    templateId: string;
    templateVersion?: string;
    holderEmail: string;
    holderName: string;
    data?: any;
    documentHash?: string;
    documentName?: string;
    documentSize?: number;
    issuerId?: string;
    organizationId?: string;
  }) {
    // Validate required fields
    if (!data.templateId) {
      throw new BadRequestException('templateId is required');
    }
    if (!data.holderEmail) {
      throw new BadRequestException('holderEmail is required');
    }
    if (!data.holderName) {
      throw new BadRequestException('holderName is required');
    }

    let template: any;
    let organizationId: string;
    let issuerId: string;

    // Resolve template
    try {
      template = await this.resolveTemplate(data.templateId);
    } catch (error: any) {
      this.logger.error(`Template resolution failed: ${error.message}`);
      throw new BadRequestException(`Template not found: ${data.templateId}`);
    }

    // Resolve organization
    try {
      organizationId = await this.resolveOrganizationId(data.organizationId || template.organizationId);
    } catch (error: any) {
      this.logger.error(`Organization resolution failed: ${error.message}`);
      throw new BadRequestException('Failed to resolve organization. Please check your account setup.');
    }

    // Resolve issuer
    try {
      issuerId = await this.resolveIssuerId(data.issuerId);
    } catch (error: any) {
      this.logger.error(`Issuer resolution failed: ${error.message}`);
      throw new BadRequestException('No issuer user found. Please ensure at least one user account exists.');
    }

    const certId = uuidv4();
    const certHash = crypto
      .createHash('sha256')
      .update(JSON.stringify({
        ...(data.data || {}),
        certId,
        documentHash: data.documentHash,
        timestamp: new Date().toISOString(),
      }))
      .digest('hex');

    let certificate: any;
    try {
      certificate = await this.prisma.certificate.create({
        data: {
          certId,
          templateId: template.templateId,
          templateVersion: data.templateVersion || template.version || '1',
          holderId: certId,
          holderName: data.holderName,
          holderEmail: data.holderEmail,
          issuerId,
          organizationId,
          status: 'ISSUED',
          certHash,
          claims: {
            ...(data.data || {}),
            documentHash: data.documentHash,
            documentName: data.documentName,
            documentSize: data.documentSize,
          },
          contentPointer: data.documentHash ? `hash://${data.documentHash}` : 'ipfs://pending',
          issuedAt: new Date(),
          verificationUrl: `${this.configService.get<string>('APP_URL', 'http://localhost:3000')}/verify/${certId}`,
        },
      });
    } catch (error: any) {
      this.logger.error(`Certificate DB creation failed: ${error.message}`, error.stack);
      throw new BadRequestException(
        `Failed to create certificate record: ${error.message?.substring(0, 200)}`,
      );
    }

    // Record on blockchain (best-effort)
    try {
      await this.fabricService.issueCertificate(
        certId,
        template.templateId,
        data.templateVersion || template.version || '1',
        certId,
        certHash,
        data.documentHash ? `hash://${data.documentHash}` : 'ipfs://pending',
        new Date().toISOString(),
        '',
        '',
      );
      this.logger.log(`Certificate ${certId} recorded on blockchain`);
    } catch (error: any) {
      this.logger.warn(`Blockchain recording deferred for certificate ${certId}: ${error.message}`);
    }

    // Audit log
    try {
      await this.prisma.auditLog.create({
        data: {
          action: 'CERTIFICATE_ISSUED',
          userId: issuerId,
          details: { certificateId: certId, holderEmail: data.holderEmail },
        },
      });
    } catch (auditError: any) {
      this.logger.warn(`Audit log creation failed: ${auditError.message}`);
    }

    this.logger.log(`Certificate ${certId} issued successfully for ${data.holderEmail}`);

    return {
      ...certificate,
      certificateId: certId,
    };
  }

  async findById(id: string) {
    // Try by DB id first, then by certId
    let cert = await this.prisma.certificate.findUnique({
      where: { id },
      include: { template: true, organization: true },
    });
    if (!cert) {
      cert = await this.prisma.certificate.findUnique({
        where: { certId: id },
        include: { template: true, organization: true },
      });
    }
    if (!cert) throw new NotFoundException('Certificate not found');
    return cert;
  }

  async verifyByHash(hash: string) {
    // Search by certHash first
    let cert = await this.prisma.certificate.findFirst({
      where: { certHash: hash },
      include: { template: true, organization: true },
    });

    // If not found, search in claims.documentHash (JSON field)
    if (!cert) {
      cert = await this.prisma.certificate.findFirst({
        where: {
          claims: {
            path: ['documentHash'],
            equals: hash,
          },
        },
        include: { template: true, organization: true },
      });
    }

    // Also try contentPointer which stores hash://
    if (!cert) {
      cert = await this.prisma.certificate.findFirst({
        where: { contentPointer: `hash://${hash}` },
        include: { template: true, organization: true },
      });
    }

    if (!cert) {
      throw new NotFoundException(
        'No certificate found matching this file hash. The document may not have been issued through this platform.',
      );
    }

    const status =
      cert.status === 'REVOKED' ? 'REVOKED' : cert.status === 'ISSUED' ? 'VALID' : 'EXPIRED';

    // Check if the hash matches documentHash specifically
    const claims = cert.claims as any;
    const documentHashMatch = claims?.documentHash === hash;
    const certHashMatch = cert.certHash === hash;

    // Record verification
    try {
      await this.prisma.verification.create({
        data: {
          certificateId: cert.id,
          status,
          hashVerified: documentHashMatch || certHashMatch,
          signatureVerified: true,
          revocationChecked: true,
          evidenceData: {
            certId: cert.certId,
            method: 'file-hash',
            presentedHash: hash,
            documentHashMatch,
            certHashMatch,
            verifiedAt: new Date().toISOString(),
          },
        },
      });
    } catch (verifyError: any) {
      this.logger.warn(`Verification record creation failed: ${verifyError.message}`);
    }

    return {
      status,
      hashMatch: documentHashMatch || certHashMatch,
      certificate: {
        id: cert.id,
        certId: cert.certId,
        holderName: cert.holderName,
        issuerName: cert.organization?.name,
        templateName: cert.template?.displayName,
        issuedAt: cert.issuedAt,
        expiresAt: cert.expiresAt,
        documentHash: claims?.documentHash,
        documentName: claims?.documentName,
      },
      blockchainTxId: cert.txId,
    };
  }

  async verify(id: string) {
    // Try by id first, then by certId
    let cert = await this.prisma.certificate.findUnique({
      where: { id },
      include: { template: true, organization: true },
    });
    if (!cert) {
      cert = await this.prisma.certificate.findUnique({
        where: { certId: id },
        include: { template: true, organization: true },
      });
    }
    if (!cert) throw new NotFoundException('Certificate not found');

    try {
      await this.fabricService.verifyCertificateRecord(cert.certId, cert.certHash);
    } catch {
      this.logger.warn(`Blockchain verification unavailable for ${id}`);
    }

    const status = cert.status === 'REVOKED' ? 'REVOKED' : cert.status === 'ISSUED' ? 'VALID' : 'EXPIRED';

    // Record verification
    try {
      await this.prisma.verification.create({
        data: {
          certificateId: cert.id,
          status,
          hashVerified: true,
          signatureVerified: true,
          revocationChecked: true,
          evidenceData: { certId: cert.certId, verifiedAt: new Date().toISOString() },
        },
      });
    } catch (verifyError: any) {
      this.logger.warn(`Verification record creation failed: ${verifyError.message}`);
    }

    return {
      status,
      certificate: {
        id: cert.id,
        holderName: cert.holderName,
        issuerName: cert.organization?.name,
        templateName: cert.template?.displayName,
        issuedAt: cert.issuedAt,
        expiresAt: cert.expiresAt,
      },
      blockchainTxId: cert.txId,
    };
  }

  async revoke(id: string, reason: string, userId?: string, organizationId?: string) {
    const cert = await this.findById(id);
    const resolvedUserId = userId || await this.resolveIssuerId();

    // Enforce org-scoped ownership: issuer can only revoke their own org's certificates
    if (organizationId && cert.organizationId !== organizationId) {
      throw new Error('Forbidden: certificate does not belong to your organization');
    }

    await this.prisma.certificate.update({
      where: { id: cert.id },
      data: { status: 'REVOKED', revokedAt: new Date(), revocationReason: reason },
    });

    try {
      await this.fabricService.revokeCertificate(cert.certId, reason, reason);
    } catch {
      this.logger.warn(`Blockchain revocation deferred for ${id}`);
    }

    try {
      await this.prisma.auditLog.create({
        data: {
          action: 'CERTIFICATE_REVOKED',
          userId: resolvedUserId,
          details: { certificateId: id, reason },
        },
      });
    } catch (auditError: any) {
      this.logger.warn(`Audit log creation failed: ${auditError.message}`);
    }

    return { success: true };
  }

  async getIssuerStats(organizationId?: string) {
    const where = organizationId ? { organizationId } : {};
    const [totalIssued, activeCertificates, revokedCertificates, expiringSoon] = await Promise.all([
      this.prisma.certificate.count({ where }),
      this.prisma.certificate.count({ where: { ...where, status: 'ISSUED' } }),
      this.prisma.certificate.count({ where: { ...where, status: 'REVOKED' } }),
      this.prisma.certificate.count({
        where: {
          ...where,
          status: 'ISSUED',
          expiresAt: { lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

    return { totalIssued, activeCertificates, revokedCertificates, expiringSoon };
  }

  async getRecent(organizationId?: string, limit = 10) {
    const where = organizationId ? { organizationId } : {};
    return this.prisma.certificate.findMany({
      where,
      include: { template: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async getHolderCertificates(holderEmail?: string) {
    if (!holderEmail) return [];
    return this.prisma.certificate.findMany({
      where: { holderEmail },
      include: { template: true, organization: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}
