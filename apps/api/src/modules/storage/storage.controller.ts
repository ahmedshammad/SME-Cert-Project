import { Controller, Post, Get, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { StorageService } from './storage.service';

@ApiTags('Storage')
@ApiBearerAuth('JWT-auth')
@Controller({ path: 'storage', version: '1' })
export class StorageController {
  constructor(private storageService: StorageService) {}

  @Post('ipfs')
  @ApiOperation({ summary: 'Store data on IPFS' })
  async store(@Body() body: { data: string }) {
    const cid = await this.storageService.storeToIpfs(body.data);
    return { cid };
  }

  @Get('ipfs/:cid')
  @ApiOperation({ summary: 'Retrieve data from IPFS' })
  async retrieve(@Param('cid') cid: string) {
    const data = await this.storageService.retrieveFromIpfs(cid);
    return { data: data.toString('utf8') };
  }
}
