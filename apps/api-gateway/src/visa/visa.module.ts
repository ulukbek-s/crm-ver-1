import { Module } from '@nestjs/common';
import { VisaController } from './visa.controller';
import { VisaService } from './visa.service';
import { DocumentsModule } from '../documents/documents.module';

@Module({
  imports: [DocumentsModule],
  controllers: [VisaController],
  providers: [VisaService],
  exports: [VisaService],
})
export class VisaModule {}
