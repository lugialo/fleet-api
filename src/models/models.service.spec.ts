import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Brand } from '../brands/entities/brand.entity';
import { User } from '../users/entities/user.entity';
import { Model } from './entities/model.entity';
import { ModelsService } from './models.service';
import { describe, expect, it, beforeEach, jest } from '@jest/globals';

type MockRepository<T extends object> = {
  find: jest.Mock<() => Promise<T[]>>;
  findOne: jest.Mock<(options: object) => Promise<T | null>>;
  findOneBy: jest.Mock<(where: Partial<T>) => Promise<T | null>>;
  create: jest.Mock<(entity: Partial<T>) => T>;
  save: jest.Mock<(entity: T) => Promise<T>>;
  remove: jest.Mock<(entity: T) => Promise<T>>;
};

describe('ModelsService', () => {
  let service: ModelsService;

  const modelsRepository: MockRepository<Model> = {
    find: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };

  const brandsRepository: Pick<MockRepository<Brand>, 'findOneBy'> = {
    findOneBy: jest.fn(),
  };

  const usersRepository: Pick<MockRepository<User>, 'findOneBy'> = {
    findOneBy: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ModelsService,
        {
          provide: getRepositoryToken(Model),
          useValue: modelsRepository,
        },
        {
          provide: getRepositoryToken(Brand),
          useValue: brandsRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: usersRepository,
        },
      ],
    }).compile();

    service = module.get<ModelsService>(ModelsService);
  });

  it('deve criar modelo vinculado a marca e usuário criador', async () => {
    const brand = { id: 'brand-id', name: 'Toyota' } as Brand;
    const user = { id: 'user-id' } as User;
    const model = {
      name: 'Corolla',
      fipe_code: '001',
      brand,
      created_by: user,
    } as Model;
    const savedModel = { ...model };

    brandsRepository.findOneBy.mockResolvedValue(brand);
    usersRepository.findOneBy.mockResolvedValue(user);
    modelsRepository.findOne.mockResolvedValue(null);
    modelsRepository.create.mockReturnValue(model);
    modelsRepository.save.mockResolvedValue(savedModel);

    const result = await service.create(
      { name: 'Corolla', fipe_code: '001', brand_id: 'brand-id' },
      'user-id',
    );

    expect(result).toEqual(savedModel);
  });

  it('deve falhar quando marca não existir', async () => {
    brandsRepository.findOneBy.mockResolvedValue(null);

    await expect(
      service.create(
        { name: 'Corolla', fipe_code: '001', brand_id: 'missing-brand' },
        'user-id',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('deve bloquear modelo duplicado na mesma marca', async () => {
    brandsRepository.findOneBy.mockResolvedValue({ id: 'brand-id' } as Brand);
    usersRepository.findOneBy.mockResolvedValue({ id: 'user-id' } as User);
    modelsRepository.findOne.mockResolvedValue({ id: 'model-id' } as Model);

    await expect(
      service.create(
        { name: 'Corolla', fipe_code: '001', brand_id: 'brand-id' },
        'user-id',
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('deve atualizar a marca do modelo quando brand_id for informado', async () => {
    const currentBrand = { id: 'brand-id' } as Brand;
    const newBrand = { id: 'new-brand-id' } as Brand;
    const model = {
      id: 'model-id',
      name: 'Corolla',
      fipe_code: '001',
      brand: currentBrand,
    } as Model;

    modelsRepository.findOneBy.mockResolvedValue(model);
    brandsRepository.findOneBy.mockResolvedValue(newBrand);
    modelsRepository.save.mockImplementation((value: Model) =>
      Promise.resolve(value),
    );

    const result = await service.update('model-id', {
      brand_id: 'new-brand-id',
    });

    expect(result.brand).toEqual(newBrand);
  });
});
