import { Controller, Get, Post, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WalletService } from './wallet.service';

@ApiTags('Wallet')
@ApiBearerAuth('JWT-auth')
@Controller({ path: 'wallet', version: '1' })
export class WalletController {
  constructor(private walletService: WalletService) {}

  @Get()
  @ApiOperation({ summary: 'Get wallet information' })
  getWalletInfo(@Req() req: any) {
    return this.walletService.getWalletInfo(req.user?.id);
  }

  @Post('rotate-keys')
  @ApiOperation({ summary: 'Rotate encryption keys' })
  rotateKeys(@Req() req: any) {
    return this.walletService.rotateKeys(req.user?.id);
  }
}
