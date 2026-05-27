import {
  IsString, IsEmail, IsEnum, IsOptional,
  IsDateString, IsInt, Min, MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { SubscriptionPlan } from './account.entity';

export class CreateAccountDto {
  @ApiProperty({ example: 'Edificio Los Pinos' })
  @IsString()
  nombre: string;

  @ApiProperty({ example: 'admin@edificio.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ enum: SubscriptionPlan, example: SubscriptionPlan.DEMO })
  @IsEnum(SubscriptionPlan)
  plan: SubscriptionPlan;

  @ApiPropertyOptional({ example: '2025-12-31' })
  @IsOptional()
  @IsDateString()
  subscriptionEnd?: string;

  // Credenciales del primer usuario administrador de la cuenta
  @ApiProperty({ example: 'adminpass123' })
  @IsString()
  @MinLength(8)
  adminPassword: string;
}

export class UpdateAccountDto extends PartialType(CreateAccountDto) {
  @ApiPropertyOptional({ enum: SubscriptionPlan })
  @IsOptional()
  @IsEnum(SubscriptionPlan)
  plan?: SubscriptionPlan;

  @ApiPropertyOptional({ example: '2025-12-31' })
  @IsOptional()
  @IsDateString()
  subscriptionEnd?: string;

  @ApiPropertyOptional({ example: 'active' })
  @IsOptional()
  @IsString()
  status?: string;
}

export class ResetAccountPasswordDto {
  @ApiProperty({ example: 'newpassword123' })
  @IsString()
  @MinLength(8)
  newPassword: string;
}
