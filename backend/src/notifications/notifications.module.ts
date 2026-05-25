// src/notifications/notifications.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Fee } from '../fees/fee.entity';
import { MessageTemplate } from './message-template.entity';
import { PushSubscription } from './push-subscription.entity';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { PushService } from './push.service';
import { PushController } from './push.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Fee, MessageTemplate, PushSubscription])],
  providers: [NotificationsService, PushService],
  controllers: [NotificationsController, PushController],
  exports: [NotificationsService, PushService],
})
export class NotificationsModule {}
