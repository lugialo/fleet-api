import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Model } from '../models/entities/model.entity';
import { User } from '../users/entities/user.entity';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { Vehicle } from './entities/vehicle.entity';

const VEHICLES_LIST_CACHE_KEY = 'vehicles_list';

@Injectable()
export class VehiclesService {
  constructor(
    @InjectRepository(Vehicle)
    private readonly vehiclesRepository: Repository<Vehicle>,

    @InjectRepository(Model)
    private readonly modelsRepository: Repository<Model>,

    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,

    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,

    private readonly configService: ConfigService,
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

    const savedVehicle = await this.vehiclesRepository.save(vehicle);

    await this.invalidateVehiclesListCache();

    return savedVehicle;
  }

  async findAll(): Promise<Vehicle[]> {
    const cachedVehicles = await this.cacheManager.get<Vehicle[]>(
      VEHICLES_LIST_CACHE_KEY,
    );

    if (cachedVehicles) {
      return cachedVehicles;
    }

    const vehicles = await this.vehiclesRepository.find();

    const ttl = this.configService.get<number>('REDIS_TTL') ?? 3600;

    await this.cacheManager.set(VEHICLES_LIST_CACHE_KEY, vehicles, ttl * 1000);

    return vehicles;
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

    const updatedVehicle = await this.vehiclesRepository.save(vehicle);

    await this.invalidateVehiclesListCache();

    return updatedVehicle;
  }

  async remove(id: string): Promise<void> {
    const vehicle = await this.findOne(id);

    await this.vehiclesRepository.remove(vehicle);

    await this.invalidateVehiclesListCache();
  }

  private async invalidateVehiclesListCache(): Promise<void> {
    await this.cacheManager.del(VEHICLES_LIST_CACHE_KEY);
  }
}
