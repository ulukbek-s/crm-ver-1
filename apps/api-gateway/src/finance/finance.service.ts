import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FinanceService {
  constructor(private prisma: PrismaService) {}

  // ========== PAYMENTS ==========

  async getPayments(candidateId?: string, status?: string) {
    return this.prisma.payment.findMany({
      where: { ...(candidateId && { candidateId }), ...(status && { status }) },
      include: {
        candidate: { select: { id: true, firstName: true, lastName: true, candidateCode: true } },
        receiptDocument: { select: { id: true, fileName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ========== INVOICES ==========

  async getInvoices(filter: {
    status?: string;
    serviceType?: string;
    clientCompanyId?: string;
    candidateId?: string;
  }) {
    return this.prisma.invoice.findMany({
      where: {
        ...(filter.status && { status: filter.status }),
        ...(filter.serviceType && { serviceType: filter.serviceType }),
        ...(filter.clientCompanyId && { clientCompanyId: filter.clientCompanyId }),
        ...(filter.candidateId && { candidateId: filter.candidateId }),
      },
      orderBy: { issueDate: 'desc' },
    });
  }

  async getInvoiceById(id: string) {
    return this.prisma.invoice.findUnique({
      where: { id },
      include: {
        payments: true,
        refunds: true,
      },
    });
  }

  async createInvoice(data: {
    number?: string;
    clientCompanyId?: string;
    candidateId?: string;
    studentId?: string;
    serviceType: string;
    amount: number;
    currency: string;
    issueDate?: string;
    dueDate?: string;
    notes?: string;
    contractId?: string;
  }) {
    const number =
      data.number ??
      `INV-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 999)
        .toString()
        .padStart(3, '0')}`;

    return this.prisma.invoice.create({
      data: {
        number,
        clientCompanyId: data.clientCompanyId ?? null,
        candidateId: data.candidateId ?? null,
        studentId: data.studentId ?? null,
        serviceType: data.serviceType,
        amount: data.amount,
        currency: data.currency,
        issueDate: data.issueDate ? new Date(data.issueDate) : undefined,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        notes: data.notes ?? null,
        contractId: data.contractId ?? null,
      },
    });
  }

  async updateInvoice(
    id: string,
    data: {
      number?: string;
      clientCompanyId?: string | null;
      candidateId?: string | null;
      studentId?: string | null;
      serviceType?: string;
      amount?: number;
      currency?: string;
      issueDate?: string;
      dueDate?: string | null;
      status?: string;
      notes?: string | null;
      contractId?: string | null;
    },
  ) {
    const existing = await this.prisma.invoice.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Invoice not found');
    }

    const updateData: any = {};
    if (data.number !== undefined) updateData.number = data.number;
    if (data.clientCompanyId !== undefined) updateData.clientCompanyId = data.clientCompanyId;
    if (data.candidateId !== undefined) updateData.candidateId = data.candidateId;
    if (data.studentId !== undefined) updateData.studentId = data.studentId;
    if (data.serviceType !== undefined) updateData.serviceType = data.serviceType;
    if (data.amount !== undefined) updateData.amount = data.amount;
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.issueDate !== undefined) {
      updateData.issueDate = data.issueDate ? new Date(data.issueDate) : existing.issueDate;
    }
    if (data.dueDate !== undefined) {
      updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    }
    if (data.status !== undefined) updateData.status = data.status;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.contractId !== undefined) updateData.contractId = data.contractId;

    return this.prisma.invoice.update({
      where: { id },
      data: updateData,
    });
  }

  private async recalcCandidatePaymentStatus(candidateId: string) {
    const [candidate, program, agg] = await Promise.all([
      this.prisma.candidate.findUnique({ where: { id: candidateId } }),
      this.prisma.candidate.findUnique({
        where: { id: candidateId },
        select: { programType: true },
      }),
      this.prisma.payment.aggregate({
        _sum: { amount: true },
        where: { candidateId, status: 'completed' },
      }),
    ]);
    if (!candidate) return;
    const programEntity =
      program?.programType != null
        ? await this.prisma.program.findFirst({ where: { name: program.programType } })
        : null;
    const candidatePrice =
      (programEntity?.candidatePrice as unknown as number | null) ??
      (programEntity?.price as unknown as number | null) ??
      null;
    const totalPaid = Number(agg._sum.amount ?? 0);
    let paymentStatus = 'none';
    if (totalPaid > 0) {
      if (candidatePrice != null && totalPaid >= Number(candidatePrice)) {
        paymentStatus = 'paid';
      } else {
        paymentStatus = 'partial';
      }
    }
    await this.prisma.candidate.update({
      where: { id: candidateId },
      data: { paymentStatus },
    });
  }

  async createPayment(data: {
    candidateId: string;
    amount: number;
    currency?: string;
    status?: string;
    maxAmount?: number;
  }) {
    const status = data.status ?? 'pending';
    const isCompleted = status === 'completed';

    const candidate = await this.prisma.candidate.findUnique({
      where: { id: data.candidateId },
      select: { id: true },
    });
    if (!candidate) {
      throw new NotFoundException('Кандидат не найден для платежа');
    }

    if (data.maxAmount != null && typeof data.maxAmount === 'number') {
      const sumAgg = await this.prisma.payment.aggregate({
        _sum: { amount: true },
        where: { candidateId: data.candidateId, status: 'completed' },
      });
      const totalPaid = Number(sumAgg._sum.amount ?? 0);
      if (totalPaid + data.amount > data.maxAmount) {
        throw new BadRequestException(
          `Сумма платежа не может превышать остаток. Остаток: ${(data.maxAmount - totalPaid).toLocaleString()}`,
        );
      }
    }

    const payment = await this.prisma.payment.create({
      data: {
        candidateId: data.candidateId,
        amount: data.amount,
        currency: data.currency ?? 'EUR',
        status,
        ...(isCompleted && { paidAt: new Date() }),
      },
    });
    await this.recalcCandidatePaymentStatus(payment.candidateId);
    return payment;
  }

  async updatePaymentStatus(id: string, status: string) {
    const updateData: any = { status };
    if (status === 'completed') {
      updateData.paidAt = new Date();
    }
    const payment = await this.prisma.payment.update({
      where: { id },
      data: updateData,
    });
    await this.recalcCandidatePaymentStatus(payment.candidateId);
    return payment;
  }

  async updatePayment(
    id: string,
    data: { amount?: number; currency?: string; status?: string },
  ) {
    const updateData: any = {};
    if (data.amount != null) updateData.amount = data.amount;
    if (data.currency != null) updateData.currency = data.currency;
    if (data.status != null) {
      updateData.status = data.status;
      if (data.status === 'completed') {
        updateData.paidAt = new Date();
      }
    }
    const payment = await this.prisma.payment.update({
      where: { id },
      data: updateData,
    });
    await this.recalcCandidatePaymentStatus(payment.candidateId);
    return payment;
  }

  async deletePayment(id: string) {
    const payment = await this.prisma.payment.delete({
      where: { id },
    });
    await this.recalcCandidatePaymentStatus(payment.candidateId);
    return { deleted: true };
  }

  async attachReceipt(paymentId: string, documentId: string) {
    const payment = await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        receiptDocumentId: documentId,
        status: 'completed',
        paidAt: new Date(),
      },
    });
    await this.recalcCandidatePaymentStatus(payment.candidateId);
    return payment;
  }

  async removeReceipt(paymentId: string) {
    return this.prisma.payment.update({
      where: { id: paymentId },
      data: { receiptDocumentId: null },
    });
  }

  // ========== DASHBOARD & REPORTS ==========

  async getDashboard() {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      revenueAll,
      revenueMonth,
      expensesMonth,
      salariesMonth,
      overdueInvoices,
      pendingPaymentsAgg,
    ] = await Promise.all([
      this.prisma.payment.aggregate({
        _sum: { amount: true },
        where: { status: 'completed' },
      }),
      this.prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          status: 'completed',
          paidAt: { gte: monthStart },
        },
      }),
      this.prisma.expense.aggregate({
        _sum: { amount: true },
        where: {
          date: { gte: monthStart },
        },
      }),
      this.prisma.salaryPayment.aggregate({
        _sum: { finalAmount: true },
        where: {
          paymentDate: { gte: monthStart },
          status: 'paid',
        },
      }),
      this.prisma.invoice.count({
        where: {
          status: 'overdue',
        },
      }),
      this.prisma.payment.aggregate({
        _sum: { amount: true },
        _count: { id: true },
        where: { status: 'pending' },
      }),
    ]);

    const totalRevenue = Number(revenueAll._sum.amount ?? 0);
    const revenueThisMonth = Number(revenueMonth._sum.amount ?? 0);
    const expensesThisMonth =
      Number(expensesMonth._sum.amount ?? 0) +
      Number(salariesMonth._sum.finalAmount ?? 0);
    const netProfitThisMonth = revenueThisMonth - expensesThisMonth;
    const pendingPaymentsAmount = Number(pendingPaymentsAgg._sum.amount ?? 0);
    const pendingPaymentsCount = pendingPaymentsAgg._count.id ?? 0;
    const cashFlow = revenueThisMonth - expensesThisMonth;

    return {
      totalRevenue,
      revenueThisMonth,
      expensesThisMonth,
      netProfitThisMonth,
      overdueInvoices,
      pendingPaymentsAmount,
      pendingPaymentsCount,
      cashFlow,
    };
  }

  async getDashboardCharts() {
    const now = new Date();
    const months: { year: number; month: number; label: string }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        year: d.getFullYear(),
        month: d.getMonth(),
        label: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      });
    }

    const revenueByMonth = await Promise.all(
      months.map(async (m) => {
        const start = new Date(m.year, m.month, 1);
        const end = new Date(m.year, m.month + 1, 0, 23, 59, 59);
        const agg = await this.prisma.payment.aggregate({
          _sum: { amount: true },
          where: {
            status: 'completed',
            paidAt: { gte: start, lte: end },
          },
        });
        return { month: m.label, revenue: Number(agg._sum.amount ?? 0) };
      }),
    );

    const expensesByMonth = await Promise.all(
      months.map(async (m) => {
        const start = new Date(m.year, m.month, 1);
        const end = new Date(m.year, m.month + 1, 0, 23, 59, 59);
        const [exp, sal] = await Promise.all([
          this.prisma.expense.aggregate({
            _sum: { amount: true },
            where: { date: { gte: start, lte: end } },
          }),
          this.prisma.salaryPayment.aggregate({
            _sum: { finalAmount: true },
            where: {
              paymentDate: { gte: start, lte: end },
              status: 'paid',
            },
          }),
        ]);
        const total =
          Number(exp._sum.amount ?? 0) + Number(sal._sum.finalAmount ?? 0);
        return { month: m.label, expenses: total };
      }),
    );

    const profitGrowth = revenueByMonth.map((r, i) => ({
      month: r.month,
      profit: r.revenue - (expensesByMonth[i]?.expenses ?? 0),
    }));

    const paymentsWithInvoice = await this.prisma.payment.findMany({
      where: {
        status: 'completed',
        invoiceId: { not: null },
      },
      include: {
        invoice: { select: { serviceType: true } },
      },
    });
    const byServiceType: Record<string, number> = {};
    for (const p of paymentsWithInvoice) {
      const type = (p as any).invoice?.serviceType ?? 'OTHER';
      byServiceType[type] = (byServiceType[type] ?? 0) + Number(p.amount ?? 0);
    }
    const revenueByServiceType = Object.entries(byServiceType).map(
      ([serviceType, revenue]) => ({ serviceType, revenue }),
    );
    if (revenueByServiceType.length === 0) {
      revenueByServiceType.push({ serviceType: 'LANGUAGE_COURSE', revenue: 0 });
      revenueByServiceType.push({ serviceType: 'VISA_SERVICE', revenue: 0 });
      revenueByServiceType.push({ serviceType: 'RECRUITMENT_SERVICE', revenue: 0 });
      revenueByServiceType.push({ serviceType: 'OTHER', revenue: 0 });
    }

    return {
      revenueByMonth,
      expensesByMonth,
      profitGrowth,
      revenueByServiceType,
    };
  }

  async getCourseRevenueReport() {
    const payments = await this.prisma.payment.findMany({
      where: {
        status: 'completed',
        candidate: {
          student: {
            isNot: null,
          },
        },
      },
      include: {
        candidate: {
          select: {
            id: true,
            student: {
              select: {
                groups: {
                  select: {
                    group: {
                      select: {
                        id: true,
                        courseId: true,
                        course: {
                          select: {
                            id: true,
                            name: true,
                            level: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    const byCourse = new Map<
      string,
      {
        courseId: string;
        courseName: string | null;
        courseLevel: string | null;
        revenue: number;
        paymentsCount: number;
        studentIds: Set<string>;
      }
    >();

    for (const p of payments) {
      const student = (p as any).candidate?.student;
      const mainGroup = student?.groups?.[0]?.group;
      const course = mainGroup?.course;
      const courseId: string | undefined = course?.id ?? mainGroup?.courseId;
      if (!courseId) continue;

      let entry = byCourse.get(courseId);
      if (!entry) {
        entry = {
          courseId,
          courseName: course?.name ?? null,
          courseLevel: course?.level ?? null,
          revenue: 0,
          paymentsCount: 0,
          studentIds: new Set<string>(),
        };
        byCourse.set(courseId, entry);
      }
      entry.revenue += Number(p.amount ?? 0);
      entry.paymentsCount += 1;
      if (p.candidateId) {
        entry.studentIds.add(p.candidateId);
      }
    }

    return Array.from(byCourse.values()).map((v) => ({
      courseId: v.courseId,
      courseName: v.courseName,
      courseLevel: v.courseLevel,
      revenue: v.revenue,
      paymentsCount: v.paymentsCount,
      studentsCount: v.studentIds.size,
    }));
  }

  async getOverdueAgingReport() {
    const now = new Date();
    const invoices = await this.prisma.invoice.findMany({
      where: {
        dueDate: {
          not: null,
          lt: now,
        },
        NOT: {
          status: 'paid',
        },
      },
      select: {
        id: true,
        number: true,
        amount: true,
        currency: true,
        dueDate: true,
        status: true,
      },
    });

    const buckets: Record<
      '0-30' | '31-60' | '61-90' | '90+',
      { label: string; daysFrom: number; daysTo: number; totalAmount: number; count: number }
    > = {
      '0-30': { label: '0-30', daysFrom: 0, daysTo: 30, totalAmount: 0, count: 0 },
      '31-60': { label: '31-60', daysFrom: 31, daysTo: 60, totalAmount: 0, count: 0 },
      '61-90': { label: '61-90', daysFrom: 61, daysTo: 90, totalAmount: 0, count: 0 },
      '90+': { label: '90+', daysFrom: 91, daysTo: Infinity, totalAmount: 0, count: 0 },
    };

    const detailed: Record<string, any[]> = {
      '0-30': [],
      '31-60': [],
      '61-90': [],
      '90+': [],
    };

    for (const inv of invoices) {
      if (!inv.dueDate) continue;
      const diffMs = now.getTime() - (inv.dueDate as Date).getTime();
      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      let key: keyof typeof buckets;
      if (days <= 30) key = '0-30';
      else if (days <= 60) key = '31-60';
      else if (days <= 90) key = '61-90';
      else key = '90+';

      buckets[key].totalAmount += Number(inv.amount ?? 0);
      buckets[key].count += 1;
      detailed[key].push({
        id: inv.id,
        number: inv.number,
        amount: Number(inv.amount ?? 0),
        currency: inv.currency,
        status: inv.status,
        dueDate: inv.dueDate,
        daysOverdue: days,
      });
    }

    return {
      summary: Object.values(buckets).map((b) => ({
        bucket: b.label,
        totalAmount: b.totalAmount,
        count: b.count,
      })),
      detailed,
    };
  }

  // ========== EXPENSES ==========

  async getExpenses(filter: {
    category?: string;
    employeeId?: string;
    from?: string;
    to?: string;
  }) {
    return this.prisma.expense.findMany({
      where: {
        ...(filter.category && { category: filter.category }),
        ...(filter.employeeId && { employeeId: filter.employeeId }),
        ...(filter.from || filter.to
          ? {
              date: {
                ...(filter.from && { gte: new Date(filter.from) }),
                ...(filter.to && { lte: new Date(filter.to) }),
              },
            }
          : {}),
      },
      orderBy: { date: 'desc' },
    });
  }

  async getExpenseById(id: string) {
    return this.prisma.expense.findUnique({ where: { id } });
  }

  async createExpense(data: {
    category: string;
    amount: number;
    currency: string;
    date?: string;
    description?: string;
    employeeId?: string;
    receiptDocumentId?: string;
  }) {
    return this.prisma.expense.create({
      data: {
        category: data.category,
        amount: data.amount,
        currency: data.currency,
        date: data.date ? new Date(data.date) : new Date(),
        description: data.description ?? null,
        employeeId: data.employeeId ?? null,
        receiptDocumentId: data.receiptDocumentId ?? null,
      },
    });
  }

  async updateExpense(
    id: string,
    data: {
      category?: string;
      amount?: number;
      currency?: string;
      date?: string;
      description?: string | null;
      employeeId?: string | null;
      receiptDocumentId?: string | null;
    },
  ) {
    const updateData: any = {};
    if (data.category !== undefined) updateData.category = data.category;
    if (data.amount !== undefined) updateData.amount = data.amount;
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.date !== undefined) updateData.date = data.date ? new Date(data.date) : new Date();
    if (data.description !== undefined) updateData.description = data.description;
    if (data.employeeId !== undefined) updateData.employeeId = data.employeeId;
    if (data.receiptDocumentId !== undefined)
      updateData.receiptDocumentId = data.receiptDocumentId;

    return this.prisma.expense.update({
      where: { id },
      data: updateData,
    });
  }

  async deleteExpense(id: string) {
    await this.prisma.expense.delete({ where: { id } });
    return { deleted: true };
  }

  // ========== SALARIES ==========

  async getSalaries(filter: {
    employeeId?: string;
    status?: string;
    from?: string;
    to?: string;
  }) {
    return this.prisma.salaryPayment.findMany({
      where: {
        ...(filter.employeeId && { employeeId: filter.employeeId }),
        ...(filter.status && { status: filter.status }),
        ...(filter.from || filter.to
          ? {
              paymentDate: {
                ...(filter.from && { gte: new Date(filter.from) }),
                ...(filter.to && { lte: new Date(filter.to) }),
              },
            }
          : {}),
      },
      orderBy: { paymentDate: 'desc' },
    });
  }

  async createSalary(data: {
    employeeId: string;
    baseAmount: number;
    bonusAmount?: number;
    deductionsAmount?: number;
    finalAmount: number;
    currency: string;
    paymentDate?: string;
    status?: string;
    notes?: string;
  }) {
    return this.prisma.salaryPayment.create({
      data: {
        employeeId: data.employeeId,
        baseAmount: data.baseAmount,
        bonusAmount: data.bonusAmount ?? null,
        deductionsAmount: data.deductionsAmount ?? null,
        finalAmount: data.finalAmount,
        currency: data.currency,
        paymentDate: data.paymentDate ? new Date(data.paymentDate) : new Date(),
        status: data.status ?? 'planned',
        notes: data.notes ?? null,
      },
    });
  }

  async updateSalary(
    id: string,
    data: {
      baseAmount?: number;
      bonusAmount?: number | null;
      deductionsAmount?: number | null;
      finalAmount?: number;
      currency?: string;
      paymentDate?: string;
      status?: string;
      notes?: string | null;
    },
  ) {
    const updateData: any = {};
    if (data.baseAmount !== undefined) updateData.baseAmount = data.baseAmount;
    if (data.bonusAmount !== undefined) updateData.bonusAmount = data.bonusAmount;
    if (data.deductionsAmount !== undefined)
      updateData.deductionsAmount = data.deductionsAmount;
    if (data.finalAmount !== undefined) updateData.finalAmount = data.finalAmount;
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.paymentDate !== undefined)
      updateData.paymentDate = data.paymentDate ? new Date(data.paymentDate) : new Date();
    if (data.status !== undefined) updateData.status = data.status;
    if (data.notes !== undefined) updateData.notes = data.notes;

    return this.prisma.salaryPayment.update({
      where: { id },
      data: updateData,
    });
  }

  // ========== COMMISSIONS ==========

  async getCommissions(filter: {
    employeeId?: string;
    companyId?: string;
    status?: string;
  }) {
    return this.prisma.commission.findMany({
      where: {
        ...(filter.employeeId && { employeeId: filter.employeeId }),
        ...(filter.companyId && { companyId: filter.companyId }),
        ...(filter.status && { status: filter.status }),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createCommission(data: {
    employeeId: string;
    candidateId?: string;
    companyId?: string;
    dealValue: number;
    commissionPercent: number;
    commissionAmount: number;
    currency: string;
    status?: string;
  }) {
    return this.prisma.commission.create({
      data: {
        employeeId: data.employeeId,
        candidateId: data.candidateId ?? null,
        companyId: data.companyId ?? null,
        dealValue: data.dealValue,
        commissionPercent: data.commissionPercent,
        commissionAmount: data.commissionAmount,
        currency: data.currency,
        status: data.status ?? 'pending',
      },
    });
  }

  async updateCommission(
    id: string,
    data: {
      dealValue?: number;
      commissionPercent?: number;
      commissionAmount?: number;
      currency?: string;
      status?: string;
      paymentId?: string | null;
    },
  ) {
    const updateData: any = {};
    if (data.dealValue !== undefined) updateData.dealValue = data.dealValue;
    if (data.commissionPercent !== undefined)
      updateData.commissionPercent = data.commissionPercent;
    if (data.commissionAmount !== undefined)
      updateData.commissionAmount = data.commissionAmount;
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.paymentId !== undefined) updateData.paymentId = data.paymentId;

    return this.prisma.commission.update({
      where: { id },
      data: updateData,
    });
  }

  // ========== CONTRACTS ==========

  async getContracts(filter: {
    companyId?: string;
    serviceType?: string;
    status?: string;
  }) {
    return this.prisma.contract.findMany({
      where: {
        ...(filter.companyId && { companyId: filter.companyId }),
        ...(filter.serviceType && { serviceType: filter.serviceType }),
        ...(filter.status && { status: filter.status }),
      },
      orderBy: { startDate: 'desc' },
      include: { invoices: true },
    });
  }

  async getContractById(id: string) {
    return this.prisma.contract.findUnique({
      where: { id },
      include: { invoices: true },
    });
  }

  async createContract(data: {
    code?: string;
    companyId: string;
    serviceType: string;
    totalValue: number;
    currency: string;
    paymentPlan?: string;
    startDate?: string;
    endDate?: string;
    status?: string;
  }) {
    const code =
      data.code ??
      `CTR-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 999)
        .toString()
        .padStart(3, '0')}`;

    return this.prisma.contract.create({
      data: {
        code,
        companyId: data.companyId,
        serviceType: data.serviceType,
        totalValue: data.totalValue,
        currency: data.currency,
        paymentPlan: data.paymentPlan ?? null,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        status: data.status ?? 'draft',
      },
    });
  }

  async updateContract(
    id: string,
    data: {
      code?: string;
      serviceType?: string;
      totalValue?: number;
      currency?: string;
      paymentPlan?: string | null;
      startDate?: string;
      endDate?: string | null;
      status?: string;
    },
  ) {
    const updateData: any = {};
    if (data.code !== undefined) updateData.code = data.code;
    if (data.serviceType !== undefined) updateData.serviceType = data.serviceType;
    if (data.totalValue !== undefined) updateData.totalValue = data.totalValue;
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.paymentPlan !== undefined) updateData.paymentPlan = data.paymentPlan;
    if (data.startDate !== undefined)
      updateData.startDate = data.startDate ? new Date(data.startDate) : null;
    if (data.endDate !== undefined)
      updateData.endDate = data.endDate ? new Date(data.endDate) : null;
    if (data.status !== undefined) updateData.status = data.status;

    return this.prisma.contract.update({
      where: { id },
      data: updateData,
    });
  }

  async deleteContract(id: string) {
    await this.prisma.contract.delete({ where: { id } });
    return { deleted: true };
  }

  // ========== REFUNDS ==========

  async getRefunds(filter: {
    invoiceId?: string;
    status?: string;
    from?: string;
    to?: string;
  }) {
    return this.prisma.refund.findMany({
      where: {
        ...(filter.invoiceId && { invoiceId: filter.invoiceId }),
        ...(filter.status && { status: filter.status }),
        ...(filter.from || filter.to
          ? {
              date: {
                ...(filter.from && { gte: new Date(filter.from) }),
                ...(filter.to && { lte: new Date(filter.to) }),
              },
            }
          : {}),
      },
      orderBy: { date: 'desc' },
      include: { invoice: true },
    });
  }

  async createRefund(data: {
    invoiceId: string;
    amount: number;
    currency: string;
    reason?: string;
    date?: string;
    status?: string;
  }) {
    return this.prisma.refund.create({
      data: {
        invoiceId: data.invoiceId,
        amount: data.amount,
        currency: data.currency,
        reason: data.reason ?? null,
        date: data.date ? new Date(data.date) : new Date(),
        status: data.status ?? 'pending',
      },
    });
  }

  async updateRefund(
    id: string,
    data: {
      amount?: number;
      currency?: string;
      reason?: string | null;
      date?: string;
      status?: string;
    },
  ) {
    const updateData: any = {};
    if (data.amount !== undefined) updateData.amount = data.amount;
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.reason !== undefined) updateData.reason = data.reason;
    if (data.date !== undefined) updateData.date = data.date ? new Date(data.date) : new Date();
    if (data.status !== undefined) updateData.status = data.status;

    return this.prisma.refund.update({
      where: { id },
      data: updateData,
    });
  }
}
