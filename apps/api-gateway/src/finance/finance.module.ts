import { Module } from '@nestjs/common';
import { FinanceController } from './finance.controller';
import { FinanceService } from './finance.service';
import { InvoicesController } from './invoices.controller';
import { ExpensesController } from './expenses.controller';
import { SalariesController } from './salaries.controller';
import { CommissionsController } from './commissions.controller';
import { ContractsController } from './contracts.controller';
import { RefundsController } from './refunds.controller';

@Module({
  controllers: [
    FinanceController,
    InvoicesController,
    ExpensesController,
    SalariesController,
    CommissionsController,
    ContractsController,
    RefundsController,
  ],
  providers: [FinanceService],
  exports: [FinanceService],
})
export class FinanceModule {}
