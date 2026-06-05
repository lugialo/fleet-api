import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;

  const queryBuilder = {
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
  };

  const usersService = {
    usersRepository: {
      createQueryBuilder: jest.fn(() => queryBuilder),
    },
  };

  const jwtService = {
    signAsync: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: usersService,
        },
        {
          provide: JwtService,
          useValue: jwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('deve retornar access_token para credenciais válidas', async () => {
    const password_hash = await bcrypt.hash('aivacol123', 10);

    queryBuilder.getOne.mockResolvedValue({
      id: 'user-id',
      nickname: 'aivacol',
      password_hash,
    });
    jwtService.signAsync.mockResolvedValue('jwt-token');

    const result = await service.login({
      nickname: 'aivacol',
      password: 'aivacol123',
    });

    expect(result).toEqual({ access_token: 'jwt-token' });
    expect(jwtService.signAsync).toHaveBeenCalledWith({
      sub: 'user-id',
      nickname: 'aivacol',
    });
  });

  it('deve falhar quando usuário não existir', async () => {
    queryBuilder.getOne.mockResolvedValue(null);

    await expect(
      service.login({ nickname: 'aivacol', password: 'aivacol123' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('deve falhar quando senha estiver incorreta', async () => {
    queryBuilder.getOne.mockResolvedValue({
      id: 'user-id',
      nickname: 'aivacol',
      password_hash: await bcrypt.hash('senha-correta', 10),
    });

    await expect(
      service.login({ nickname: 'aivacol', password: 'senha-errada' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
