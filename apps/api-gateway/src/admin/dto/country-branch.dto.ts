import { IsString, IsOptional } from 'class-validator';

export class CreateCountryDto {
  @IsString()
  name: string;

  @IsString()
  code: string;

  @IsOptional()
  @IsString()
  organizationId?: string;
}

export class UpdateCountryDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  code?: string;
}

export class CreateBranchDto {
  @IsString()
  name: string;

  @IsString()
  countryId: string;
}

export class UpdateBranchDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  countryId?: string;
}
