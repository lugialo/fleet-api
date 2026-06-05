import { IsString, IsNotEmpty, IsUUID } from 'class-validator';

export class CreateModelDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  fipe_code!: string;

  @IsUUID()
  brand_id!: string;
}
