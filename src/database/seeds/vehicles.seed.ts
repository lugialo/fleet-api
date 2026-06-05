import { NestFactory } from '@nestjs/core';
import { getRepositoryToken } from '@nestjs/typeorm';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Repository } from 'typeorm';
import { AppModule } from '../../app.module';
import { Brand } from '../../brands/entities/brand.entity';
import { BrandsService } from '../../brands/brands.service';
import { Model } from '../../models/entities/model.entity';
import { ModelsService } from '../../models/models.service';
import { UsersService } from '../../users/users.service';
import { Vehicle } from '../../vehicles/entities/vehicle.entity';
import { VehiclesService } from '../../vehicles/vehicles.service';

type SeedVehicle = {
  brand: string;
  model: string;
  fipe_code: string;
  plate: string;
  color: string;
  year: number;
};

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const usersService = app.get(UsersService);
  const brandsService = app.get(BrandsService);
  const modelsService = app.get(ModelsService);
  const vehiclesService = app.get(VehiclesService);
  const brandsRepository = app.get<Repository<Brand>>(
    getRepositoryToken(Brand),
  );
  const modelsRepository = app.get<Repository<Model>>(
    getRepositoryToken(Model),
  );
  const vehiclesRepository = app.get<Repository<Vehicle>>(
    getRepositoryToken(Vehicle),
  );

  const user = await usersService.findByNicknameWithPassword('aivacol');

  if (!user) {
    throw new Error('Execute npm run seed:user antes de inserir veículos.');
  }

  const seedPath = join(process.cwd(), 'seed_vehicles.json');
  const vehicles = JSON.parse(readFileSync(seedPath, 'utf8')) as SeedVehicle[];

  for (const item of vehicles) {
    let brand = await brandsRepository.findOneBy({ name: item.brand });

    if (!brand) {
      brand = await brandsService.create({ name: item.brand }, user.id);
    }

    let model = await modelsRepository.findOne({
      where: {
        name: item.model,
        brand: { id: brand.id },
      },
    });

    if (!model) {
      model = await modelsService.create(
        {
          name: item.model,
          fipe_code: item.fipe_code,
          brand_id: brand.id,
        },
        user.id,
      );
    }

    const existingVehicle = await vehiclesRepository.findOneBy({
      plate: item.plate,
    });

    if (existingVehicle) {
      console.log(`Veículo ${item.plate} já existe.`);
      continue;
    }

    await vehiclesService.create(
      {
        plate: item.plate,
        color: item.color,
        year: item.year,
        model_id: model.id,
      },
      user.id,
    );

    console.log(`Veículo ${item.plate} criado.`);
  }

  await app.close();
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
