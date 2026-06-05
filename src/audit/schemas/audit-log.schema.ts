import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type AuditLogDocument = HydratedDocument<AuditLog>;

@Schema({ collection: 'audit_logs' })
export class AuditLog {
  @Prop()
  user_id?: string;

  @Prop()
  user_nickname?: string;

  @Prop({ required: true })
  method!: string;

  @Prop({ required: true })
  route!: string;

  @Prop({ type: Object })
  payload?: Record<string, unknown>;

  @Prop()
  status_code?: number;

  @Prop()
  error_message?: string;

  @Prop({ required: true })
  created_at!: Date;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);
