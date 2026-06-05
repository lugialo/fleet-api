import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Brand } from '../brands/entities/brand.entity';
import { User } from '../users/entities/user.entity';
import { CreateModelDto } from './dto/create-model.dto';
import { UpdateModelDto } from './dto/update-model.dto';
import { Model } from './entities/model.entity';

@Injectable()
export class ModelsService {
  constructor(
    @InjectRepository(Model)
    private readonly modelsRepository: Repository<Model>,
    @InjectRepository(Brand)
    private readonly brandsRepository: Repository<Brand>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async create(dto: CreateModelDto, userId: string): Promise<Model> {
    const brand = await this.brandsRepository.findOneBy({
      id: dto.brand_id,
    });

    if (!brand) {
      throw new NotFoundException('Marca não encontrada.');
    }

    const user = await this.usersRepository.findOneBy({
      id: userId,
    });

    if (!user) {
      throw new NotFoundException('Usuário criador não encontrado.');
    }

    const existingModel = await this.modelsRepository.findOne({
      where: {
        name: dto.name,
        brand: { id: dto.brand_id },
      },
    });

    if (existingModel) {
      throw new ConflictException('Modelo já cadastrado para esta marca.');
    }

    const model = this.modelsRepository.create({
      name: dto.name,
      fipe_code: dto.fipe_code,
      brand,
      created_by: user,
    });

    return this.modelsRepository.save(model);
  }

  findAll(): Promise<Model[]> {
    return this.modelsRepository.find();
  }

  async findOne(id: string): Promise<Model> {
    const model = await this.modelsRepository.findOneBy({ id });

    if (!model) {
      throw new NotFoundException('Modelo não encontrado.');
    }

    return model;
  }

  async update(id: string, dto: UpdateModelDto): Promise<Model> {
    const model = await this.findOne(id);

    if (dto.name !== undefined) {
      model.name = dto.name;
    }

    if (dto.fipe_code !== undefined) {
      model.fipe_code = dto.fipe_code;
    }

    if (dto.brand_id !== undefined) {
      const brand = await this.brandsRepository.findOneBy({
        id: dto.brand_id,
      });

      if (!brand) {
        throw new NotFoundException('Marca não encontrada.');
      }

      model.brand = brand;
    }

    return this.modelsRepository.save(model);
  }

  async remove(id: string): Promise<void> {
    const model = await this.findOne(id);
    await this.modelsRepository.remove(model);
  }
}
