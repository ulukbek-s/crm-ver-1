import { IsOptional, IsString, IsBoolean, IsDateString } from 'class-validator';

export const VISA_STATUSES = [
  'contract_received',
  'document_prep',
  'embassy_appointment',
  'submission',
  'waiting_decision',
  'approved',
  'rejected',
] as const;

export class UpdateVisaProcessDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsDateString()
  appointmentDate?: string;

  @IsOptional()
  @IsString()
  embassyId?: string;

  @IsOptional()
  @IsDateString()
  submittedAt?: string;

  @IsOptional()
  @IsBoolean()
  biometricsCompleted?: boolean;

  /** Decision: approved = true, rejected = false */
  @IsOptional()
  @IsBoolean()
  decisionApproved?: boolean;

  @IsOptional()
  @IsDateString()
  decisionDate?: string;

  @IsOptional()
  @IsString()
  decisionNotes?: string;

  @IsOptional()
  @IsString()
  rejectionReason?: string;

  @IsOptional()
  @IsString()
  appealStatus?: string;

  @IsOptional()
  @IsString()
  reapplyOption?: string;

  @IsOptional()
  @IsDateString()
  visaIssuedDate?: string;

  @IsOptional()
  @IsDateString()
  visaExpirationDate?: string;

  @IsOptional()
  @IsString()
  contractDocumentId?: string;

  @IsOptional()
  @IsString()
  employerId?: string;
}
