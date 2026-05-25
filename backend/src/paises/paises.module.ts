// src/paises/paises.module.ts
import { Module }           from '@nestjs/common';
import { TypeOrmModule }    from '@nestjs/typeorm';
import { Pais }             from './pais.entity';
import { PaisesService }    from './paises.service';
import { PaisesController } from './paises.controller';

@Module({
  imports:     [TypeOrmModule.forFeature([Pais])],
  providers:   [PaisesService],
  controllers: [PaisesController],
  exports:     [PaisesService],
})
export class PaisesModule {}
