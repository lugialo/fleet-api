import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Model } from '../models/entities/model.entity';
import { User } from '../users/entities/user.entity';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { Vehicle } from './entities/vehicle.entity';

@Injectable()
export class VehiclesService {
  constructor(
    @InjectRepository(Vehicle)
    private readonly vehiclesRepository: Repository<Vehicle>,
    @InjectRepository(Model)
    private readonly modelsRepository: Repository<Model>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async create(dto: CreateVehicleDto, userId: string): Promise<Vehicle> {
    const existingVehicle = await this.vehiclesRepository.findOneBy({
      plate: dto.plate,
    });

    if (existingVehicle) {
      throw new ConflictException('Veículo já cadastrado com esta placa.');
    }

    const model = await this.modelsRepository.findOneBy({
      id: dto.model_id,
    });

    if (!model) {
      throw new NotFoundException('Modelo não encontrado.');
    }

    const user = await this.usersRepository.findOneBy({
      id: userId,
    });

    if (!user) {
      throw new NotFoundException('Usuário criador não encontrado.');
    }

    const vehicle = this.vehiclesRepository.create({
      plate: dto.plate,
      color: dto.color,
      year: dto.year,
      model,
      created_by: user,
    });

    return this.vehiclesRepository.save(vehicle);
  }

  findAll(): Promise<Vehicle[]> {
    return this.vehiclesRepository.find();
  }

  async findOne(id: string): Promise<Vehicle> {
    const vehicle = await this.vehiclesRepository.findOneBy({ id });

    if (!vehicle) {
      throw new NotFoundException('Veículo não encontrado.');
    }

    return vehicle;
  }

  async update(id: string, dto: UpdateVehicleDto): Promise<Vehicle> {
    const vehicle = await this.findOne(id);

    if (dto.plate !== undefined) {
      vehicle.plate = dto.plate;
    }

    if (dto.color !== undefined) {
      vehicle.color = dto.color;
    }

    if (dto.year !== undefined) {
      vehicle.year = dto.year;
    }

    if (dto.model_id !== undefined) {
      const model = await this.modelsRepository.findOneBy({
        id: dto.model_id,
      });

      if (!model) {
        throw new NotFoundException('Modelo não encontrado.');
      }

      vehicle.model = model;
    }

    return this.vehiclesRepository.save(vehicle);
  }

  async remove(id: string): Promise<void> {
    const vehicle = await this.findOne(id);
    await this.vehiclesRepository.remove(vehicle);
  }
}
