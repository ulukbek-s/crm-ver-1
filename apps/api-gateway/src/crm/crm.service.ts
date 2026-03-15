import { randomUUID } from 'crypto';
import { BadRequestException, Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { getScopeForUser, UserScope } from '../common/scope';
import { JwtUser } from '../common/decorators/current-user.decorator';

function buildWhereLeads(scope: UserScope, userId: string | undefined, branchId?: string, statusId?: string) {
  const base: Record<string, unknown> = {};
  if (statusId) base.statusId = statusId;
  if (branchId) base.branchId = branchId;
  else if (scope.branchIds !== null && scope.branchIds.length) base.branchId = { in: scope.branchIds };
  else if (scope.countryIds !== null && scope.countryIds.length) {
    base.branch = { countryId: { in: scope.countryIds } };
  }
  if (scope.onlyAssignedToMe && userId) base.assignedManagerId = userId;
  return base;
}

function buildWhereCandidates(
  scope: UserScope,
  userId: string | undefined,
  branchId?: string,
  pipelineStage?: string,
  countryId?: string,
) {
  const base: Record<string, unknown> = {};
  if (pipelineStage) base.pipelineStage = pipelineStage;
  if (countryId) base.countryId = countryId;
  if (branchId) base.branchId = branchId;
  else if (scope.branchIds !== null && scope.branchIds.length) base.branchId = { in: scope.branchIds };
  else if (scope.countryIds !== null && scope.countryIds.length && !countryId) {
    base.countryId = { in: scope.countryIds };
  }
  if (scope.onlyAssignedToMe && userId) base.managerId = userId;
  return base;
}

@Injectable()
export class CrmService {
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
      // Ошибки логирования сообщений не должны ломать основной бизнес-процесс
    }
  }

  async getLeads(user: JwtUser | undefined, branchId?: string, statusId?: string) {
    const scope = getScopeForUser(user);
    const where = scope.isFounder
      ? { ...(branchId && { branchId }), ...(statusId && { statusId }) }
      : buildWhereLeads(scope, user?.id, branchId, statusId);
    return this.prisma.lead.findMany({
      where,
      include: { source: true, status: true, assignedManager: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getCandidates(user: JwtUser | undefined, branchId?: string, pipelineStage?: string, countryId?: string) {
    const scope = getScopeForUser(user);
    const baseWhere = scope.isFounder
      ? { ...(branchId && { branchId }), ...(pipelineStage && { pipelineStage }), ...(countryId && { countryId }) }
      : buildWhereCandidates(scope, user?.id, branchId, pipelineStage, countryId);
    return this.prisma.candidate.findMany({
      where: { ...baseWhere, archivedAt: null },
      include: {
        country: true,
        manager: { select: { id: true, firstName: true, lastName: true } },
        documents: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getArchivedCandidates(user: JwtUser | undefined, branchId?: string, countryId?: string) {
    const scope = getScopeForUser(user);
    const baseWhere = scope.isFounder
      ? { ...(branchId && { branchId }), ...(countryId && { countryId }) }
      : buildWhereCandidates(scope, user?.id, branchId, undefined, countryId);
    return this.prisma.candidate.findMany({
      where: { ...baseWhere, archivedAt: { not: null } },
      include: {
        country: true,
        manager: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { archivedAt: 'desc' },
    });
  }

  async getCandidateById(id: string, user: JwtUser | undefined) {
    const scope = getScopeForUser(user);
    const where: any = { id };
    if (!scope.isFounder) {
      if (scope.branchIds?.length) where.branchId = { in: scope.branchIds };
      else if (scope.countryIds?.length) where.countryId = { in: scope.countryIds };
      else if (scope.onlyAssignedToMe && user?.id) where.managerId = user.id;
    }
    return this.prisma.candidate.findFirst({
      where,
      include: {
        country: true,
        manager: { select: { id: true, firstName: true, lastName: true } },
        profile: true,
        documents: { include: { document: true } },
        statusHistory: { orderBy: { changedAt: 'desc' } },
      },
    });
  }

  // existing createCandidate(dto) below is used by controller

  async updateCandidateStage(candidateId: string, pipelineStage: string) {
    const candidate = await this.prisma.candidate.findUnique({
      where: { id: candidateId },
      include: { documents: true },
    });
    if (!candidate) {
      throw new NotFoundException('Candidate not found');
    }

    const updated = await this.prisma.candidate.update({
      where: { id: candidateId },
      data: {
        pipelineStage,
        statusHistory: {
          create: { toStage: pipelineStage },
        },
      },
      include: {
        country: true,
        manager: { select: { id: true, firstName: true, lastName: true } },
        documents: true,
      },
    });

    if (pipelineStage === 'visa_prep') {
      try {
        await this.logCandidateMessage(candidateId, 'Инструкции по визе');
      } catch (_err) {
        // игнорируем ошибку логирования
      }
      let existing = await this.prisma.visaProcess.findFirst({
        where: { candidateId },
      });
      if (!existing) {
        try {
          await this.prisma.visaProcess.create({
            data: {
              candidateId,
              countryId: candidate.countryId ?? undefined,
              status: 'document_prep',
            },
          });
        } catch (_createErr) {
          try {
            const uid = randomUUID();
            const cid = candidate.countryId ?? null;
            await this.prisma.$executeRawUnsafe(
              `INSERT INTO "VisaProcess" (id, "candidateId", "countryId", status, "createdAt", "updatedAt") VALUES ($1, $2, $3, 'document_prep', now(), now())`,
              uid,
              candidateId,
              cid,
            );
          } catch (rawErr) {
            console.warn('Visa process create (raw) failed:', rawErr);
          }
        }
      }
    }

    return updated;
  }

  async updateCandidateAnketa(
    candidateId: string,
    anketaStatus?: string,
    anketaData?: Record<string, unknown>,
    archiveReason?: string,
  ) {
    const data: Prisma.CandidateUpdateInput = {
      ...(anketaStatus != null && { anketaStatus }),
      ...(anketaData != null && { anketaData: anketaData as Prisma.InputJsonValue }),
    };
    if (anketaStatus === 'rejected') {
      data.archivedAt = new Date();
      data.archiveReason = archiveReason ?? 'Анкета отклонена';
    }

    const updated = await this.prisma.candidate.update({
      where: { id: candidateId },
      data,
      include: { country: true, manager: { select: { id: true, firstName: true, lastName: true } } },
    });

    if (anketaStatus === 'accepted') {
      await this.logCandidateMessage(candidateId, 'Анкета получена');
    }

    return updated;
  }

  async archiveCandidate(candidateId: string, reason: string) {
    return this.prisma.candidate.update({
      where: { id: candidateId },
      data: { archivedAt: new Date(), archiveReason: reason },
      include: { country: true, manager: { select: { id: true, firstName: true, lastName: true } } },
    });
  }

  async unarchiveCandidate(candidateId: string) {
    return this.prisma.candidate.update({
      where: { id: candidateId },
      data: { archivedAt: null, archiveReason: null },
      include: { country: true, manager: { select: { id: true, firstName: true, lastName: true } } },
    });
  }

  async deleteCandidate(candidateId: string) {
    try {
      return await this.prisma.candidate.delete({
        where: { id: candidateId },
      });
    } catch (_err) {
      throw new InternalServerErrorException('Не удалось удалить кандидата');
    }
  }

  async getPipelineStats() {
    const [leads, candidates, visa] = await Promise.all([
      this.prisma.lead.groupBy({ by: ['statusId'], _count: true }),
      this.prisma.candidate.groupBy({
        by: ['pipelineStage'],
        _count: true,
        where: { archivedAt: null },
      }),
      this.prisma.visaProcess.groupBy({ by: ['status'], _count: true }),
    ]);
    return { leads, candidates, visa };
  }

  /** Кандидаты в работе: по менеджерам, по этапам, кандидаты с нехваткой документов. */
  async getCandidatesInWork(user: JwtUser | undefined) {
    const scope = getScopeForUser(user);
    const baseWhere: Prisma.CandidateWhereInput = { archivedAt: null };
    if (!scope.isFounder) {
      if (scope.branchIds?.length) baseWhere.branchId = { in: scope.branchIds };
      else if (scope.countryIds?.length) baseWhere.countryId = { in: scope.countryIds };
      if (scope.onlyAssignedToMe && user?.id) baseWhere.managerId = user.id;
    }
    const candidates = await this.prisma.candidate.findMany({
      where: baseWhere,
      include: {
        manager: { select: { id: true, firstName: true, lastName: true } },
        documents: { select: { type: true } },
      },
    });
    const byManager = new Map<
      string,
      { managerId: string; managerName: string; byStage: Record<string, number>; missingDocs: typeof candidates }
    >();
    for (const c of candidates) {
      const mid = c.managerId ?? '_none';
      const name =
        c.manager ? `${c.manager.firstName} ${c.manager.lastName}` : 'Без менеджера';
      if (!byManager.has(mid)) {
        byManager.set(mid, { managerId: mid, managerName: name, byStage: {}, missingDocs: [] });
      }
      const row = byManager.get(mid)!;
      row.byStage[c.pipelineStage] = (row.byStage[c.pipelineStage] ?? 0) + 1;
      const hasContract = c.documents.some((d) => d.type === 'contract' || d.type === 'employer_contract');
      if (!hasContract && !['leads', 'rejected'].includes(c.pipelineStage)) {
        row.missingDocs.push(c);
      }
    }
    return {
      managers: Array.from(byManager.values()).map((m) => ({
        managerId: m.managerId,
        managerName: m.managerName,
        total: Object.values(m.byStage).reduce((a, b) => a + b, 0),
        byStage: m.byStage,
        missingDocsCount: m.missingDocs.length,
        missingDocsCandidates: m.missingDocs.map((c) => ({
          id: c.id,
          firstName: c.firstName,
          lastName: c.lastName,
          pipelineStage: c.pipelineStage,
        })),
      })),
    };
  }

  async getLeadSources() {
    return this.prisma.leadSource.findMany({ orderBy: { name: 'asc' } });
  }

  async getLeadStatuses() {
    return this.prisma.leadStatus.findMany({ orderBy: { order: 'asc' } });
  }

  async getCountries() {
    return this.prisma.country.findMany({ orderBy: { name: 'asc' } });
  }

  async getBranches(countryId?: string) {
    return this.prisma.branch.findMany({
      where: countryId ? { countryId } : undefined,
      include: { country: true },
      orderBy: { name: 'asc' },
    });
  }

  async createLead(dto: {
    firstName: string;
    lastName: string;
    phone: string;
    email?: string;
    sourceId: string;
    statusId: string;
    branchId?: string;
    assignedManagerId?: string;
    notes?: string;
  }) {
    return this.prisma.lead.create({
      data: dto,
      include: { source: true, status: true, assignedManager: { select: { id: true, firstName: true, lastName: true } } },
    });
  }

  async createCandidate(dto: {
    candidateCode: string;
    firstName: string;
    lastName: string;
    phone: string;
    whatsappPhone?: string;
    telegramUsername?: string;
    email?: string;
    countryId?: string;
    languageLevel?: string;
    programType?: string;
    managerId?: string;
    branchId?: string;
    leadId?: string;
    leadSourceId?: string;
    paymentStatus?: string;
    pipelineStage?: string;
  }) {
    const opt = (v: string | undefined) => (v != null && String(v).trim() !== '' ? String(v).trim() : undefined);
    const data = {
      candidateCode: dto.candidateCode.trim(),
      firstName: dto.firstName.trim(),
      lastName: dto.lastName.trim(),
      phone: dto.phone.trim(),
      pipelineStage: dto.pipelineStage ?? 'leads',
      whatsappPhone: opt(dto.whatsappPhone),
      email: opt(dto.email),
      countryId: opt(dto.countryId),
      languageLevel: opt(dto.languageLevel),
      programType: opt(dto.programType),
      managerId: opt(dto.managerId),
      branchId: opt(dto.branchId),
      telegramUsername: opt(dto.telegramUsername),
      leadId: opt(dto.leadId),
      leadSourceId: opt(dto.leadSourceId),
      paymentStatus: opt(dto.paymentStatus) ?? 'none',
    };

    try {
      const created = await this.prisma.candidate.create({
        data,
        include: { country: true, manager: { select: { id: true, firstName: true, lastName: true } } },
      });

      if (created.programType) {
        const program = await this.prisma.program.findFirst({
          where: { name: created.programType, requiresLanguage: true },
        });
        if (program) {
          await this.prisma.student.upsert({
            where: { candidateId: created.id },
            update: {},
            create: {
              candidateId: created.id,
              status: 'enrolled',
            },
          });
        }
      }

      return created;
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'P2002'
        ? 'Код кандидата уже используется. Задайте другой код.'
        : err instanceof Error ? err.message : 'Не удалось создать кандидата';
      throw new BadRequestException(msg);
    }
  }
}
