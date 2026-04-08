import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../common/prisma/prisma.service';
import { FabricService } from '../../common/fabric/fabric.service';

@Injectable()
export class TemplatesService {
  private readonly logger = new Logger(TemplatesService.name);

  constructor(
    private prisma: PrismaService,
    private fabricService: FabricService,
  ) {}

  async findAll(organizationId?: string) {
    const where = organizationId ? { organizationId } : {};
    return this.prisma.template.findMany({
      where,
      include: { _count: { select: { certificates: true } }, organization: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    const template = await this.prisma.template.findUnique({
      where: { id },
      include: { organization: true },
    });
    if (!template) throw new NotFoundException('Template not found');
    return template;
  }

  private async resolveOrganizationId(organizationId: string): Promise<string> {
    if (!organizationId || organizationId === 'default') {
      throw new BadRequestException(
        'Your account is not associated with an organization. Please ask your administrator to assign you to an organization before creating templates.',
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

  async create(data: {
    name: string;
    nameAr?: string;
    description: string;
    schema: any;
    organizationId: string;
    createdBy: string;
  }) {
    const resolvedOrgId = await this.resolveOrganizationId(data.organizationId);
    const templateId = uuidv4();

    const template = await this.prisma.template.create({
      data: {
        templateId,
        version: '1',
        displayName: data.name,
        displayNameAr: data.nameAr,
        description: data.description,
        jsonSchema: data.schema || {},
        uiSchema: {},
        organizationId: resolvedOrgId,
        category: 'general',
        createdBy: data.createdBy,
      },
    });

    this.logger.log(`Template "${data.name}" created with ID ${template.id}`);

    return {
      ...template,
      name: template.displayName,
      nameAr: template.displayNameAr,
      status: template.active ? 'ACTIVE' : 'DRAFT',
    };
  }

  async publish(id: string) {
    const template = await this.findById(id);

    // Record on blockchain
    await this.fabricService.createTemplate(
      template.templateId,
      template.version,
      template.displayName,
      template.description,
      template.jsonSchema,
      template.uiSchema || {},
      template.requiredClaims,
      template.issuerConstraints,
      template.validityDaysDefault,
      template.category,
    );

    return this.prisma.template.update({
      where: { id },
      data: { publishedToChain: true },
    });
  }
}
