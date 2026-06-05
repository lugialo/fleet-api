import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { User } from './entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const existingUser = await this.usersRepository.findOne({
      where: [
        { nickname: createUserDto.nickname },
        { email: createUserDto.email },
      ],
    });

    if (existingUser) {
      throw new ConflictException('Nome de usuário ou e-mail já cadastrado.');
    }

    const user = this.usersRepository.create({
      nickname: createUserDto.nickname,
      name: createUserDto.name,
      email: createUserDto.email,
      password_hash: await bcrypt.hash(createUserDto.password, 10),
    });

    return this.usersRepository.save(user);
  }

  findAll(): Promise<User[]> {
    return this.usersRepository.find();
  }

  async findOne(id: string): Promise<User> {
    const user = await this.usersRepository.findOneBy({ id });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    return user;
  }

  async findByNicknameWithPassword(nickname: string): Promise<User | null> {
    return this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.password_hash')
      .where('user.nickname = :nickname', { nickname })
      .getOne();
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);

    if (updateUserDto.nickname !== undefined) {
      user.nickname = updateUserDto.nickname;
    }

    if (updateUserDto.name !== undefined) {
      user.name = updateUserDto.name;
    }

    if (updateUserDto.email !== undefined) {
      user.email = updateUserDto.email;
    }

    if (updateUserDto.password !== undefined) {
      user.password_hash = await bcrypt.hash(updateUserDto.password, 10);
    }

    await this.usersRepository.save(user);

    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const user = await this.findOne(id);
    await this.usersRepository.remove(user);
  }
}
