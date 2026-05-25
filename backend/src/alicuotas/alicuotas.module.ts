// src/alicuotas/alicuotas.module.ts
import { Module }          from '@nestjs/common';
import { TypeOrmModule }   from '@nestjs/typeorm';
import { Alicuota }        from './alicuota.entity';
import { Department }      from '../departments/department.entity';
import { AlicuotasService }    from './alicuotas.service';
import { AlicuotasController } from './alicuotas.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Alicuota, Department])],
  providers:   [AlicuotasService],
  controllers: [AlicuotasController],
  exports:     [AlicuotasService],
})
export class AlicuotasModule {}
