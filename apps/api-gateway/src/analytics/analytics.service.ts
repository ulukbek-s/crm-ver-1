import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getDashboardStats() {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [leadsTodayCount, candidatesCount, visaCount, paymentsSum] = await Promise.all([
      this.prisma.lead.count({ where: { createdAt: { gte: startOfToday } } }),
      this.prisma.candidate.count({ where: { archivedAt: null } }),
      this.prisma.visaProcess.count(),
      this.prisma.payment.aggregate({ _sum: { amount: true }, where: { status: 'completed' } }),
    ]);
    return {
      leadsToday: leadsTodayCount,
      candidatesInProcess: candidatesCount,
      visaProcesses: visaCount,
      revenue: paymentsSum._sum.amount ?? 0,
    };
  }

  async getPipelineConversion() {
    const byStage = await this.prisma.candidate.groupBy({
      by: ['pipelineStage'],
      _count: true,
      where: { archivedAt: null },
    });
    return byStage.map((s) => ({ stage: s.pipelineStage, count: s._count }));
  }

  /** Выручка по месяцам (сумма оплат кандидатов, status=completed). */
  async getRevenueByMonth(year?: number) {
    const y = year ?? new Date().getFullYear();
    const payments = await this.prisma.payment.findMany({
      where: { status: 'completed', paidAt: { not: null } },
      select: { paidAmount: true, paidAt: true },
    });
    const byMonth: Record<string, number> = {};
    for (const p of payments) {
      const d = p.paidAt ? new Date(p.paidAt) : null;
      if (!d || d.getFullYear() !== y) continue;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      byMonth[key] = (byMonth[key] ?? 0) + Number(p.paidAmount);
    }
    return Object.entries(byMonth)
      .map(([month, total]) => ({ month, total }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }

  async getRecentActivity(limit = 10) {
    const [recentCandidates, recentLeads] = await Promise.all([
      this.prisma.candidate.findMany({
        where: { archivedAt: null },
        take: limit,
        orderBy: { updatedAt: 'desc' },
        select: { id: true, firstName: true, lastName: true, pipelineStage: true, updatedAt: true },
      }),
      this.prisma.lead.findMany({
        take: limit,
        orderBy: { updatedAt: 'desc' },
        select: { id: true, firstName: true, lastName: true, updatedAt: true },
      }),
    ]);
    const activities = [
      ...recentCandidates.map((c) => ({ type: 'candidate', ...c })),
      ...recentLeads.map((l) => ({ type: 'lead', ...l })),
    ]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, limit);
    return activities;
  }
}
