import {
  IsInt,
  IsNotEmpty,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min,
} from 'class-validator';

export class CreateVehicleDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/, {
    message: 'A placa deve estar no formato ABC1234 ou ABC1D23',
  })
  plate!: string;

  @IsString()
  @IsNotEmpty()
  color!: string;

  @IsInt()
  @Min(1900)
  @Max(2100)
  year!: number;

  @IsUUID()
  model_id!: string;
}
