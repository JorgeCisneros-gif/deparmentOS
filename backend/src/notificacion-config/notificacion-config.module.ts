// src/notificacion-config/notificacion-config.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificacionConfig } from './notificacion-config.entity';
import { NotificacionTipo } from '../notificacion-tipo/notificacion-tipo.entity';
import { NotificacionConfigService } from './notificacion-config.service';
import { NotificacionConfigController } from './notificacion-config.controller';

@Module({
  imports: [TypeOrmModule.forFeature([NotificacionConfig, NotificacionTipo])],
  controllers: [NotificacionConfigController],
  providers: [NotificacionConfigService],
  exports: [NotificacionConfigService],
})
export class NotificacionConfigModule {}
