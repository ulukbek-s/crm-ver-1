import { Controller, Get, Patch, Post, Query, Body, Param, UseGuards, Delete } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CrmService } from './crm.service';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';
import { UpdateStageDto } from './dto/update-stage.dto';
import { CreateLeadDto } from './dto/create-lead.dto';
import { CreateCandidateDto } from './dto/create-candidate.dto';
import { Roles } from '../common/guards/roles.decorator';

@Controller('crm')
@UseGuards(AuthGuard('jwt'))
export class CrmController {
  constructor(private crmService: CrmService) {}

  @Get('lead-sources')
  @Roles('Founder', 'Manager', 'Recruiter', 'BranchManager', 'VisaOfficer', 'Accountant')
  getLeadSources() {
    return this.crmService.getLeadSources();
  }

  @Get('lead-statuses')
  @Roles('Founder', 'Manager', 'Recruiter', 'BranchManager', 'VisaOfficer', 'Accountant')
  getLeadStatuses() {
    return this.crmService.getLeadStatuses();
  }

  @Get('countries')
  @Roles('Founder', 'Manager', 'Recruiter', 'BranchManager', 'VisaOfficer', 'Accountant')
  getCountries() {
    return this.crmService.getCountries();
  }

  @Get('branches')
  @Roles('Founder', 'Manager', 'Recruiter', 'BranchManager', 'VisaOfficer', 'Accountant')
  getBranches(@Query('countryId') countryId?: string) {
    return this.crmService.getBranches(countryId);
  }

  @Get('leads')
  @Roles('Founder', 'Manager', 'Recruiter', 'BranchManager', 'VisaOfficer')
  getLeads(
    @CurrentUser() user: JwtUser,
    @Query('branchId') branchId?: string,
    @Query('statusId') statusId?: string,
  ) {
    return this.crmService.getLeads(user, branchId, statusId);
  }

  @Post('leads')
  @Roles('Founder', 'Manager', 'Recruiter', 'BranchManager')
  createLead(@Body() dto: CreateLeadDto, @CurrentUser() user: JwtUser) {
    return this.crmService.createLead({
      ...dto,
      assignedManagerId: dto.assignedManagerId ?? user?.id,
    });
  }

  @Get('candidates')
  @Roles('Founder', 'Manager', 'Recruiter', 'BranchManager', 'VisaOfficer')
  getCandidates(
    @CurrentUser() user: JwtUser,
    @Query('branchId') branchId?: string,
    @Query('pipelineStage') pipelineStage?: string,
    @Query('countryId') countryId?: string,
  ) {
    return this.crmService.getCandidates(user, branchId, pipelineStage, countryId);
  }

  @Get('candidates/archived')
  @Roles('Founder', 'Manager', 'Recruiter', 'BranchManager', 'VisaOfficer')
  getArchivedCandidates(
    @CurrentUser() user: JwtUser,
    @Query('branchId') branchId?: string,
    @Query('countryId') countryId?: string,
  ) {
    return this.crmService.getArchivedCandidates(user, branchId, countryId);
  }

  @Post('candidates')
  @Roles('Founder', 'Manager', 'Recruiter', 'BranchManager')
  createCandidate(@Body() dto: CreateCandidateDto, @CurrentUser() user: JwtUser) {
    return this.crmService.createCandidate({
      ...dto,
      managerId: dto.managerId ?? user?.id,
    });
  }

  @Patch('candidates/:id/stage')
  @Roles('Founder', 'Manager', 'Recruiter', 'BranchManager', 'VisaOfficer')
  updateCandidateStage(
    @Param('id') candidateId: string,
    @Body() body: UpdateStageDto,
  ) {
    return this.crmService.updateCandidateStage(candidateId, body.pipelineStage);
  }

  @Patch('candidates/:id/anketa')
  @Roles('Founder', 'Manager', 'Recruiter', 'BranchManager', 'VisaOfficer')
  updateCandidateAnketa(
    @Param('id') candidateId: string,
    @Body() body: { anketaStatus?: string; anketaData?: Record<string, unknown>; archiveReason?: string },
  ) {
    return this.crmService.updateCandidateAnketa(candidateId, body.anketaStatus, body.anketaData, body.archiveReason);
  }

  @Patch('candidates/:id/archive')
  @Roles('Founder', 'Manager', 'Recruiter', 'BranchManager')
  archiveCandidate(
    @Param('id') candidateId: string,
    @Body() body: { reason: string },
  ) {
    return this.crmService.archiveCandidate(candidateId, body.reason);
  }

  @Patch('candidates/:id/unarchive')
  @Roles('Founder', 'Manager', 'Recruiter', 'BranchManager')
  unarchiveCandidate(@Param('id') candidateId: string) {
    return this.crmService.unarchiveCandidate(candidateId);
  }

  @Delete('candidates/:id')
  @Roles('Founder')
  deleteCandidate(@Param('id') candidateId: string) {
    return this.crmService.deleteCandidate(candidateId);
  }

  @Get('pipeline/stats')
  @Roles('Founder', 'Manager', 'Recruiter', 'BranchManager', 'VisaOfficer', 'Accountant')
  getPipelineStats() {
    return this.crmService.getPipelineStats();
  }

  @Get('candidates-in-work')
  @Roles('Founder', 'Manager', 'Recruiter', 'BranchManager', 'VisaOfficer')
  getCandidatesInWork(@CurrentUser() user: JwtUser) {
    return this.crmService.getCandidatesInWork(user);
  }

  @Get('candidates/:id')
  @Roles('Founder', 'Manager', 'Recruiter', 'BranchManager', 'VisaOfficer')
  getCandidate(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return this.crmService.getCandidateById(id, user);
  }
}
