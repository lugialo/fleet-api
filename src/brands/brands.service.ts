import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { Brand } from './entities/brand.entity';

@Injectable()
export class BrandsService {
  constructor(
    @InjectRepository(Brand)
    private readonly brandsRepository: Repository<Brand>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async create(dto: CreateBrandDto, userId: string): Promise<Brand> {
    const exists = await this.brandsRepository.findOneBy({ name: dto.name });

    if (exists) {
      throw new ConflictException('Marca já cadastrada.');
    }

    const user = await this.usersRepository.findOneBy({ id: userId });

    if (!user) {
      throw new NotFoundException('Usuário criador não encontrado.');
    }

    const brand = this.brandsRepository.create({
      name: dto.name,
      created_by: user,
    });

    return this.brandsRepository.save(brand);
  }

  findAll(): Promise<Brand[]> {
    return this.brandsRepository.find();
  }

  async findOne(id: string): Promise<Brand> {
    const brand = await this.brandsRepository.findOneBy({ id });

    if (!brand) {
      throw new NotFoundException('Marca não encontrada.');
    }

    return brand;
  }

  async update(id: string, dto: UpdateBrandDto): Promise<Brand> {
    const brand = await this.findOne(id);

    if (dto.name !== undefined) {
      brand.name = dto.name;
    }

    return this.brandsRepository.save(brand);
  }

  async remove(id: string): Promise<void> {
    const brand = await this.findOne(id);
    await this.brandsRepository.remove(brand);
  }
}
