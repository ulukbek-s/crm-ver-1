import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';

const FALLBACK_TYPES = [
  'passport',
  'contract',
  'cv',
  'profile',
  'visa',
  'employer_contract',
  'finance', // payment receipts
];

@Injectable()
export class DocumentsService {
  private uploadDir: string;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    this.uploadDir = this.config.get('UPLOAD_DIR') || path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async getAllowedTypesForCountry(countryId: string | null): Promise<string[]> {
    if (!countryId) return FALLBACK_TYPES;
    const rows = await this.prisma.countryDocumentType.findMany({
      where: { countryId },
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
      select: { code: true },
    });
    if (rows.length === 0) return FALLBACK_TYPES;
    return rows.map((r) => r.code);
  }

  async uploadForCandidate(
    candidateId: string,
    type: string,
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
    userId?: string,
  ) {
    const candidate = await this.prisma.candidate.findUnique({
      where: { id: candidateId },
      select: { countryId: true },
    });
    // finance / receipt (платёжные чеки) всегда разрешены, не зависят от страны/типа документов
    if (type !== 'finance' && type !== 'receipt') {
      const allowed = await this.getAllowedTypesForCountry(candidate?.countryId ?? null);
      if (!allowed.includes(type)) {
        throw new Error('Invalid document type');
      }
    }
    const ext = path.extname(file.originalname) || '.bin';
    const storageKey = `candidates/${candidateId}/${type}-${randomUUID()}${ext}`;
    const fullPath = path.join(this.uploadDir, storageKey);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(fullPath, file.buffer);

    const document = await this.prisma.document.create({
      data: {
        type,
        fileName: file.originalname,
        mimeType: file.mimetype,
        storageKey,
        size: file.size,
        status: 'uploaded',
        uploadedById: userId,
      },
    });

    await this.prisma.candidateDocument.create({
      data: {
        candidateId,
        documentId: document.id,
        type,
      },
    });

    return document;
  }

  async uploadForVisaProcess(
    processId: string,
    type: string,
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
    userId?: string,
  ) {
    const process = await this.prisma.visaProcess.findUnique({
      where: { id: processId },
      select: { id: true },
    });
    if (!process) throw new NotFoundException('Visa process not found');
    const ext = path.extname(file.originalname) || '.bin';
    const storageKey = `visa/${processId}/${type}-${randomUUID()}${ext}`;
    const fullPath = path.join(this.uploadDir, storageKey);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(fullPath, file.buffer);

    const document = await this.prisma.document.create({
      data: {
        type,
        fileName: file.originalname,
        mimeType: file.mimetype,
        storageKey,
        size: file.size,
        status: 'uploaded',
        uploadedById: userId,
      },
    });

    await this.prisma.visaDocument.create({
      data: {
        visaProcessId: processId,
        documentId: document.id,
        type,
      },
    });

    return document;
  }

  async getCandidateDocuments(candidateId: string) {
    const list = await this.prisma.candidateDocument.findMany({
      where: { candidateId },
      include: {
        document: true,
      },
    });
    const docIds = list.map((cd) => cd.documentId);
    const receiptPayments = docIds.length
      ? await this.prisma.payment.findMany({
          where: {
            candidateId,
            receiptDocumentId: { in: docIds },
          },
          select: { id: true, amount: true, currency: true, receiptDocumentId: true },
        })
      : [];
    const paymentByDocId = new Map(
      receiptPayments.map((p) => [p.receiptDocumentId, p]),
    );
    return list.map((cd) => {
      const payment = paymentByDocId.get(cd.documentId);
      const source =
        payment && (cd.type === 'receipt' || cd.type === 'finance')
          ? {
              type: 'payment' as const,
              paymentId: payment.id,
              label: `Чек по платежу ${Number(payment.amount).toLocaleString()} ${payment.currency ?? 'EUR'}`,
            }
          : undefined;
      return { ...cd, source };
    });
  }

  async getDocumentById(id: string) {
    return this.prisma.document.findUnique({
      where: { id },
    });
  }

  getFilePath(storageKey: string): string {
    return path.join(this.uploadDir, storageKey);
  }

  async deleteDocument(id: string) {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) return;
    const filePath = this.getFilePath(doc.storageKey);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    await this.prisma.document.delete({ where: { id } });
  }
}
