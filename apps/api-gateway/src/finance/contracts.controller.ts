import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../common/guards/roles.decorator';
import { FinanceService } from './finance.service';

@Controller('finance/contracts')
@UseGuards(AuthGuard('jwt'))
export class ContractsController {
  constructor(private financeService: FinanceService) {}

  @Get()
  @Roles('Founder', 'Accountant')
  getContracts(
    @Query('companyId') companyId?: string,
    @Query('serviceType') serviceType?: string,
    @Query('status') status?: string,
  ) {
    return this.financeService.getContracts({ companyId, serviceType, status });
  }

  @Get(':id')
  @Roles('Founder', 'Accountant')
  getContractById(@Param('id') id: string) {
    return this.financeService.getContractById(id);
  }

  @Post()
  @Roles('Founder', 'Accountant')
  createContract(
    @Body()
    body: {
      code?: string;
      companyId: string;
      serviceType: string;
      totalValue: number;
      currency: string;
      paymentPlan?: string;
      startDate?: string;
      endDate?: string;
      status?: string;
    },
  ) {
    return this.financeService.createContract(body);
  }

  @Patch(':id')
  @Roles('Founder', 'Accountant')
  updateContract(
    @Param('id') id: string,
    @Body()
    body: {
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
    return this.financeService.updateContract(id, body);
  }

  @Delete(':id')
  @Roles('Founder', 'Accountant')
  deleteContract(@Param('id') id: string) {
    return this.financeService.deleteContract(id);
  }
}

