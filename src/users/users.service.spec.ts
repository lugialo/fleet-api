import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';
import { describe, expect, it, beforeEach, jest } from '@jest/globals';

type UserPasswordQueryBuilder = {
  addSelect: jest.Mock<(selection: string) => UserPasswordQueryBuilder>;
  where: jest.Mock<
    (
      query: string,
      parameters: { nickname: string },
    ) => UserPasswordQueryBuilder
  >;
  getOne: jest.Mock<() => Promise<User | null>>;
};

type MockRepository<T extends object> = {
  find: jest.Mock<() => Promise<T[]>>;
  findOne: jest.Mock<(options: object) => Promise<T | null>>;
  findOneBy: jest.Mock<(where: Partial<T>) => Promise<T | null>>;
  create: jest.Mock<(entity: Partial<T>) => T>;
  save: jest.Mock<(entity: T) => Promise<T>>;
  remove: jest.Mock<(entity: T) => Promise<T>>;
  createQueryBuilder: jest.Mock<(alias: string) => UserPasswordQueryBuilder>;
};

describe('UsersService', () => {
  let service: UsersService;

  const queryBuilder: UserPasswordQueryBuilder = {
    addSelect: jest.fn(() => queryBuilder),
    where: jest.fn(() => queryBuilder),
    getOne: jest.fn(),
  };

  const usersRepository: MockRepository<User> = {
    find: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(() => queryBuilder),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: usersRepository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('deve criar usuário com senha criptografada', async () => {
    usersRepository.findOne.mockResolvedValue(null);
    usersRepository.create.mockImplementation(
      (user: Partial<User>): User => user as User,
    );
    usersRepository.save.mockImplementation((user: User) =>
      Promise.resolve({ id: 'user-id', ...user }),
    );

    const result = await service.create({
      nickname: 'aivacol',
      name: 'Aivacol',
      email: 'aivacol@example.com',
      password: 'aivacol123',
    });

    expect(result.id).toBe('user-id');
    expect(result.password_hash).not.toBe('aivacol123');
    await expect(
      bcrypt.compare('aivacol123', result.password_hash),
    ).resolves.toBe(true);
  });

  it('deve bloquear nickname ou email duplicado', async () => {
    usersRepository.findOne.mockResolvedValue({ id: 'existing-user' } as User);

    await expect(
      service.create({
        nickname: 'aivacol',
        name: 'Aivacol',
        email: 'aivacol@example.com',
        password: 'aivacol123',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('deve lançar erro quando usuário não existir', async () => {
    usersRepository.findOneBy.mockResolvedValue(null);

    await expect(service.findOne('missing-user')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('deve buscar usuário com password_hash para autenticação', async () => {
    const user = {
      id: 'user-id',
      nickname: 'aivacol',
      password_hash: 'hash',
    } as User;

    queryBuilder.getOne.mockResolvedValue(user);

    const result = await service.findByNicknameWithPassword('aivacol');

    expect(result).toEqual(user);
    expect(usersRepository.createQueryBuilder).toHaveBeenCalledWith('user');
    expect(queryBuilder.addSelect).toHaveBeenCalledWith('user.password_hash');
    expect(queryBuilder.where).toHaveBeenCalledWith(
      'user.nickname = :nickname',
      { nickname: 'aivacol' },
    );
  });
});
