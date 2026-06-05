import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { UsersService } from '../../users/users.service';

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const usersService = app.get(UsersService);

  const existingUser = await usersService.findByNicknameWithPassword('aivacol');

  if (!existingUser) {
    await usersService.create({
      nickname: 'aivacol',
      name: 'Aivacol',
      email: 'aivacol@email.com',
      password: 'aivacol123',
    });

    console.log('Usuário padrão do seed criado.');
  } else {
    console.log('Usuário padrão do seed já existe.');
  }

  await app.close();
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
