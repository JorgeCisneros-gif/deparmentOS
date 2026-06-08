// src/notificacion-tipo/notificacion-tipo.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificacionTipo } from './notificacion-tipo.entity';
import { NotificacionTipoService } from './notificacion-tipo.service';
import { NotificacionTipoController } from './notificacion-tipo.controller';

@Module({
  imports: [TypeOrmModule.forFeature([NotificacionTipo])],
  controllers: [NotificacionTipoController],
  providers: [NotificacionTipoService],
  exports: [NotificacionTipoService],
})
export class NotificacionTipoModule {}