import { IsString, IsOptional, IsInt, Min, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateVacancyDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  employerId?: string;

  @IsOptional()
  @IsString()
  countryId?: string;

  @IsOptional()
  @IsString()
  salary?: string;

  @IsOptional()
  @Type(() => Number)
  salaryMin?: number;

  @IsOptional()
  @Type(() => Number)
  salaryMax?: number;

  @IsOptional()
  @IsString()
  salaryCurrency?: string;

  @IsOptional()
  @IsString()
  requirements?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  openPositions?: number;

  @IsOptional()
  @IsString()
  @IsIn(['open', 'closed', 'paused', 'archived'])
  status?: string;

  @IsOptional()
  @IsString()
  deadline?: string | null;
}
