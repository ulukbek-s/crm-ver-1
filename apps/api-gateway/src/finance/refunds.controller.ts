import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../common/guards/roles.decorator';
import { FinanceService } from './finance.service';

@Controller('finance/refunds')
@UseGuards(AuthGuard('jwt'))
export class RefundsController {
  constructor(private financeService: FinanceService) {}

  @Get()
  @Roles('Founder', 'Accountant')
  getRefunds(
    @Query('invoiceId') invoiceId?: string,
    @Query('status') status?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.financeService.getRefunds({ invoiceId, status, from, to });
  }

  @Post()
  @Roles('Founder', 'Accountant')
  createRefund(
    @Body()
    body: {
      invoiceId: string;
      amount: number;
      currency: string;
      reason?: string;
      date?: string;
      status?: string;
    },
  ) {
    return this.financeService.createRefund(body);
  }

  @Patch(':id')
  @Roles('Founder', 'Accountant')
  updateRefund(
    @Param('id') id: string,
    @Body()
    body: {
      amount?: number;
      currency?: string;
      reason?: string | null;
      date?: string;
      status?: string;
    },
  ) {
    return this.financeService.updateRefund(id, body);
  }
}

