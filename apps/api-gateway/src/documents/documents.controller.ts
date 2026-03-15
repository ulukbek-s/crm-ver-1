import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { DocumentsService } from './documents.service';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';
import * as fs from 'fs';

@Controller('documents')
@UseGuards(AuthGuard('jwt'))
export class DocumentsController {
  constructor(private documentsService: DocumentsService) {}

  @Post('upload/candidate/:candidateId')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 20 * 1024 * 1024 },
    }),
  )
  async uploadCandidateDocument(
    @Param('candidateId') candidateId: string,
    @Body('type') type: string,
    @UploadedFile() file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
    @CurrentUser() user: JwtUser,
  ) {
    if (!file) throw new Error('No file provided');
    return this.documentsService.uploadForCandidate(
      candidateId,
      type || 'document',
      file,
      user?.id,
    );
  }

  @Get('candidates/:candidateId')
  async getCandidateDocuments(@Param('candidateId') candidateId: string) {
    return this.documentsService.getCandidateDocuments(candidateId);
  }

  @Delete(':id')
  async deleteDocument(@Param('id') id: string) {
    await this.documentsService.deleteDocument(id);
    return { deleted: true };
  }

  @Get(':id/download')
  async downloadDocument(@Param('id') id: string, @Res() res: Response) {
    const doc = await this.documentsService.getDocumentById(id);
    if (!doc) return res.status(404).end();
    const filePath = this.documentsService.getFilePath(doc.storageKey);
    if (!fs.existsSync(filePath)) return res.status(404).end();
    res.setHeader('Content-Disposition', `attachment; filename="${doc.fileName}"`);
    if (doc.mimeType) res.setHeader('Content-Type', doc.mimeType);
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  }
}
