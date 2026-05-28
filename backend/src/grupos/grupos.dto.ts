// src/grupos/grupos.dto.ts
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString, IsOptional, MinLength, IsEnum, IsDateString, IsEmail,
} from 'class-validator';
import { SubscriptionPlan } from './grupo.entity';

export class CreateGrupoDto {
  @ApiProperty({ example: 'Inmobiliaria Los Pinos S.A.' })
  @IsString()
  @MinLength(2)
  nombre: string;

  @ApiPropertyOptional({ example: '20123456789' })
  @IsOptional()
  @IsString()
  ruc?: string;

  @ApiPropertyOptional({ example: 'Av. Principal 123' })
  @IsOptional()
  @IsString()
  direccion?: string;

  @ApiPropertyOptional({ enum: SubscriptionPlan, default: SubscriptionPlan.DEMO })
  @IsOptional()
  @IsEnum(SubscriptionPlan)
  plan?: SubscriptionPlan;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @IsDateString()
  subscriptionEnd?: string;

  // Admin que se crea junto con el grupo
  @ApiProperty({ example: 'admin@empresa.com' })
  @IsEmail()
  adminEmail: string;

  @ApiProperty({ example: 'Pass@1234' })
  @IsString()
  @MinLength(8)
  adminPassword: string;
}

export class UpdateGrupoDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nombre?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ruc?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  direccion?: string;
}

export class UpdateSuscripcionDto {
  @ApiPropertyOptional({ enum: SubscriptionPlan })
  @IsOptional()
  @IsEnum(SubscriptionPlan)
  plan?: SubscriptionPlan;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @IsDateString()
  subscriptionEnd?: string;
}

export class CreateGrupoAdminDto {
  @ApiProperty({ example: 'admin@empresa.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Pass@1234' })
  @IsString()
  @MinLength(8)
  password: string;
}

export class ResetGrupoUserPasswordDto {
  @ApiProperty({ example: 'NuevaPass@123' })
  @IsString()
  @MinLength(8)
  newPassword: string;
}
