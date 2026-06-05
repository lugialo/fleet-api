import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateVehicleDto } from './create-vehicle.dto';
import { describe, expect, it } from '@jest/globals';

describe('CreateVehicleDto', () => {
  it('deve aceitar placa no formato antigo ABC1234', async () => {
    const dto = plainToInstance(CreateVehicleDto, {
      plate: 'ABC1234',
      color: 'Preto',
      year: 2024,
      model_id: '550e8400-e29b-41d4-a716-446655440000',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('deve aceitar placa no formato Mercosul ABC1D23', async () => {
    const dto = plainToInstance(CreateVehicleDto, {
      plate: 'ABC1D23',
      color: 'Branco',
      year: 2024,
      model_id: '550e8400-e29b-41d4-a716-446655440000',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('deve bloquear placa em formato inválido', async () => {
    const dto = plainToInstance(CreateVehicleDto, {
      plate: '123ABC4',
      color: 'Preto',
      year: 2024,
      model_id: '550e8400-e29b-41d4-a716-446655440000',
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((error) => error.property === 'plate')).toBe(true);
  });

  it('deve bloquear criação sem model_id', async () => {
    const dto = plainToInstance(CreateVehicleDto, {
      plate: 'ABC1234',
      color: 'Preto',
      year: 2024,
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((error) => error.property === 'model_id')).toBe(true);
  });

  it('deve bloquear ano fora do intervalo permitido', async () => {
    const dto = plainToInstance(CreateVehicleDto, {
      plate: 'ABC1234',
      color: 'Preto',
      year: 1800,
      model_id: '550e8400-e29b-41d4-a716-446655440000',
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((error) => error.property === 'year')).toBe(true);
  });
});
