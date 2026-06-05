import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { RABBITMQ_CLIENT, VEHICLE_CREATED_EVENT } from './messaging.constants';

export type VehicleCreatedEvent = {
  vehicle_id: string;
  plate: string;
  model_id: string;
  created_by: string;
  created_at: string;
};

@Injectable()
export class MessagingService {
  constructor(
    @Inject(RABBITMQ_CLIENT)
    private readonly rabbitMqClient: ClientProxy,
  ) {}

  emitVehicleCreated(event: VehicleCreatedEvent): void {
    this.rabbitMqClient.emit(VEHICLE_CREATED_EVENT, event);
  }
}
