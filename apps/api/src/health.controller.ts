import { Controller, Get, Param, Query, ParseIntPipe, DefaultValuePipe, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';
import { FabricService } from './common/fabric/fabric.service';

@ApiTags('Health')
@Controller({ path: 'health', version: VERSION_NEUTRAL })
export class HealthController {
  constructor(private fabricService: FabricService) {}

  @Get()
  @ApiOperation({ summary: 'Health check endpoint' })
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'sme-cert-api',
      version: '1.0.0',
    };
  }

  @Get('blockchain')
  @ApiOperation({ summary: 'Blockchain network status with block height' })
  async blockchainStatus() {
    const status = await this.fabricService.getStatus();
    return {
      timestamp: new Date().toISOString(),
      blockchain: status,
    };
  }

  @Get('blockchain/blocks')
  @ApiOperation({ summary: 'Get recent blocks from the blockchain' })
  @ApiQuery({ name: 'count', required: false, description: 'Number of recent blocks to return (default: 5, max: 20)' })
  async recentBlocks(@Query('count', new DefaultValuePipe(5), ParseIntPipe) count: number) {
    const safeCount = Math.min(Math.max(count, 1), 20);
    try {
      const blocks = await this.fabricService.getRecentBlocks(safeCount);
      return {
        timestamp: new Date().toISOString(),
        count: blocks.length,
        blocks,
      };
    } catch (error: any) {
      return {
        timestamp: new Date().toISOString(),
        count: 0,
        blocks: [],
        error: error.message || 'Failed to query blocks',
      };
    }
  }

  @Get('blockchain/blocks/:blockNumber')
  @ApiOperation({ summary: 'Get a specific block by number' })
  @ApiParam({ name: 'blockNumber', description: 'The block number to query' })
  async blockByNumber(@Param('blockNumber', ParseIntPipe) blockNumber: number) {
    try {
      const block = await this.fabricService.getBlockInfo(blockNumber);
      return {
        timestamp: new Date().toISOString(),
        block,
      };
    } catch (error: any) {
      return {
        timestamp: new Date().toISOString(),
        block: null,
        error: error.message || `Failed to query block ${blockNumber}`,
      };
    }
  }
}
