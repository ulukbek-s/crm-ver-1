import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { VisaService } from './visa.service';
import { DocumentsService } from '../documents/documents.service';
import { UpdateVisaProcessDto } from './dto/update-visa-process.dto';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';

@Controller('visa')
@UseGuards(AuthGuard('jwt'))
export class VisaController {
  constructor(
    private visaService: VisaService,
    private documentsService: DocumentsService,
  ) {}

  @Get('processes')
  getProcesses(@Query('status') status?: string) {
    return this.visaService.getProcesses(status);
  }

  @Get('processes/:id')
  getProcess(@Param('id') id: string) {
    return this.visaService.getProcessById(id);
  }

  @Get('checklist-template')
  getChecklistTemplate(@Query('country') country?: string) {
    return this.visaService.getChecklistTemplate(country || 'DE');
  }

  @Patch('checklist-template')
  setChecklistTemplate(
    @Body() body: { countryCode?: string; items: { code: string; name: string }[] },
  ) {
    return this.visaService.setChecklistTemplate(body.countryCode || 'DE', body.items);
  }

  @Get('processes/:id/checklist')
  getChecklist(@Param('id') id: string) {
    return this.visaService.getChecklist(id);
  }

  @Patch('processes/:id')
  updateProcess(@Param('id') id: string, @Body() dto: UpdateVisaProcessDto) {
    return this.visaService.updateProcess(id, dto);
  }

  @Post('processes/:id/documents')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 20 * 1024 * 1024 },
    }),
  )
  async uploadProcessDocument(
    @Param('id') id: string,
    @Body('type') type: string,
    @UploadedFile() file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
    @CurrentUser() user: JwtUser,
  ) {
    if (!file) throw new BadRequestException('No file provided');
    const allowed = await this.visaService.getAllowedDocTypesForProcess(id);
    if (!type || !allowed.includes(type)) {
      throw new BadRequestException(
        `Invalid document type. Allowed: ${allowed.join(', ')}`,
      );
    }
    return this.documentsService.uploadForVisaProcess(id, type, file, user?.id);
  }

  @Get('embassies')
  getEmbassies() {
    return this.visaService.getEmbassies();
  }

  @Get('reminders')
  getReminders() {
    return this.visaService.getReminders();
  }
}
