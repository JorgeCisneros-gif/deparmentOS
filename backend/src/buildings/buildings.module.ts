// src/buildings/buildings.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Building } from './building.entity';
import { BuildingsService } from './buildings.service';
import { BuildingsController } from './buildings.controller';
import { AccountsModule } from '../accounts/accounts.module';
import { GruposModule } from '../grupos/grupos.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Building]),
    AccountsModule,
    GruposModule,
  ],
  controllers: [BuildingsController],
  providers:   [BuildingsService],
  exports:     [BuildingsService],
})
export class BuildingsModule {}
