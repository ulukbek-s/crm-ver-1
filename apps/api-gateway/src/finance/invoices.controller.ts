import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../common/guards/roles.decorator';
import { FinanceService } from './finance.service';

@Controller('finance/invoices')
@UseGuards(AuthGuard('jwt'))
export class InvoicesController {
  constructor(private financeService: FinanceService) {}

  @Get()
  @Roles('Founder', 'Accountant')
  getInvoices(
    @Query('status') status?: string,
    @Query('serviceType') serviceType?: string,
    @Query('clientCompanyId') clientCompanyId?: string,
    @Query('candidateId') candidateId?: string,
  ) {
    return this.financeService.getInvoices({
      status,
      serviceType,
      clientCompanyId,
      candidateId,
    });
  }

  @Get(':id')
  @Roles('Founder', 'Accountant')
  getInvoiceById(@Param('id') id: string) {
    return this.financeService.getInvoiceById(id);
  }

  @Post()
  @Roles('Founder', 'Accountant')
  createInvoice(
    @Body()
    body: {
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
    },
  ) {
    return this.financeService.createInvoice(body);
  }

  @Patch(':id')
  @Roles('Founder', 'Accountant')
  updateInvoice(
    @Param('id') id: string,
    @Body()
    body: {
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
    return this.financeService.updateInvoice(id, body);
  }
}

