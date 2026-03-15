import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
const INDEX_CANDIDATES = 'candidates';

@Injectable()
export class SearchService {
  private client: { search: (opts: any) => Promise<any>; index: (opts: any) => Promise<any> } | null = null;

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {
    const node = this.config.get('ELASTICSEARCH_NODE');
    if (node) {
      try {
        // Dynamic import to avoid build failure if optional dependency not installed
        const es = require('@elastic/elasticsearch');
        this.client = new es.Client({ node });
      } catch {
        this.client = null;
      }
    }
  }

  async searchCandidates(q: string, limit = 20) {
    if (this.client) {
      try {
        const res = await this.client.search({
          index: INDEX_CANDIDATES,
          query: {
            multi_match: {
              query: q,
              fields: ['firstName', 'lastName', 'candidateCode', 'email', 'languageLevel'],
              fuzziness: 'AUTO',
            },
          },
          size: limit,
        });
        const hits = (res as any).hits?.hits ?? [];
        const ids = hits.map((h: any) => h._source?.id).filter(Boolean);
        if (ids.length === 0) return [];
        const candidates = await this.prisma.candidate.findMany({
          where: { id: { in: ids } },
          include: { country: true, manager: { select: { id: true, firstName: true, lastName: true } } },
        });
        const byId = new Map(candidates.map((c) => [c.id, c]));
        return ids.map((id: string) => byId.get(id)).filter(Boolean);
      } catch {
        return this.searchCandidatesPrisma(q, limit);
      }
    }
    return this.searchCandidatesPrisma(q, limit);
  }

  private async searchCandidatesPrisma(q: string, limit: number) {
    const term = `%${q}%`;
    return this.prisma.candidate.findMany({
      where: {
        OR: [
          { firstName: { contains: term, mode: 'insensitive' } },
          { lastName: { contains: term, mode: 'insensitive' } },
          { candidateCode: { contains: term, mode: 'insensitive' } },
          { email: { contains: term, mode: 'insensitive' } },
        ],
      },
      take: limit,
      include: { country: true, manager: { select: { id: true, firstName: true, lastName: true } } },
    });
  }

  async indexCandidate(candidateId: string) {
    if (!this.client) return;
    const c = await this.prisma.candidate.findUnique({
      where: { id: candidateId },
      include: { country: true },
    });
    if (!c) return;
    await this.client.index({
      index: INDEX_CANDIDATES,
      id: c.id,
      document: {
        id: c.id,
        candidateCode: c.candidateCode,
        firstName: c.firstName,
        lastName: c.lastName,
        email: c.email,
        languageLevel: c.languageLevel,
        pipelineStage: c.pipelineStage,
        countryName: c.country?.name,
      },
    });
  }
}
