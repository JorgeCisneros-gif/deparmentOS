// src/receipts/receipts.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Receipt } from './receipt.entity';
import { ReceiptsService } from './receipts.service';
import { ReceiptsController } from './receipts.controller';
import { Service } from '../services/service.entity';
import { Building } from '../buildings/building.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Receipt, Service, Building])],
  providers: [ReceiptsService],
  controllers: [ReceiptsController],
  exports: [ReceiptsService],
})
export class ReceiptsModule {}
