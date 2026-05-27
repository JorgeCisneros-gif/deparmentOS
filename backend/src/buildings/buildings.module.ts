import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Building } from './building.entity';
import { BuildingsService } from './buildings.service';
import { BuildingsController } from './buildings.controller';
import { AccountsModule } from '../accounts/accounts.module';  // ← agregar

@Module({
  imports: [
    TypeOrmModule.forFeature([Building]),
    AccountsModule,   // ← agregar
  ],
  controllers: [BuildingsController],
  providers:   [BuildingsService],
  exports:     [BuildingsService],
})
export class BuildingsModule {}