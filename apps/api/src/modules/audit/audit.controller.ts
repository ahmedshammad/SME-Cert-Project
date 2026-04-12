import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { AuditService } from './audit.service';

// Roles allowed to read the full audit trail
const AUDIT_ADMIN_ROLES = ['PLATFORM_ADMIN', 'CONSORTIUM_ADMIN', 'AUDITOR'];

@ApiTags('Audit')
@ApiBearerAuth('JWT-auth')
@UseGuards(AuthGuard('jwt'))
@Controller({ path: 'audit', version: '1' })
export class AuditController {
  constructor(private auditService: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'Get audit logs (scoped to own actions for non-admin roles)' })
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('action') action?: string,
    @Query('userId') userId?: string,
    @Req() req?: any,
  ) {
    const canReadAll = AUDIT_ADMIN_ROLES.includes(req?.user?.role);
    // Non-admins always see only their own log entries regardless of query params
    const effectiveUserId = canReadAll ? userId : req?.user?.id;
    return this.auditService.findAll({ page, limit, action, userId: effectiveUserId });
  }
}
