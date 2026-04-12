import {
  Controller,
  Post,
  Patch,
  Get,
  Param,
  Body,
  Req,
  HttpCode,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OrganizationsService, RegisterOrgDto } from './organizations.service';

const ADMIN_ROLES = ['PLATFORM_ADMIN', 'CONSORTIUM_ADMIN'];

function requireAdmin(req: any) {
  if (!req.user || !ADMIN_ROLES.includes(req.user.role)) {
    throw new ForbiddenException('Only platform administrators can perform this action.');
  }
}

@ApiTags('Organizations')
@Controller({ path: 'organizations', version: '1' })
export class OrganizationsController {
  constructor(private readonly orgsService: OrganizationsService) {}

  /**
   * Public — submit a new organization registration request.
   */
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit organization registration request' })
  register(@Body() body: RegisterOrgDto) {
    return this.orgsService.register(body);
  }

  /**
   * Admin — list pending registrations.
   */
  @Get('pending')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'List pending organization registrations (admin)' })
  listPending(@Req() req: any) {
    requireAdmin(req);
    return this.orgsService.listPending();
  }

  /**
   * Admin — list all organizations.
   */
  @Get()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'List all organizations (admin)' })
  listAll(@Req() req: any) {
    requireAdmin(req);
    return this.orgsService.listAll();
  }

  /**
   * Admin — approve a pending registration.
   */
  @Patch(':id/approve')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Approve organization registration (admin)' })
  approve(@Param('id') id: string, @Req() req: any) {
    requireAdmin(req);
    return this.orgsService.approve(id, req.user.id);
  }

  /**
   * Admin — reject a pending registration.
   */
  @Patch(':id/reject')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Reject organization registration (admin)' })
  reject(
    @Param('id') id: string,
    @Body() body: { reason: string },
    @Req() req: any,
  ) {
    requireAdmin(req);
    return this.orgsService.reject(id, body.reason || 'No reason provided', req.user.id);
  }
}
