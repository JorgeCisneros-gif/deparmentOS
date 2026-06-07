// src/scheduler/scheduler.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationSchedulerService } from './notification-scheduler.service';
import { NotificacionConfig } from '../notificacion-config/notificacion-config.entity';
import { Fee } from '../fees/fee.entity';
import { GastoExtra } from '../gastos/gasto-extra.entity';
import { User } from '../users/user.entity';
import { Receipt } from '../receipts/receipt.entity';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([NotificacionConfig, Fee, GastoExtra, User, Receipt]),
    NotificationsModule,
  ],
  providers: [NotificationSchedulerService],
  exports:   [NotificationSchedulerService],
})
export class SchedulerModule {}
