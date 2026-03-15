import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  private async ensureNotUsedByCandidates(
    field: 'countryId' | 'branchId' | 'leadSourceId',
    id: string,
    message: string,
  ) {
    const count = await this.prisma.candidate.count({
      where: {
        [field]: id,
        archivedAt: null,
      },
    });
    if (count > 0) throw new ConflictException(message);
  }

  private async ensureProgramNotUsed(programId: string) {
    const program = await this.prisma.program.findUnique({ where: { id: programId } });
    if (!program) return;
    const count = await this.prisma.candidate.count({
      where: {
        programType: program.name,
        archivedAt: null,
      },
    });
    if (count > 0) throw new ConflictException(`Программа «${program.name}» используется у ${count} кандидатов. Сначала измените их программу.`);
  }

  // CountryDocumentType
  async getDocumentTypes(countryId?: string) {
    return this.prisma.countryDocumentType.findMany({
      where: countryId ? { countryId } : undefined,
      include: { country: { select: { id: true, name: true, code: true } } },
      orderBy: [{ countryId: 'asc' }, { order: 'asc' }, { name: 'asc' }],
    });
  }

  async createDocumentType(data: { countryId: string; code: string; name: string; order?: number }) {
    return this.prisma.countryDocumentType.create({
      data: { ...data, order: data.order ?? 0 },
      include: { country: true },
    });
  }

  async updateDocumentType(id: string, data: { code?: string; name?: string; order?: number }) {
    return this.prisma.countryDocumentType.update({
      where: { id },
      data,
      include: { country: true },
    });
  }

  async deleteDocumentType(id: string) {
    return this.prisma.countryDocumentType.delete({ where: { id } });
  }

  // LeadSource
  async getLeadSources() {
    return this.prisma.leadSource.findMany({ orderBy: { name: 'asc' } });
  }

  async createLeadSource(data: { name: string; code: string }) {
    return this.prisma.leadSource.create({ data });
  }

  async updateLeadSource(id: string, data: { name?: string; code?: string }) {
    return this.prisma.leadSource.update({ where: { id }, data });
  }

  async deleteLeadSource(id: string) {
    await this.ensureNotUsedByCandidates('leadSourceId', id, 'Источник лида используется у кандидатов. Удаление невозможно.');
    return this.prisma.leadSource.delete({ where: { id } });
  }

  // Country (need organizationId from first org or param)
  async getCountries() {
    return this.prisma.country.findMany({ orderBy: { name: 'asc' }, include: { _count: { select: { branches: true } } } });
  }

  async createCountry(data: { name: string; code: string; organizationId: string }) {
    return this.prisma.country.create({ data });
  }

  async updateCountry(id: string, data: { name?: string; code?: string }) {
    return this.prisma.country.update({ where: { id }, data });
  }

  async deleteCountry(id: string) {
    await this.ensureNotUsedByCandidates('countryId', id, 'Страна используется у кандидатов. Удаление невозможно.');
    return this.prisma.country.delete({ where: { id } });
  }

  // Branch
  async getBranches(countryId?: string) {
    return this.prisma.branch.findMany({
      where: countryId ? { countryId } : undefined,
      include: { country: { select: { id: true, name: true, code: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async createBranch(data: { name: string; countryId: string }) {
    return this.prisma.branch.create({
      data,
      include: { country: true },
    });
  }

  async updateBranch(id: string, data: { name?: string; countryId?: string }) {
    return this.prisma.branch.update({
      where: { id },
      data,
      include: { country: true },
    });
  }

  async deleteBranch(id: string) {
    await this.ensureNotUsedByCandidates('branchId', id, 'Филиал используется у кандидатов. Удаление невозможно.');
    return this.prisma.branch.delete({ where: { id } });
  }

  // Embassy (used in visa module for appointments)
  async getEmbassies() {
    return this.prisma.embassy.findMany({
      orderBy: [{ country: 'asc' }, { city: 'asc' }, { name: 'asc' }],
    });
  }

  async createEmbassy(data: { name: string; country?: string; city?: string; address?: string }) {
    return this.prisma.embassy.create({
      data: {
        name: data.name,
        country: data.country ?? null,
        city: data.city ?? null,
        address: data.address ?? null,
      },
    });
  }

  async updateEmbassy(
    id: string,
    data: { name?: string; country?: string; city?: string; address?: string },
  ) {
    return this.prisma.embassy.update({
      where: { id },
      data: {
        ...(data.name != null && { name: data.name }),
        ...(data.country !== undefined && { country: data.country ?? null }),
        ...(data.city !== undefined && { city: data.city ?? null }),
        ...(data.address !== undefined && { address: data.address ?? null }),
      },
    });
  }

  async deleteEmbassy(id: string) {
    return this.prisma.embassy.delete({ where: { id } });
  }

  async getFirstOrganizationId(): Promise<string> {
    const org = await this.prisma.organization.findFirst();
    if (!org) throw new Error('No organization found');
    return org.id;
  }

  // Program (linked to country; branch/city is independent)
  async getPrograms(countryId?: string) {
    return this.prisma.program.findMany({
      where: countryId ? { countryId } : undefined,
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
      include: { country: true },
    });
  }

  async createProgram(data: {
    name: string;
    code: string;
    order?: number;
    countryId?: string;
    price?: number;
    candidatePrice?: number;
    requiresLanguage?: boolean;
  }) {
    return this.prisma.program.create({
      data: {
        name: data.name,
        code: data.code,
        order: data.order ?? 0,
        countryId: data.countryId || undefined,
        price: data.price ?? null,
        candidatePrice: data.candidatePrice ?? null,
        requiresLanguage: data.requiresLanguage ?? false,
      },
      include: { country: true },
    });
  }

  async updateProgram(
    id: string,
    data: {
      name?: string;
      code?: string;
      order?: number;
      countryId?: string | null;
      price?: number;
      candidatePrice?: number;
      requiresLanguage?: boolean;
    },
  ) {
    return this.prisma.program.update({
      where: { id },
      data: {
        ...(data.name != null && { name: data.name }),
        ...(data.code != null && { code: data.code }),
        ...(data.order != null && { order: data.order }),
        ...(data.countryId !== undefined && { countryId: data.countryId || null }),
        ...(data.price !== undefined && { price: data.price ?? null }),
        ...(data.candidatePrice !== undefined && { candidatePrice: data.candidatePrice ?? null }),
        ...(data.requiresLanguage !== undefined && { requiresLanguage: data.requiresLanguage }),
      },
      include: { country: true },
    });
  }

  async deleteProgram(id: string) {
    await this.ensureProgramNotUsed(id);
    return this.prisma.program.delete({ where: { id } });
  }

  async copyDocumentTypes(sourceCountryId: string, targetCountryId: string) {
    const source = await this.prisma.countryDocumentType.findMany({
      where: { countryId: sourceCountryId },
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
    });
    if (source.length === 0) return [];
    await this.prisma.countryDocumentType.createMany({
      data: source.map((row) => ({
        countryId: targetCountryId,
        code: row.code,
        name: row.name,
        order: row.order,
      })),
      skipDuplicates: true,
    });
    return this.getDocumentTypes(targetCountryId);
  }
}
