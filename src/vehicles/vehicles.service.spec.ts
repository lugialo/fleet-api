import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { FindOptionsWhere } from 'typeorm';
import { MessagingService } from '../messaging/messaging.service';
import { Model } from '../models/entities/model.entity';
import { User } from '../users/entities/user.entity';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { Vehicle } from './entities/vehicle.entity';
import { VehiclesService } from './vehicles.service';

type MockRepository<T extends object> = {
  find: jest.Mock<() => Promise<T[]>>;
  findOneBy: jest.Mock<(where: FindOptionsWhere<T>) => Promise<T | null>>;
  create: jest.Mock<(entity: Partial<T>) => T>;
  save: jest.Mock<(entity: T) => Promise<T>>;
  remove: jest.Mock<(entity: T) => Promise<T>>;
};

describe('VehiclesService', () => {
  let service: VehiclesService;

  const vehiclesRepository: MockRepository<Vehicle> = {
    find: jest.fn(),
    findOneBy: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };

  const modelsRepository: Pick<MockRepository<Model>, 'findOneBy'> = {
    findOneBy: jest.fn(),
  };

  const usersRepository: Pick<MockRepository<User>, 'findOneBy'> = {
    findOneBy: jest.fn(),
  };

  const cacheManager: {
    get: jest.Mock<Cache['get']>;
    set: jest.Mock<Cache['set']>;
    del: jest.Mock<Cache['del']>;
  } = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  const configService: {
    get: jest.Mock<ConfigService['get']>;
  } = {
    get: jest.fn(),
  };

  const messagingService = {
    emitVehicleCreated: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VehiclesService,
        {
          provide: getRepositoryToken(Vehicle),
          useValue: vehiclesRepository,
        },
        {
          provide: getRepositoryToken(Model),
          useValue: modelsRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: usersRepository,
        },
        {
          provide: CACHE_MANAGER,
          useValue: cacheManager,
        },
        {
          provide: ConfigService,
          useValue: configService,
        },
        {
          provide: MessagingService,
          useValue: messagingService,
        },
      ],
    }).compile();

    service = module.get<VehiclesService>(VehiclesService);
  });

  it('deve retornar veículos do cache quando existir', async () => {
    const cachedVehicles = [
      {
        id: 'vehicle-id',
        plate: 'ABC1234',
        color: 'Preto',
        year: 2024,
      },
    ] as Vehicle[];

    cacheManager.get.mockResolvedValue(cachedVehicles);

    const result = await service.findAll();

    expect(result).toEqual(cachedVehicles);
    expect(cacheManager.get).toHaveBeenCalledWith('vehicles_list');
    expect(vehiclesRepository.find).not.toHaveBeenCalled();
  });

  it('deve buscar no banco e salvar no cache quando não houver cache', async () => {
    const vehicles = [
      {
        id: 'vehicle-id',
        plate: 'ABC1234',
        color: 'Preto',
        year: 2024,
      },
    ] as Vehicle[];

    cacheManager.get.mockResolvedValue(undefined);
    vehiclesRepository.find.mockResolvedValue(vehicles);
    configService.get.mockReturnValue(3600);

    const result = await service.findAll();

    expect(result).toEqual(vehicles);
    expect(vehiclesRepository.find).toHaveBeenCalled();
    expect(cacheManager.set).toHaveBeenCalledWith(
      'vehicles_list',
      vehicles,
      3600 * 1000,
    );
  });

  it('deve invalidar cache ao criar veículo', async () => {
    const dto: CreateVehicleDto = {
      plate: 'ABC1234',
      color: 'Preto',
      year: 2024,
      model_id: 'model-id',
    };

    const model = { id: 'model-id' } as Model;
    const user = { id: 'user-id' } as User;
    const vehicle = {
      plate: dto.plate,
      color: dto.color,
      year: dto.year,
      model,
      created_by: user,
    } as Vehicle;
    const savedVehicle = { ...vehicle, id: 'vehicle-id' };

    vehiclesRepository.findOneBy.mockResolvedValue(null);
    modelsRepository.findOneBy.mockResolvedValue(model);
    usersRepository.findOneBy.mockResolvedValue(user);
    vehiclesRepository.create.mockReturnValue(vehicle);
    vehiclesRepository.save.mockResolvedValue(savedVehicle);

    const result = await service.create(dto, 'user-id');

    expect(result).toEqual(savedVehicle);
    expect(cacheManager.del).toHaveBeenCalledWith('vehicles_list');
    expect(messagingService.emitVehicleCreated).toHaveBeenCalledWith({
      vehicle_id: 'vehicle-id',
      plate: 'ABC1234',
      model_id: 'model-id',
      created_by: 'user-id',
      created_at: expect.any(String) as string,
    });
  });

  it('deve bloquear criação com placa duplicada', async () => {
    const dto: CreateVehicleDto = {
      plate: 'ABC1234',
      color: 'Preto',
      year: 2024,
      model_id: 'model-id',
    };

    vehiclesRepository.findOneBy.mockResolvedValue({
      id: 'vehicle-id',
    } as Vehicle);

    await expect(service.create(dto, 'user-id')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(modelsRepository.findOneBy).not.toHaveBeenCalled();
    expect(cacheManager.del).not.toHaveBeenCalled();
    expect(messagingService.emitVehicleCreated).not.toHaveBeenCalled();
  });

  it('deve bloquear criação sem modelo existente', async () => {
    const dto: CreateVehicleDto = {
      plate: 'ABC1234',
      color: 'Preto',
      year: 2024,
      model_id: 'missing-model',
    };

    vehiclesRepository.findOneBy.mockResolvedValue(null);
    modelsRepository.findOneBy.mockResolvedValue(null);

    await expect(service.create(dto, 'user-id')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(usersRepository.findOneBy).not.toHaveBeenCalled();
    expect(cacheManager.del).not.toHaveBeenCalled();
  });

  it('deve invalidar cache ao atualizar veículo', async () => {
    const vehicle = {
      id: 'vehicle-id',
      plate: 'ABC1234',
      color: 'Preto',
      year: 2024,
    } as Vehicle;

    const updatedVehicle = {
      ...vehicle,
      color: 'Branco',
    };

    vehiclesRepository.findOneBy.mockResolvedValue(vehicle);
    vehiclesRepository.save.mockResolvedValue(updatedVehicle);

    const dto: UpdateVehicleDto = {
      color: 'Branco',
    };

    const result = await service.update('vehicle-id', dto);

    expect(result).toEqual(updatedVehicle);
    expect(cacheManager.del).toHaveBeenCalledWith('vehicles_list');
  });

  it('deve lançar erro ao atualizar veículo inexistente', async () => {
    vehiclesRepository.findOneBy.mockResolvedValue(null);

    await expect(
      service.update('missing-vehicle', { color: 'Branco' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(cacheManager.del).not.toHaveBeenCalled();
  });

  it('deve invalidar cache ao remover veículo', async () => {
    const vehicle = {
      id: 'vehicle-id',
      plate: 'ABC1234',
      color: 'Preto',
      year: 2024,
    } as Vehicle;

    vehiclesRepository.findOneBy.mockResolvedValue(vehicle);
    vehiclesRepository.remove.mockResolvedValue(vehicle);

    await service.remove('vehicle-id');

    expect(vehiclesRepository.remove).toHaveBeenCalledWith(vehicle);
    expect(cacheManager.del).toHaveBeenCalledWith('vehicles_list');
  });
});
