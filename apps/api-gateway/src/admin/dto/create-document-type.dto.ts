import { IsString, IsOptional, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateDocumentTypeDto {
  @IsString()
  countryId: string;

  @IsString()
  code: string;

  @IsString()
  name: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  order?: number;
}
