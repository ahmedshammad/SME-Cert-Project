import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MetricsService } from './metrics.service';

@ApiTags('Metrics')
@Controller({ path: 'metrics', version: '1' })
export class MetricsController {
  constructor(private metricsService: MetricsService) {}

  @Get('dashboard')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get dashboard metrics' })
  getDashboard() {
    return this.metricsService.getDashboard();
  }

  @Get('issuance')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get issuance metrics' })
  getIssuance() {
    return this.metricsService.getIssuanceMetrics();
  }

  @Get('verification')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get verification metrics' })
  getVerification() {
    return this.metricsService.getVerificationMetrics();
  }
}
