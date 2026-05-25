// src/users/users.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { PasswordResetToken } from './password-reset.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PasswordResetService } from './password-reset.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, PasswordResetToken])],
  providers: [UsersService, PasswordResetService],
  controllers: [UsersController],
  exports: [UsersService, PasswordResetService],
})
export class UsersModule {}
