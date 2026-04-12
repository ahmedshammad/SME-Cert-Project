import { Module } from '@nestjs/common';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { FabricModule } from '../../common/fabric/fabric.module';

@Module({
  imports: [PrismaModule, FabricModule],
  controllers: [OrganizationsController],
  providers: [OrganizationsService],
  exports: [OrganizationsService],
})
export class OrganizationsModule {}
