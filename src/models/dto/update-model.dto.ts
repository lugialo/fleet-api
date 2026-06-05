import { IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdateModelDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  fipe_code?: string;

  @IsOptional()
  @IsUUID()
  brand_id?: string;
}
