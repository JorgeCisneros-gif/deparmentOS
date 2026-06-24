// src/scheduler/scheduler.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationSchedulerService } from './notification-scheduler.service';
import { MeterImagesSchedulerService } from './meter-images-scheduler.service';
import { NotificacionConfig } from '../notificacion-config/notificacion-config.entity';
import { Fee } from '../fees/fee.entity';
import { GastoExtra } from '../gastos/gasto-extra.entity';
import { User } from '../users/user.entity';
import { Receipt } from '../receipts/receipt.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { ReadingsModule } from '../readings/readings.module';

/**
 * Centraliza todos los jobs/schedulers de la aplicación.
 *
 * Schedulers actuales:
 *  - NotificationSchedulerService: notificaciones push (cada 60s)
 *  - MeterImagesSchedulerService: housekeeping fotos medidores (diario 3 AM)
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([NotificacionConfig, Fee, GastoExtra, User, Receipt]),
    NotificationsModule,
    ReadingsModule, // Para inyectar ReadingsService en MeterImagesScheduler
  ],
  providers: [
    NotificationSchedulerService,
    MeterImagesSchedulerService,
  ],
  exports: [
    NotificationSchedulerService,
    MeterImagesSchedulerService,
  ],
})
export class SchedulerModule {}
