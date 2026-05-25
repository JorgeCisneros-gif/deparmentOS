// departments.dto.ts
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateDepartmentDto {
  @ApiProperty() @IsUUID() idEdificio: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() idPropietario?: string;
  @ApiProperty({ example: '201' }) @IsString() @IsNotEmpty() nrDepartamento: string;
  @ApiProperty({ example: 2 }) @IsNumber() @Min(1) piso: number;
}

export class UpdateDepartmentDto extends PartialType(CreateDepartmentDto) {
  @ApiPropertyOptional({ enum: ['activo', 'inactivo'] })
  @IsOptional() @IsIn(['activo', 'inactivo']) status?: string;
}
