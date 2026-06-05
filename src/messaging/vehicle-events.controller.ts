import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { VEHICLE_CREATED_EVENT } from './messaging.constants';
import type { VehicleCreatedEvent } from './messaging.service';

@Controller()
export class VehicleEventsController {
  private readonly logger = new Logger(VehicleEventsController.name);

  @EventPattern(VEHICLE_CREATED_EVENT)
  handleVehicleCreated(@Payload() event: VehicleCreatedEvent): void {
    this.logger.log(
      `Evento vehicle_created recebido: vehicle=${event.vehicle_id}, plate=${event.plate}`,
    );
  }
}
