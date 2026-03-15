import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../common/guards/roles.decorator';
import { FinanceService } from './finance.service';

@Controller('finance/expenses')
@UseGuards(AuthGuard('jwt'))
export class ExpensesController {
  constructor(private financeService: FinanceService) {}

  @Get()
  @Roles('Founder', 'Accountant')
  getExpenses(
    @Query('category') category?: string,
    @Query('employeeId') employeeId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.financeService.getExpenses({ category, employeeId, from, to });
  }

  @Get(':id')
  @Roles('Founder', 'Accountant')
  getExpenseById(@Param('id') id: string) {
    return this.financeService.getExpenseById(id);
  }

  @Post()
  @Roles('Founder', 'Accountant')
  createExpense(
    @Body()
    body: {
      category: string;
      amount: number;
      currency: string;
      date?: string;
      description?: string;
      employeeId?: string;
      receiptDocumentId?: string;
    },
  ) {
    return this.financeService.createExpense(body);
  }

  @Patch(':id')
  @Roles('Founder', 'Accountant')
  updateExpense(
    @Param('id') id: string,
    @Body()
    body: {
      category?: string;
      amount?: number;
      currency?: string;
      date?: string;
      description?: string | null;
      employeeId?: string | null;
      receiptDocumentId?: string | null;
    },
  ) {
    return this.financeService.updateExpense(id, body);
  }

  @Delete(':id')
  @Roles('Founder', 'Accountant')
  deleteExpense(@Param('id') id: string) {
    return this.financeService.deleteExpense(id);
  }
}

