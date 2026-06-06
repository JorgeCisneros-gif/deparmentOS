// src/notificacion-config/notificacion-config.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificacionConfig } from './notificacion-config.entity';
import { NotificacionConfigService } from './notificacion-config.service';
import { NotificacionConfigController } from './notificacion-config.controller';

@Module({
  imports: [TypeOrmModule.forFeature([NotificacionConfig])],
  controllers: [NotificacionConfigController],
  providers: [NotificacionConfigService],
  exports: [NotificacionConfigService], // exportado para que el scheduler lo use
})
export class NotificacionConfigModule {}
