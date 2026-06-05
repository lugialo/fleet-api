import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { BrandsService } from './brands.service';
import { Brand } from './entities/brand.entity';
import { describe, expect, it, beforeEach, jest } from '@jest/globals';

type MockRepository<T extends object> = {
  find: jest.Mock<() => Promise<T[]>>;
  findOneBy: jest.Mock<(where: Partial<T>) => Promise<T | null>>;
  create: jest.Mock<(entity: Partial<T>) => T>;
  save: jest.Mock<(entity: T) => Promise<T>>;
  remove: jest.Mock<(entity: T) => Promise<T>>;
};

describe('BrandsService', () => {
  let service: BrandsService;

  const brandsRepository: MockRepository<Brand> = {
    find: jest.fn(),
    findOneBy: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };

  const usersRepository: Pick<MockRepository<User>, 'findOneBy'> = {
    findOneBy: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BrandsService,
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

    service = module.get<BrandsService>(BrandsService);
  });

  it('deve criar marca vinculada ao usuário criador', async () => {
    const user = { id: 'user-id' } as User;
    const brand = { name: 'Toyota', created_by: user } as Brand;
    const savedBrand = { ...brand, id: 'brand-id' };

    brandsRepository.findOneBy.mockResolvedValueOnce(null);
    usersRepository.findOneBy.mockResolvedValue(user);
    brandsRepository.create.mockReturnValue(brand);
    brandsRepository.save.mockResolvedValue(savedBrand);

    const result = await service.create({ name: 'Toyota' }, 'user-id');

    expect(result).toEqual(savedBrand);
    expect(brandsRepository.create).toHaveBeenCalledWith({
      name: 'Toyota',
      created_by: user,
    });
  });

  it('deve bloquear marca duplicada', async () => {
    brandsRepository.findOneBy.mockResolvedValue({ id: 'brand-id' } as Brand);

    await expect(
      service.create({ name: 'Toyota' }, 'user-id'),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('deve falhar quando usuário criador não existir', async () => {
    brandsRepository.findOneBy.mockResolvedValue(null);
    usersRepository.findOneBy.mockResolvedValue(null);

    await expect(
      service.create({ name: 'Toyota' }, 'missing-user'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('deve lançar erro quando marca não existir', async () => {
    brandsRepository.findOneBy.mockResolvedValue(null);

    await expect(service.findOne('missing-brand')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
