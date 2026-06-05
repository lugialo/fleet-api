import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';

type UserWithPassword = {
  id: string;
  nickname: string;
  password_hash: string;
};

type PasswordLookupQueryBuilder = {
  addSelect(selection: string): PasswordLookupQueryBuilder;
  where(
    query: string,
    parameters: { nickname: string },
  ): PasswordLookupQueryBuilder;
  getOne(): Promise<UserWithPassword | null>;
};

type UsersServiceWithRepository = {
  usersRepository: {
    createQueryBuilder(alias: string): PasswordLookupQueryBuilder;
  };
};

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto) {
    const user = await (
      this.usersService as unknown as UsersServiceWithRepository
    ).usersRepository
      .createQueryBuilder('user')
      .addSelect('user.password_hash')
      .where('user.nickname = :nickname', { nickname: loginDto.nickname })
      .getOne();

    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const passwordMatches = await bcrypt.compare(
      loginDto.password,
      user.password_hash,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      nickname: user.nickname,
    });

    return {
      access_token: accessToken,
    };
  }
}
