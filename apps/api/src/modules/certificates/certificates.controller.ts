import { Controller, Get, Post, Param, Body, Query, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CertificatesService } from './certificates.service';

const ADMIN_ROLES = ['PLATFORM_ADMIN', 'CONSORTIUM_ADMIN'];
const NO_ORG_SENTINEL = '00000000-0000-0000-0000-000000000000';

@ApiTags('Certificates')
@Controller({ path: 'certificates', version: '1' })
export class CertificatesController {
  constructor(private certificatesService: CertificatesService) {}

  @Post()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Issue a new certificate' })
  issue(@Body() body: any, @Req() req: any) {
    return this.certificatesService.issue({
      ...body,
      issuerId: req.user?.id,
      organizationId: req.user?.organizationId,
    });
  }

  @Get('stats')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get issuer statistics' })
  getStats(@Req() req: any) {
    const isAdmin = ADMIN_ROLES.includes(req.user?.role);
    const orgId = isAdmin ? req.user?.organizationId : (req.user?.organizationId ?? NO_ORG_SENTINEL);
    return this.certificatesService.getIssuerStats(orgId);
  }

  @Get('recent')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get recent certificates' })
  getRecent(@Req() req: any, @Query('limit') limit?: number) {
    const isAdmin = ADMIN_ROLES.includes(req.user?.role);
    const orgId = isAdmin ? req.user?.organizationId : (req.user?.organizationId ?? NO_ORG_SENTINEL);
    return this.certificatesService.getRecent(orgId, limit);
  }

  @Get('holder')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get holder certificates' })
  getHolderCerts(@Req() req: any) {
    return this.certificatesService.getHolderCertificates(req.user?.email);
  }

  @Get('verify-by-hash/:hash')
  @ApiOperation({ summary: 'Verify a certificate by file/document hash' })
  verifyByHash(@Param('hash') hash: string) {
    return this.certificatesService.verifyByHash(hash);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get certificate by ID' })
  findById(@Param('id') id: string) {
    return this.certificatesService.findById(id);
  }

  @Get(':id/verify')
  @ApiOperation({ summary: 'Verify a certificate' })
  verify(@Param('id') id: string) {
    return this.certificatesService.verify(id);
  }

  @Post(':id/revoke')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Revoke a certificate' })
  revoke(@Param('id') id: string, @Body() body: { reason: string }, @Req() req: any) {
    return this.certificatesService.revoke(id, body.reason, req.user?.id, req.user?.organizationId);
  }
}
