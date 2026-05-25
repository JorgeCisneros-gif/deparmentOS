// src/propietarios/propietarios.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Propietario } from './propietario.entity';
import { PropietariosService } from './propietarios.service';
import { PropietariosController } from './propietarios.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Propietario])],
  providers: [PropietariosService],
  controllers: [PropietariosController],
  exports: [PropietariosService],
})
export class PropietariosModule {}
