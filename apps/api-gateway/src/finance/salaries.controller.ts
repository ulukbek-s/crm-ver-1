import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../common/guards/roles.decorator';
import { FinanceService } from './finance.service';

@Controller('finance/salaries')
@UseGuards(AuthGuard('jwt'))
export class SalariesController {
  constructor(private financeService: FinanceService) {}

  @Get()
  @Roles('Founder', 'Accountant')
  getSalaries(
    @Query('employeeId') employeeId?: string,
    @Query('status') status?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.financeService.getSalaries({ employeeId, status, from, to });
  }

  @Post()
  @Roles('Founder', 'Accountant')
  createSalary(
    @Body()
    body: {
      employeeId: string;
      baseAmount: number;
      bonusAmount?: number;
      deductionsAmount?: number;
      finalAmount: number;
      currency: string;
      paymentDate?: string;
      status?: string;
      notes?: string;
    },
  ) {
    return this.financeService.createSalary(body);
  }

  @Patch(':id')
  @Roles('Founder', 'Accountant')
  updateSalary(
    @Param('id') id: string,
    @Body()
    body: {
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
    return this.financeService.updateSalary(id, body);
  }
}

