import { Controller, Post, Body, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ContactService, ContactDto } from './contact.service';

@ApiTags('Contact')
@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit a contact form message' })
  submit(@Body() body: ContactDto, @Req() req: any) {
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip;
    return this.contactService.submit(body, ip);
  }
}
