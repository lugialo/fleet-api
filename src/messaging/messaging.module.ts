import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { RABBITMQ_CLIENT, RABBITMQ_QUEUE } from './messaging.constants';
import { MessagingService } from './messaging.service';
import { VehicleEventsController } from './vehicle-events.controller';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: RABBITMQ_CLIENT,
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [
              `amqp://${configService.get<string>('RABBITMQ_USER')}:${configService.get<string>('RABBITMQ_PASSWORD')}@${configService.get<string>('RABBITMQ_HOST') ?? 'localhost'}:${configService.get<number>('RABBITMQ_PORT') ?? 5672}`,
            ],
            queue: RABBITMQ_QUEUE,
            queueOptions: {
              durable: false,
            },
          },
        }),
      },
    ]),
  ],
  controllers: [VehicleEventsController],
  providers: [MessagingService],
  exports: [MessagingService],
})
export class MessagingModule {}
