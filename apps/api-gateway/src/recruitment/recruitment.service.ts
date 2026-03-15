import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RecruitmentService {
  constructor(private prisma: PrismaService) {}

  private async logCandidateMessage(candidateId: string, content: string) {
    try {
      await this.prisma.message.create({
        data: {
          candidateId,
          channel: 'system',
          direction: 'outbound',
          content,
        },
      });
    } catch (_err) {
      // ignore logging errors
    }
  }

  async getVacancies(countryId?: string, status?: string) {
    const where: Prisma.VacancyWhereInput = {};
    if (countryId) where.countryId = countryId;
    if (status) where.status = status;
    else where.status = { not: 'archived' };
    return this.prisma.vacancy.findMany({
      where,
      include: {
        employer: true,
        country: true,
        _count: { select: { vacancyCandidates: true } },
        vacancyCandidates: {
          include: { candidate: { select: { id: true, firstName: true, lastName: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getVacancyById(id: string) {
    return this.prisma.vacancy.findUnique({
      where: { id },
      include: {
        employer: true,
        country: true,
        vacancyCandidates: { include: { candidate: true, contractDocument: true } },
        interviews: true,
        jobOffers: true,
      },
    });
  }

  async getEmployers(countryId?: string) {
    return this.prisma.employer.findMany({
      where: countryId ? { countryId } : undefined,
      include: { country: true },
      orderBy: { name: 'asc' },
    });
  }

  async createEmployer(dto: { name: string; countryId?: string; contact?: string; email?: string }) {
    return this.prisma.employer.create({
      data: {
        name: dto.name,
        countryId: dto.countryId || undefined,
        contact: dto.contact || undefined,
        email: dto.email || undefined,
      },
      include: { country: true },
    });
  }

  async updateEmployer(id: string, dto: { name?: string; countryId?: string; contact?: string; email?: string }) {
    return this.prisma.employer.update({
      where: { id },
      data: {
        ...(dto.name != null && { name: dto.name }),
        ...(dto.countryId !== undefined && { countryId: dto.countryId || null }),
        ...(dto.contact !== undefined && { contact: dto.contact || null }),
        ...(dto.email !== undefined && { email: dto.email || null }),
      },
      include: { country: true },
    });
  }

  async deleteEmployer(id: string) {
    return this.prisma.employer.delete({ where: { id } });
  }

  async getCountries() {
    return this.prisma.country.findMany({ orderBy: { name: 'asc' } });
  }

  async createVacancy(dto: {
    title: string;
    employerId: string;
    countryId?: string;
    salary?: string;
    salaryMin?: number;
    salaryMax?: number;
    salaryCurrency?: string;
    requirements?: string;
    openPositions?: number;
    status?: string;
    deadline?: string;
  }) {
    let deadlineDate: Date | undefined;
    if (dto.deadline && String(dto.deadline).trim()) {
      const raw = String(dto.deadline).trim();
      const parsed = raw.includes('.') ? this.parseDDMMYYYY(raw) : new Date(raw);
      if (parsed && !isNaN(parsed.getTime())) deadlineDate = parsed;
    }
    try {
      return await this.prisma.vacancy.create({
        data: {
          title: dto.title.trim(),
          employerId: dto.employerId.trim(),
          countryId: (dto.countryId && dto.countryId.trim()) || undefined,
          salary: (dto.salary && dto.salary.trim()) || undefined,
          salaryMin: dto.salaryMin != null ? Number(dto.salaryMin) : undefined,
          salaryMax: dto.salaryMax != null ? Number(dto.salaryMax) : undefined,
          salaryCurrency: dto.salaryCurrency ?? 'EUR',
          requirements: (dto.requirements && dto.requirements.trim()) || undefined,
          openPositions: Math.max(1, Number(dto.openPositions) || 1),
          status: dto.status ?? 'open',
          deadline: deadlineDate,
        },
        include: { employer: true, country: true },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('Foreign key') || msg.includes('foreign key')) {
        throw new BadRequestException('Проверьте работодателя и страну — указанные записи не найдены.');
      }
      throw new BadRequestException('Не удалось создать вакансию. ' + (msg || ''));
    }
  }

  private parseDDMMYYYY(s: string): Date | null {
    const parts = s.split('.');
    if (parts.length !== 3) return null;
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
    const d = new Date(year, month, day);
    if (d.getFullYear() !== year || d.getMonth() !== month || d.getDate() !== day) return null;
    return d;
  }

  async updateVacancy(
    id: string,
    dto: {
      title?: string;
      employerId?: string;
      countryId?: string;
      salary?: string;
      salaryMin?: number;
      salaryMax?: number;
      salaryCurrency?: string;
      requirements?: string;
      openPositions?: number;
      status?: string;
      deadline?: string | null;
    },
  ) {
    return this.prisma.vacancy.update({
      where: { id },
      data: {
        ...(dto.title != null && { title: dto.title }),
        ...(dto.employerId != null && { employerId: dto.employerId }),
        ...(dto.countryId !== undefined && { countryId: dto.countryId }),
        ...(dto.salary !== undefined && { salary: dto.salary }),
        ...(dto.salaryMin !== undefined && { salaryMin: dto.salaryMin }),
        ...(dto.salaryMax !== undefined && { salaryMax: dto.salaryMax }),
        ...(dto.salaryCurrency !== undefined && { salaryCurrency: dto.salaryCurrency }),
        ...(dto.requirements !== undefined && { requirements: dto.requirements }),
        ...(dto.openPositions !== undefined && { openPositions: dto.openPositions }),
        ...(dto.status != null && { status: dto.status }),
        ...(dto.deadline !== undefined && { deadline: dto.deadline ? new Date(dto.deadline) : null }),
      },
      include: { employer: true, country: true, _count: { select: { vacancyCandidates: true } } },
    });
  }

  /** Submit candidates to vacancy (from CRM). Creates VacancyCandidate and moves candidate to waiting_employer. */
  async submitCandidatesToVacancy(vacancyId: string, candidateIds: string[]) {
    const vacancy = await this.prisma.vacancy.findUnique({ where: { id: vacancyId } });
    if (!vacancy) throw new NotFoundException('Vacancy not found');
    const existing = await this.prisma.vacancyCandidate.findMany({
      where: { vacancyId, candidateId: { in: candidateIds } },
      select: { candidateId: true },
    });
    const existingIds = new Set(existing.map((e) => e.candidateId));
    const toAdd = candidateIds.filter((id) => !existingIds.has(id));
    if (toAdd.length === 0) {
      return { vacancyId, created: 0, candidates: await this.getVacancyById(vacancyId) };
    }
    await this.prisma.$transaction([
      ...toAdd.map((candidateId) =>
        this.prisma.vacancyCandidate.create({
          data: { vacancyId, candidateId, stage: 'submitted' },
        }),
      ),
      this.prisma.candidate.updateMany({
        where: { id: { in: toAdd } },
        data: { pipelineStage: 'waiting_employer' },
      }),
    ]);

    await Promise.all(
      toAdd.map((candidateId) =>
        this.logCandidateMessage(candidateId, 'Профиль отправлен партнёру'),
      ),
    );
    return { vacancyId, created: toAdd.length, candidates: await this.getVacancyById(vacancyId) };
  }

  /** Update vacancy-candidate (employer status + contract sent/uploaded). */
  async updateVacancyCandidate(
    id: string,
    dto: { stage?: string; contractDocumentId?: string | null; contractSentAt?: string | null },
  ) {
    const data: Record<string, unknown> = {};
    if (dto.stage != null) data.stage = dto.stage;
    if (dto.contractDocumentId !== undefined) data.contractDocumentId = dto.contractDocumentId || null;
    if (dto.contractSentAt !== undefined) {
      data.contractSentAt = dto.contractSentAt ? new Date(dto.contractSentAt) : null;
    }
    const updated = await this.prisma.vacancyCandidate.update({
      where: { id },
      data,
      include: { candidate: true, vacancy: true, contractDocument: true },
    });

    if (dto.stage && dto.stage !== 'submitted' && updated.candidateId) {
      await this.logCandidateMessage(updated.candidateId, 'Получено решение');
    }

    if (dto.contractDocumentId) {
      if (updated.candidateId) {
        await this.logCandidateMessage(updated.candidateId, 'Контракт готов');
      }
    }

    return updated;
  }
}
