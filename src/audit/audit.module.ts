import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditService } from './audit.service';
import { AuditLog, AuditLogSchema } from './schemas/audit-log.schema';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const username = configService.get<string>('MONGO_USERNAME');
        const password = configService.get<string>('MONGO_PASSWORD');
        const host = configService.get<string>('MONGO_HOST') ?? 'localhost';
        const port = configService.get<number>('MONGO_PORT') ?? 27017;
        const database =
          configService.get<string>('MONGO_DATABASE') ?? 'fleet_audit';

        return {
          uri: `mongodb://${username}:${password}@${host}:${port}/${database}?authSource=admin`,
        };
      },
    }),
    MongooseModule.forFeature([
      {
        name: AuditLog.name,
        schema: AuditLogSchema,
      },
    ]),
  ],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
