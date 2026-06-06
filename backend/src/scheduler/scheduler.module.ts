// src/scheduler/scheduler.module.ts
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationSchedulerService } from './notification-scheduler.service';
import { NotificacionConfig } from '../notificacion-config/notificacion-config.entity';
import { Fee } from '../fees/fee.entity';
import { Gasto } from '../gastos/gasto.entity';
import { User } from '../users/user.entity';
import { Receipt } from '../receipts/receipt.entity';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([
      NotificacionConfig,
      Fee,
      Gasto,
      User,
      Receipt,
    ]),
    NotificationsModule, // para PushService
  ],
  providers: [NotificationSchedulerService],
  exports:   [NotificationSchedulerService],
})
export class SchedulerModule {}
