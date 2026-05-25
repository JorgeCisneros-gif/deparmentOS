import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString,
  IsUUID, MinLength, IsBoolean,
} from 'class-validator';
import { UserRole } from './user.entity';

export class CreateUserDto {
  @ApiProperty({ example: 'angela@email.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Pass@1234', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ enum: UserRole, example: UserRole.PROPIETARIO })
  @IsEnum(UserRole)
  role: UserRole;

  @ApiPropertyOptional({ description: 'UUID del edificio (requerido para supervisor)' })
  @IsOptional()
  @IsUUID()
  idEdificio?: string;

  @ApiPropertyOptional({ description: 'UUID del departamento (requerido para propietario)' })
  @IsOptional()
  @IsUUID()
  idDepartamento?: string;

  @ApiPropertyOptional({ description: 'UUID del propietario vinculado' })
  @IsOptional()
  @IsUUID()
  idPropietario?: string;
}

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  newPassword: string;
}
