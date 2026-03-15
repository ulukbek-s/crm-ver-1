import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RecruitmentService } from './recruitment.service';
import { CreateVacancyDto } from './dto/create-vacancy.dto';
import { UpdateVacancyDto } from './dto/update-vacancy.dto';
import { Roles } from '../common/guards/roles.decorator';

@Controller('recruitment')
@UseGuards(AuthGuard('jwt'))
export class RecruitmentController {
  constructor(private recruitmentService: RecruitmentService) {}

  @Post('vacancies/:id/candidates')
  @Roles('Founder', 'Manager', 'Recruiter', 'BranchManager')
  submitCandidates(@Param('id') id: string, @Body() body: { candidateIds: string[] }) {
    const candidateIds = Array.isArray(body.candidateIds) ? body.candidateIds : [];
    return this.recruitmentService.submitCandidatesToVacancy(id, candidateIds);
  }

  @Patch('vacancy-candidates/:id')
  @Roles('Founder', 'Manager', 'Recruiter', 'BranchManager')
  updateVacancyCandidate(
    @Param('id') id: string,
    @Body() body: { stage?: string; contractDocumentId?: string | null; contractSentAt?: string | null },
  ) {
    return this.recruitmentService.updateVacancyCandidate(id, body);
  }

  @Get('vacancies')
  @Roles('Founder', 'Manager', 'Recruiter', 'BranchManager', 'VisaOfficer', 'Partner')
  getVacancies(@Query('countryId') countryId?: string, @Query('status') status?: string) {
    return this.recruitmentService.getVacancies(countryId, status);
  }

  @Post('vacancies')
  @Roles('Founder', 'Manager', 'Recruiter', 'BranchManager')
  createVacancy(@Body() dto: CreateVacancyDto) {
    return this.recruitmentService.createVacancy(dto);
  }

  @Get('vacancies/:id')
  @Roles('Founder', 'Manager', 'Recruiter', 'BranchManager', 'VisaOfficer', 'Partner')
  getVacancy(@Param('id') id: string) {
    return this.recruitmentService.getVacancyById(id);
  }

  @Patch('vacancies/:id')
  @Roles('Founder', 'Manager', 'Recruiter', 'BranchManager')
  updateVacancy(@Param('id') id: string, @Body() dto: UpdateVacancyDto) {
    return this.recruitmentService.updateVacancy(id, dto);
  }

  @Get('employers')
  @Roles('Founder', 'Manager', 'Recruiter', 'BranchManager')
  getEmployers(@Query('countryId') countryId?: string) {
    return this.recruitmentService.getEmployers(countryId);
  }

  @Post('employers')
  @Roles('Founder', 'Manager', 'Recruiter', 'BranchManager')
  createEmployer(@Body() body: { name: string; countryId?: string; contact?: string; email?: string }) {
    return this.recruitmentService.createEmployer(body);
  }

  @Patch('employers/:id')
  @Roles('Founder', 'Manager', 'Recruiter', 'BranchManager')
  updateEmployer(@Param('id') id: string, @Body() body: { name?: string; countryId?: string; contact?: string; email?: string }) {
    return this.recruitmentService.updateEmployer(id, body);
  }

  @Delete('employers/:id')
  @Roles('Founder', 'Manager', 'Recruiter', 'BranchManager')
  deleteEmployer(@Param('id') id: string) {
    return this.recruitmentService.deleteEmployer(id);
  }

  @Get('countries')
  @Roles('Founder', 'Manager', 'Recruiter', 'BranchManager', 'VisaOfficer', 'Partner')
  getCountries() {
    return this.recruitmentService.getCountries();
  }
}
