import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards, Delete } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FinanceService } from './finance.service';
import { Roles } from '../common/guards/roles.decorator';

@Controller('finance')
@UseGuards(AuthGuard('jwt'))
export class FinanceController {
  constructor(private financeService: FinanceService) {}

  @Get('dashboard')
  @Roles('Founder', 'Accountant')
  getDashboard() {
    return this.financeService.getDashboard();
  }

  @Get('dashboard/charts')
  @Roles('Founder', 'Accountant')
  getDashboardCharts() {
    return this.financeService.getDashboardCharts();
  }

  @Get('reports/course-revenue')
  @Roles('Founder', 'Accountant')
  getCourseRevenueReport() {
    return this.financeService.getCourseRevenueReport();
  }

  @Get('reports/overdue-aging')
  @Roles('Founder', 'Accountant')
  getOverdueAgingReport() {
    return this.financeService.getOverdueAgingReport();
  }

  @Get('payments')
  @Roles('Founder', 'Accountant')
  getPayments(@Query('candidateId') candidateId?: string, @Query('status') status?: string) {
    return this.financeService.getPayments(candidateId, status);
  }

  @Post('payments')
  @Roles('Founder', 'Accountant')
  createPayment(
    @Body()
    body: {
      candidateId: string;
      amount: number;
      currency?: string;
      status?: string;
      maxAmount?: number;
    },
  ) {
    return this.financeService.createPayment(body);
  }

  @Patch('payments/:id/status')
  @Roles('Founder', 'Accountant')
  updatePaymentStatus(@Param('id') id: string, @Body() body: { status: string }) {
    return this.financeService.updatePaymentStatus(id, body.status);
  }

  @Patch('payments/:id')
  @Roles('Founder', 'Accountant')
  updatePayment(
    @Param('id') id: string,
    @Body() body: { amount?: number; currency?: string; status?: string },
  ) {
    return this.financeService.updatePayment(id, body);
  }

  @Delete('payments/:id')
  @Roles('Founder', 'Accountant')
  deletePayment(@Param('id') id: string) {
    return this.financeService.deletePayment(id);
  }

  @Patch('payments/:id/receipt')
  @Roles('Founder', 'Accountant')
  attachReceipt(@Param('id') id: string, @Body() body: { documentId: string }) {
    return this.financeService.attachReceipt(id, body.documentId);
  }

  @Delete('payments/:id/receipt')
  @Roles('Founder', 'Accountant')
  removeReceipt(@Param('id') id: string) {
    return this.financeService.removeReceipt(id);
  }
}
