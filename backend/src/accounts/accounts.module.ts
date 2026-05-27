import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Account } from './account.entity';
import { AccountsService } from './accounts.service';
import { AccountsController } from './accounts.controller';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Account]),
    UsersModule,
  ],
  controllers: [AccountsController],
  providers:   [AccountsService],
  exports:     [AccountsService],
})
export class AccountsModule {}
