import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditLog } from './schemas/audit-log.schema';

export type CreateAuditLogInput = {
  user_id?: string;
  user_nickname?: string;
  method: string;
  route: string;
  payload?: Record<string, unknown>;
  status_code?: number;
  error_message?: string;
};

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectModel(AuditLog.name)
    private readonly auditLogModel: Model<AuditLog>,
  ) {}

  async create(input: CreateAuditLogInput): Promise<void> {
    try {
      await this.auditLogModel.create({
        ...input,
        created_at: new Date(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Falha ao gravar auditoria: ${message}`);
    }
  }
}
