import { IsString, IsOptional, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateDocumentTypeDto {
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  order?: number;
}
