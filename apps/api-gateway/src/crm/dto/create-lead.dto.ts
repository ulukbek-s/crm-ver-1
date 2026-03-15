import { IsString, IsOptional, IsEmail, MinLength } from 'class-validator';

export class CreateLeadDto {
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
  @IsEmail()
  email?: string;

  @IsString()
  sourceId: string;

  @IsString()
  statusId: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  assignedManagerId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
