import { IsString, IsOptional } from 'class-validator';

export class CreateLeadSourceDto {
  @IsString()
  name: string;

  @IsString()
  code: string;
}

export class UpdateLeadSourceDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  code?: string;
}
