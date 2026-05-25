import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GastoExtra } from './gasto-extra.entity';
import { PagoGasto } from './pago-gasto.entity';
import { Department } from '../departments/department.entity';
import { GastosService } from './gastos.service';
import { GastosController } from './gastos.controller';
import { SharedModule } from '../shared/shared.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([GastoExtra, PagoGasto, Department]),
    SharedModule,
  ],
  providers: [GastosService],
  controllers: [GastosController],
  exports: [GastosService],
})
export class GastosModule {}
