import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateVisaProcessDto, VISA_STATUSES } from './dto/update-visa-process.dto';
import { GERMANY_VISA_CHECKLIST } from './constants';

@Injectable()
export class VisaService {
  constructor(private prisma: PrismaService) {}

  async getProcesses(status?: string) {
    return this.prisma.visaProcess.findMany({
      where: status ? { status } : undefined,
      include: {
        candidate: true,
        country: true,
        visaType: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getProcessById(id: string) {
    const process = await this.prisma.visaProcess.findUnique({
      where: { id },
      include: {
        candidate: true,
        country: true,
        documents: { include: { document: true } },
        appointments: true,
        submissions: true,
        decisions: true,
      },
    });
    if (!process) throw new NotFoundException('Visa process not found');
    return process;
  }

  /** Required doc types for checklist (default Germany list; DB template when table exists) */
  private getChecklistTemplateCodes(_countryCode: string | null): { code: string; name: string }[] {
    return GERMANY_VISA_CHECKLIST;
  }

  async getChecklistTemplate(_countryCode: string) {
    return GERMANY_VISA_CHECKLIST;
  }

  async setChecklistTemplate(_countryCode: string, _items: { code: string; name: string }[]) {
    // Persist when VisaChecklistTemplate table exists and Prisma client is regenerated
    return GERMANY_VISA_CHECKLIST;
  }

  /** Checklist for visa process: required doc types + status (uploaded/pending) */
  async getChecklist(processId: string) {
    const process = await this.prisma.visaProcess.findUnique({
      where: { id: processId },
      include: { documents: { include: { document: true } }, country: true },
    });
    if (!process) throw new NotFoundException('Visa process not found');

    const template = this.getChecklistTemplateCodes(process.country?.code ?? null);
    return template.map(({ code, name }) => {
      const doc = process.documents.find((d) => d.type === code);
      return {
        type: code,
        name,
        status: doc ? 'uploaded' : 'missing',
        documentId: doc?.documentId ?? null,
      };
    });
  }

  /** Allowed document type codes for upload (for a process) */
  async getAllowedDocTypesForProcess(processId: string): Promise<string[]> {
    const process = await this.prisma.visaProcess.findUnique({
      where: { id: processId },
      include: { country: true },
    });
    if (!process) throw new NotFoundException('Visa process not found');
    const template = this.getChecklistTemplateCodes(process.country?.code ?? null);
    return template.map((t) => t.code);
  }

  async updateProcess(id: string, dto: UpdateVisaProcessDto) {
    const process = await this.prisma.visaProcess.findUnique({
      where: { id },
      include: { submissions: true, decisions: true, candidate: true },
    });
    if (!process) throw new NotFoundException('Visa process not found');

    if (dto.status && !VISA_STATUSES.includes(dto.status as any)) {
      throw new BadRequestException('Invalid status');
    }

    const data: Record<string, unknown> = {};
    if (dto.status != null) data.status = dto.status;
    if (dto.appointmentDate != null) data.appointmentDate = dto.appointmentDate ? new Date(dto.appointmentDate) : null;

    await this.prisma.$transaction(async (tx) => {
      // If program requires language, block moving to later visa stages until course completed
      if (dto.status && ['embassy_appointment', 'submission', 'waiting_decision', 'approved'].includes(dto.status)) {
        const candidate = process.candidate;
        if (candidate?.programType) {
          const program = await tx.program.findFirst({
            where: { name: candidate.programType, requiresLanguage: true },
          });
          if (program) {
            const student = await tx.student.findUnique({
              where: { candidateId: candidate.id },
            });
            if (!student || student.status !== 'completed') {
              throw new BadRequestException(
                'Для этой программы требуется языковой курс. Статус студента должен быть completed, чтобы продолжить визовый процесс.',
              );
            }
          }
        }
      }

      if (Object.keys(data).length > 0) {
        await tx.visaProcess.update({ where: { id }, data: data as any });
      }

      if (dto.submittedAt != null) {
        const existing = process.submissions[0];
        if (existing) {
          await tx.visaSubmission.update({
            where: { id: existing.id },
            data: { submittedAt: dto.submittedAt ? new Date(dto.submittedAt) : null },
          });
        } else {
          await tx.visaSubmission.create({
            data: {
              visaProcessId: id,
              submittedAt: dto.submittedAt ? new Date(dto.submittedAt) : null,
            },
          });
        }
      }

      if (dto.decisionApproved != null || dto.decisionDate != null || dto.decisionNotes != null) {
        const existing = process.decisions[0];
        const decisionData = {
          approved: dto.decisionApproved ?? existing?.approved,
          decisionDate: dto.decisionDate ? new Date(dto.decisionDate) : (existing?.decisionDate ?? null),
          notes: dto.decisionNotes ?? existing?.notes ?? null,
        };
        if (existing) {
          await tx.visaDecision.update({ where: { id: existing.id }, data: decisionData as any });
        } else {
          await tx.visaDecision.create({
            data: { visaProcessId: id, ...decisionData } as any,
          });
        }
      }
    });

    return this.getProcessById(id);
  }

  async getEmbassies() {
    return this.prisma.embassy.findMany({
      orderBy: [{ country: 'asc' }, { city: 'asc' }, { name: 'asc' }],
    });
  }

  /** Appointments in next 7 days; visas expiring in next 90 days */
  async getReminders() {
    const now = new Date();
    const in7Days = new Date(now);
    in7Days.setDate(in7Days.getDate() + 7);
    const [appointmentProcesses, expiryProcesses] = await Promise.all([
      this.prisma.visaProcess.findMany({
        where: {
          appointmentDate: { gte: now, lte: in7Days },
        },
        include: { candidate: true, country: true },
        orderBy: { appointmentDate: 'asc' },
      }),
      [], // expiry reminders: no visaExpirationDate in DB yet
    ]);

    return {
      appointmentReminders: appointmentProcesses,
      expiryReminders: expiryProcesses as any[],
    };
  }
}
