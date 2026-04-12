import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
  ConflictException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../common/prisma/prisma.service';
import { FabricService } from '../../common/fabric/fabric.service';

export interface RegisterOrgDto {
  name: string;
  nameAr?: string;
  type: string;
  contactEmail: string;
  contactPerson: string;
  address?: string;
  city?: string;
  adminFirstName: string;
  adminLastName: string;
  adminEmail: string;
  adminPassword: string;
}

@Injectable()
export class OrganizationsService {
  private readonly logger = new Logger(OrganizationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly fabricService: FabricService,
  ) {}

  /**
   * Public registration endpoint — creates org in DB as PENDING.
   * No blockchain interaction until admin approval.
   */
  async register(dto: RegisterOrgDto): Promise<{ organizationId: string; message: string }> {
    // Check for duplicate contact email
    const existing = await this.prisma.organization.findFirst({
      where: { contactEmail: dto.contactEmail },
    });
    if (existing) {
      throw new ConflictException('An organization with this contact email is already registered.');
    }

    // Check for duplicate admin email
    const existingUser = await this.prisma.user.findUnique({ where: { email: dto.adminEmail } });
    if (existingUser) {
      throw new ConflictException('A user account with this email already exists.');
    }

    const orgId = `org-${uuidv4().split('-')[0]}`; // Short readable ID e.g. org-a1b2c3d4
    const mspId = `${orgId.replace('org-', 'Org')}MSP`; // e.g. Orga1b2c3d4MSP

    // Hash the admin password
    const bcrypt = await import('bcrypt');
    const passwordHash = await bcrypt.hash(dto.adminPassword, 12);

    // Create org + admin user in a transaction
    const org = await this.prisma.$transaction(async (tx) => {
      const newOrg = await tx.organization.create({
        data: {
          orgId,
          name: dto.name,
          nameAr: dto.nameAr || null,
          type: dto.type,
          mspId,
          contactEmail: dto.contactEmail,
          contactPerson: dto.contactPerson,
          address: dto.address || null,
          city: dto.city || null,
          active: false, // Not active until approved
          registrationStatus: 'PENDING',
        },
      });

      await tx.user.create({
        data: {
          email: dto.adminEmail,
          passwordHash,
          firstName: dto.adminFirstName,
          lastName: dto.adminLastName,
          role: 'ISSUER_ADMIN',
          status: 'PENDING_VERIFICATION',
          organizationId: newOrg.id,
        },
      });

      return newOrg;
    });

    this.logger.log(`Organization registration submitted: ${org.name} (${org.id}), status=PENDING`);

    return {
      organizationId: org.id,
      message: 'Registration submitted successfully. An administrator will review your application.',
    };
  }

  /**
   * Admin approval — activates org, registers on blockchain (best-effort).
   */
  async approve(orgId: string, requestingUserId: string): Promise<{ success: boolean }> {
    const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) throw new NotFoundException('Organization not found');
    if (org.registrationStatus === 'APPROVED') {
      throw new BadRequestException('Organization is already approved.');
    }
    if (org.registrationStatus === 'REJECTED') {
      throw new BadRequestException('Cannot approve a rejected organization. Create a new registration.');
    }

    // Update org status
    await this.prisma.organization.update({
      where: { id: orgId },
      data: {
        registrationStatus: 'APPROVED',
        active: true,
        updatedAt: new Date(),
      },
    });

    // Activate all pending users in this org
    await this.prisma.user.updateMany({
      where: { organizationId: orgId, status: 'PENDING_VERIFICATION' },
      data: { status: 'ACTIVE' },
    });

    // Register on blockchain (best-effort — Fabric may not be up)
    try {
      await this.fabricService.registerIssuer(
        org.orgId,
        org.name,
        {}, // publicKeySet — populated later when org uploads cert
        ['ISSUER'],
        org.contactEmail,
        org.contactPerson,
      );
      this.logger.log(`Organization ${org.name} registered on blockchain`);
    } catch (err: any) {
      this.logger.warn(`Blockchain registration deferred for org ${org.orgId}: ${err.message}`);
    }

    // Audit log
    try {
      await this.prisma.auditLog.create({
        data: {
          action: 'USER_UPDATED',
          userId: requestingUserId,
          resourceType: 'Organization',
          resourceId: orgId,
          details: { event: 'ORG_APPROVED', orgName: org.name, orgId: org.orgId },
        },
      });
    } catch (auditErr: any) {
      this.logger.warn(`Audit log failed: ${auditErr.message}`);
    }

    this.logger.log(`Organization ${org.name} (${org.id}) approved by user ${requestingUserId}`);
    return { success: true };
  }

  /**
   * Admin rejection — marks org as rejected with reason.
   */
  async reject(
    orgId: string,
    reason: string,
    requestingUserId: string,
  ): Promise<{ success: boolean }> {
    const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) throw new NotFoundException('Organization not found');
    if (org.registrationStatus === 'APPROVED') {
      throw new ForbiddenException('Cannot reject an already approved organization. Use the suspension workflow instead.');
    }

    await this.prisma.organization.update({
      where: { id: orgId },
      data: { registrationStatus: 'REJECTED', active: false },
    });

    // Suspend pending users
    await this.prisma.user.updateMany({
      where: { organizationId: orgId, status: 'PENDING_VERIFICATION' },
      data: { status: 'SUSPENDED' },
    });

    try {
      await this.prisma.auditLog.create({
        data: {
          action: 'USER_UPDATED',
          userId: requestingUserId,
          resourceType: 'Organization',
          resourceId: orgId,
          details: { event: 'ORG_REJECTED', orgName: org.name, reason },
        },
      });
    } catch (auditErr: any) {
      this.logger.warn(`Audit log failed: ${auditErr.message}`);
    }

    this.logger.log(`Organization ${org.name} (${org.id}) rejected by user ${requestingUserId}`);
    return { success: true };
  }

  /**
   * List pending organizations (admin view).
   */
  async listPending() {
    return this.prisma.organization.findMany({
      where: { registrationStatus: 'PENDING' },
      include: { users: { select: { id: true, email: true, firstName: true, lastName: true, role: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * List all organizations (admin view).
   */
  async listAll() {
    return this.prisma.organization.findMany({
      include: { _count: { select: { users: true, certificates: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }
}
