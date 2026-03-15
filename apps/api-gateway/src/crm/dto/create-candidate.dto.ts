import { IsString, IsOptional, IsEmail, MinLength, IsIn, ValidateIf } from 'class-validator';

const STAGES = [
  'leads',
  'candidates',
  'document_prep',
  'send_to_employer',
  'waiting_employer',
  'visa_prep',
  'visa_waiting',
  'accepted',
  'rejected',
];
const PAYMENT_STATUSES = ['none', 'partial', 'paid'];

export class CreateCandidateDto {
  @IsString()
  @MinLength(1)
  candidateCode: string;

  @IsString()
  @MinLength(1)
  firstName: string;

  @IsString()
  @MinLength(1)
  lastName: string;

  @IsString()
  @MinLength(1)
  phone: string;

  @IsOptional()
  @IsString()
  whatsappPhone?: string;

  @IsOptional()
  @IsString()
  telegramUsername?: string;

  @IsOptional()
  @ValidateIf((o) => o.email != null && o.email !== '')
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  countryId?: string;

  @IsOptional()
  @IsString()
  languageLevel?: string;

  @IsOptional()
  @IsString()
  programType?: string;

  @IsOptional()
  @IsString()
  managerId?: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  leadId?: string;

  @IsOptional()
  @IsString()
  leadSourceId?: string;

  @IsOptional()
  @IsString()
  @IsIn(PAYMENT_STATUSES)
  paymentStatus?: string;

  @IsOptional()
  @IsString()
  @IsIn(STAGES)
  pipelineStage?: string;
}
