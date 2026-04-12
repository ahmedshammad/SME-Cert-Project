import { Global, Module } from '@nestjs/common';
import { FabricService } from './fabric.service';

@Global()
@Module({
  providers: [FabricService],
  exports: [FabricService],
})
export class FabricModule {}
