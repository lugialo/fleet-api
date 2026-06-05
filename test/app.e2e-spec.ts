import {
  CanActivate,
  ExecutionContext,
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AuthController } from '../src/auth/auth.controller';
import { IS_PUBLIC_KEY } from '../src/auth/decorators/public.decorator';
import { AuthService } from '../src/auth/auth.service';
import { VehiclesController } from '../src/vehicles/vehicles.controller';
import { VehiclesService } from '../src/vehicles/vehicles.service';
import { describe, expect, it, beforeEach } from '@jest/globals';

type TestRequest = {
  headers: {
    authorization?: string;
  };
  user?: {
    id: string;
    nickname: string;
  };
};

class TestAuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<TestRequest>();
    const authorization = request.headers.authorization;

    if (authorization !== 'Bearer valid-token') {
      throw new UnauthorizedException();
    }

    request.user = {
      id: 'user-id',
      nickname: 'aivacol',
    };

    return true;
  }
}

describe('Fleet API (e2e)', () => {
  let app: INestApplication<App>;

  const authService = {
    login: jest.fn(),
  };

  const vehiclesService = {
    create: jest.fn(),
    findAll: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AuthController, VehiclesController],
      providers: [
        Reflector,
        {
          provide: AuthService,
          useValue: authService,
        },
        {
          provide: VehiclesService,
          useValue: vehiclesService,
        },
        {
          provide: APP_GUARD,
          inject: [Reflector],
          useFactory: (reflector: Reflector) => new TestAuthGuard(reflector),
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('deve permitir login público e retornar token', async () => {
    authService.login.mockResolvedValue({ access_token: 'valid-token' });

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        nickname: 'aivacol',
        password: 'aivacol123',
      })
      .expect(201)
      .expect({ access_token: 'valid-token' });
  });

  it('deve bloquear rota protegida sem token', async () => {
    await request(app.getHttpServer()).get('/vehicles').expect(401);
  });

  it('deve permitir rota protegida com token válido', async () => {
    vehiclesService.findAll.mockResolvedValue([
      {
        id: 'vehicle-id',
        plate: 'ABC1234',
        color: 'Preto',
        year: 2024,
      },
    ]);

    await request(app.getHttpServer())
      .get('/vehicles')
      .set('Authorization', 'Bearer valid-token')
      .expect(200)
      .expect([
        {
          id: 'vehicle-id',
          plate: 'ABC1234',
          color: 'Preto',
          year: 2024,
        },
      ]);
  });

  it('deve validar payload ao criar veículo', async () => {
    await request(app.getHttpServer())
      .post('/vehicles')
      .set('Authorization', 'Bearer valid-token')
      .send({
        plate: '123ABC4',
        color: 'Preto',
        year: 2024,
        model_id: '550e8400-e29b-41d4-a716-446655440000',
      })
      .expect(400);
  });

  it('deve criar veículo usando usuário autenticado', async () => {
    vehiclesService.create.mockResolvedValue({
      id: 'vehicle-id',
      plate: 'ABC1234',
      color: 'Preto',
      year: 2024,
    });

    await request(app.getHttpServer())
      .post('/vehicles')
      .set('Authorization', 'Bearer valid-token')
      .send({
        plate: 'ABC1234',
        color: 'Preto',
        year: 2024,
        model_id: '550e8400-e29b-41d4-a716-446655440000',
      })
      .expect(201);

    expect(vehiclesService.create).toHaveBeenCalledWith(
      {
        plate: 'ABC1234',
        color: 'Preto',
        year: 2024,
        model_id: '550e8400-e29b-41d4-a716-446655440000',
      },
      'user-id',
    );
  });
});
