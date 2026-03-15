import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminService } from './admin.service';
import { FounderGuard } from '../common/guards/founder.guard';
import { CreateDocumentTypeDto } from './dto/create-document-type.dto';
import { UpdateDocumentTypeDto } from './dto/update-document-type.dto';
import {
  CreateLeadSourceDto,
  UpdateLeadSourceDto,
} from './dto/lead-source.dto';
import {
  CreateCountryDto,
  UpdateCountryDto,
  CreateBranchDto,
  UpdateBranchDto,
} from './dto/country-branch.dto';
import { CreateProgramDto, UpdateProgramDto } from './dto/program.dto';
import { AuditService } from './audit.service';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';

const JwtAuthGuard = () => UseGuards(AuthGuard('jwt'));
const FounderOnly = () => UseGuards(AuthGuard('jwt'), FounderGuard);

@Controller('admin')
@JwtAuthGuard()
export class AdminController {
  constructor(
    private admin: AdminService,
    private audit: AuditService,
  ) {}

  // Document types by country — GET allowed for any authenticated user (for upload form)
  @Get('document-types')
  getDocumentTypes(@Query('countryId') countryId?: string) {
    return this.admin.getDocumentTypes(countryId || undefined);
  }

  @Post('document-types/copy')
  @FounderOnly()
  copyDocumentTypes(@Body() body: { sourceCountryId: string; targetCountryId: string }) {
    return this.admin.copyDocumentTypes(body.sourceCountryId, body.targetCountryId);
  }

  @Post('document-types')
  @FounderOnly()
  async createDocumentType(@Body() dto: CreateDocumentTypeDto, @CurrentUser() user?: JwtUser) {
    const result = await this.admin.createDocumentType(dto);
    await this.audit.log('CountryDocumentType', result.id, 'create', user?.id);
    return result;
  }

  @Patch('document-types/:id')
  @FounderOnly()
  async updateDocumentType(@Param('id') id: string, @Body() dto: UpdateDocumentTypeDto, @CurrentUser() user?: JwtUser) {
    const result = await this.admin.updateDocumentType(id, dto);
    await this.audit.log('CountryDocumentType', id, 'update', user?.id);
    return result;
  }

  @Delete('document-types/:id')
  @FounderOnly()
  async deleteDocumentType(@Param('id') id: string, @CurrentUser() user?: JwtUser) {
    await this.admin.deleteDocumentType(id);
    await this.audit.log('CountryDocumentType', id, 'delete', user?.id);
    return { deleted: true };
  }

  // Programs — GET for any authenticated (for add-candidate form). Optional countryId: programs linked to country.
  @Get('programs')
  getPrograms(@Query('countryId') countryId?: string) {
    return this.admin.getPrograms(countryId || undefined);
  }

  @Post('programs')
  @FounderOnly()
  async createProgram(@Body() dto: CreateProgramDto, @CurrentUser() user?: JwtUser) {
    const result = await this.admin.createProgram(dto);
    await this.audit.log('Program', result.id, 'create', user?.id);
    return result;
  }

  @Patch('programs/:id')
  @FounderOnly()
  async updateProgram(@Param('id') id: string, @Body() dto: UpdateProgramDto, @CurrentUser() user?: JwtUser) {
    const result = await this.admin.updateProgram(id, dto);
    await this.audit.log('Program', id, 'update', user?.id);
    return result;
  }

  @Delete('programs/:id')
  @FounderOnly()
  async deleteProgram(@Param('id') id: string, @CurrentUser() user?: JwtUser) {
    await this.admin.deleteProgram(id);
    await this.audit.log('Program', id, 'delete', user?.id);
    return { deleted: true };
  }

  // Lead sources
  @Get('lead-sources')
  getLeadSources() {
    return this.admin.getLeadSources();
  }

  @Post('lead-sources')
  @FounderOnly()
  async createLeadSource(@Body() dto: CreateLeadSourceDto, @CurrentUser() user?: JwtUser) {
    const result = await this.admin.createLeadSource(dto);
    await this.audit.log('LeadSource', result.id, 'create', user?.id);
    return result;
  }

