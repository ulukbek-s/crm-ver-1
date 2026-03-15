import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AnalyticsService } from './analytics.service';
import { Roles } from '../common/guards/roles.decorator';

@Controller('analytics')
@UseGuards(AuthGuard('jwt'))
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @Roles('Founder', 'Manager', 'Recruiter', 'BranchManager', 'VisaOfficer', 'Accountant', 'Partner')
  getDashboard() {
    return this.analyticsService.getDashboardStats();
  }

  @Get('pipeline-conversion')
  @Roles('Founder', 'Manager', 'Recruiter', 'BranchManager', 'VisaOfficer', 'Accountant', 'Partner')
  getPipelineConversion() {
    return this.analyticsService.getPipelineConversion();
  }

  @Get('recent-activity')
  @Roles('Founder', 'Manager', 'Recruiter', 'BranchManager', 'VisaOfficer', 'Accountant')
  getRecentActivity() {
    return this.analyticsService.getRecentActivity();
  }

  @Get('revenue-by-month')
  @Roles('Founder', 'Manager', 'Recruiter', 'BranchManager', 'VisaOfficer', 'Accountant', 'Partner')
  getRevenueByMonth(@Query('year') year?: string) {
    return this.analyticsService.getRevenueByMonth(year ? parseInt(year, 10) : undefined);
  }
}
