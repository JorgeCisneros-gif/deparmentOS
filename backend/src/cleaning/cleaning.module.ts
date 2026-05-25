import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CleaningProvider, CleaningArea, CleaningRecord } from './cleaning.entities';
import { CleaningService } from './cleaning.service';
import { CleaningController } from './cleaning.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CleaningProvider, CleaningArea, CleaningRecord])],
  providers: [CleaningService],
  controllers: [CleaningController],
  exports: [CleaningService],
})
export class CleaningModule {}