  @Patch('lead-sources/:id')
  @FounderOnly()
  async updateLeadSource(@Param('id') id: string, @Body() dto: UpdateLeadSourceDto, @CurrentUser() user?: JwtUser) {
    const result = await this.admin.updateLeadSource(id, dto);
    await this.audit.log('LeadSource', id, 'update', user?.id);
    return result;
  }

  @Delete('lead-sources/:id')
  @FounderOnly()
  async deleteLeadSource(@Param('id') id: string, @CurrentUser() user?: JwtUser) {
    await this.admin.deleteLeadSource(id);
    await this.audit.log('LeadSource', id, 'delete', user?.id);
    return { deleted: true };
  }

  // Countries
  @Get('countries')
  getCountries() {
    return this.admin.getCountries();
  }

  @Post('countries')
  @FounderOnly()
  async createCountry(@Body() dto: CreateCountryDto, @CurrentUser() user?: JwtUser) {
    const organizationId = dto.organizationId ?? (await this.admin.getFirstOrganizationId());
    const result = await this.admin.createCountry({ name: dto.name, code: dto.code, organizationId });
    await this.audit.log('Country', result.id, 'create', user?.id);
    return result;
  }

  @Patch('countries/:id')
  @FounderOnly()
  async updateCountry(@Param('id') id: string, @Body() dto: UpdateCountryDto, @CurrentUser() user?: JwtUser) {
    const result = await this.admin.updateCountry(id, dto);
    await this.audit.log('Country', id, 'update', user?.id);
    return result;
  }

  @Delete('countries/:id')
  @FounderOnly()
  async deleteCountry(@Param('id') id: string, @CurrentUser() user?: JwtUser) {
    await this.admin.deleteCountry(id);
    await this.audit.log('Country', id, 'delete', user?.id);
    return { deleted: true };
  }

  // Branches
  @Get('branches')
  getBranches(@Query('countryId') countryId?: string) {
    return this.admin.getBranches(countryId || undefined);
  }

  @Post('branches')
  @FounderOnly()
  async createBranch(@Body() dto: CreateBranchDto, @CurrentUser() user?: JwtUser) {
    const result = await this.admin.createBranch(dto);
    await this.audit.log('Branch', result.id, 'create', user?.id);
    return result;
  }

  @Patch('branches/:id')
  @FounderOnly()
  async updateBranch(@Param('id') id: string, @Body() dto: UpdateBranchDto, @CurrentUser() user?: JwtUser) {
    const result = await this.admin.updateBranch(id, dto);
    await this.audit.log('Branch', id, 'update', user?.id);
    return result;
  }

  @Delete('branches/:id')
  @FounderOnly()
  async deleteBranch(@Param('id') id: string, @CurrentUser() user?: JwtUser) {
    await this.admin.deleteBranch(id);
    await this.audit.log('Branch', id, 'delete', user?.id);
    return { deleted: true };
  }

  // Embassies (for visa appointments)
  @Get('embassies')
  getEmbassies() {
    return this.admin.getEmbassies();
  }

  @Post('embassies')
  @FounderOnly()
  async createEmbassy(
    @Body() body: { name: string; country?: string; city?: string; address?: string },
    @CurrentUser() user?: JwtUser,
  ) {
    const result = await this.admin.createEmbassy(body);
    await this.audit.log('Embassy', result.id, 'create', user?.id);
    return result;
  }

  @Patch('embassies/:id')
  @FounderOnly()
  async updateEmbassy(
    @Param('id') id: string,
    @Body() body: { name?: string; country?: string; city?: string; address?: string },
    @CurrentUser() user?: JwtUser,
  ) {
    const result = await this.admin.updateEmbassy(id, body);
    await this.audit.log('Embassy', id, 'update', user?.id);
    return result;
  }

  @Delete('embassies/:id')
  @FounderOnly()
  async deleteEmbassy(@Param('id') id: string, @CurrentUser() user?: JwtUser) {
    await this.admin.deleteEmbassy(id);
    await this.audit.log('Embassy', id, 'delete', user?.id);
    return { deleted: true };
  }
}
