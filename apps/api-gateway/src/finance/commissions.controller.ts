import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../common/guards/roles.decorator';
import { FinanceService } from './finance.service';

@Controller('finance/commissions')
@UseGuards(AuthGuard('jwt'))
export class CommissionsController {
  constructor(private financeService: FinanceService) {}

  @Get()
  @Roles('Founder', 'Accountant')
  getCommissions(
    @Query('employeeId') employeeId?: string,
    @Query('companyId') companyId?: string,
    @Query('status') status?: string,
  ) {
    return this.financeService.getCommissions({ employeeId, companyId, status });
  }

  @Post()
  @Roles('Founder', 'Accountant')
  createCommission(
    @Body()
    body: {
      employeeId: string;
      candidateId?: string;
      companyId?: string;
      dealValue: number;
      commissionPercent: number;
      commissionAmount: number;
      currency: string;
      status?: string;
    },
  ) {
    return this.financeService.createCommission(body);
  }

  @Patch(':id')
  @Roles('Founder', 'Accountant')
  updateCommission(
    @Param('id') id: string,
    @Body()
    body: {
      dealValue?: number;
      commissionPercent?: number;
      commissionAmount?: number;
      currency?: string;
      status?: string;
      paymentId?: string | null;
    },
  ) {
    return this.financeService.updateCommission(id, body);
  }
}

