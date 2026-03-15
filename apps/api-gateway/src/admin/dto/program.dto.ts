import { IsString, IsOptional, IsInt, IsNumber, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProgramDto {
  @IsString()
  name: string;

  @IsString()
  code: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  order?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  price?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  candidatePrice?: number;

  @IsOptional()
  @IsString()
  countryId?: string;

  @IsOptional()
  @IsBoolean()
  requiresLanguage?: boolean;
}

export class UpdateProgramDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  order?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  price?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  candidatePrice?: number;

  @IsOptional()
  @IsString()
  countryId?: string | null;

  @IsOptional()
  @IsBoolean()
  requiresLanguage?: boolean;
}
