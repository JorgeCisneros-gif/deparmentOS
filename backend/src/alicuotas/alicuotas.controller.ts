// src/alicuotas/alicuotas.controller.ts
import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery, ApiBody } from '@nestjs/swagger';
import { AlicuotasService } from './alicuotas.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';
import { IsArray, IsNumber, IsUUID, Max, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class AlicuotaLineaDto {
  @ApiProperty() @IsUUID()
  idDepartamento: string;

  @ApiProperty({ example: 25.0 }) @IsNumber() @Min(0) @Max(100)
  porcentaje: number;
}

class SaveAlicuotasDto {
  @ApiProperty({ type: [AlicuotaLineaDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AlicuotaLineaDto)
  lineas: AlicuotaLineaDto[];
}

@ApiTags('Alicuotas')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMINISTRADOR)
@Controller('alicuotas')
export class AlicuotasController {
  constructor(private readonly svc: AlicuotasService) {}

  // Obtener alícuotas de un servicio para un período
  // Devuelve todos los deptos con su valor actual y el último valor conocido
  @Get()
  @ApiOperation({ summary: 'Ver alícuotas de un servicio para un período' })
  @ApiQuery({ name: 'servicioId',  required: true })
  @ApiQuery({ name: 'edificioId',  required: true })
  @ApiQuery({ name: 'month',       required: true, type: Number })
  @ApiQuery({ name: 'year',        required: true, type: Number })
  getForPeriod(
    @Query('servicioId') servicioId: string,
    @Query('edificioId') edificioId: string,
    @Query('month')      month: number,
    @Query('year')       year:  number,
  ) {
    return this.svc.getForPeriod(servicioId, edificioId, +month, +year);
  }

  // Guardar alícuotas de un período
  @Post()
  @ApiOperation({ summary: 'Guardar alícuotas de un período (upsert por depto)' })
  @ApiQuery({ name: 'servicioId', required: true })
  @ApiQuery({ name: 'month',      required: true, type: Number })
  @ApiQuery({ name: 'year',       required: true, type: Number })
  @ApiBody({ type: SaveAlicuotasDto })
  saveForPeriod(
    @Query('servicioId') servicioId: string,
    @Query('month')      month: number,
    @Query('year')       year:  number,
    @Body() dto: SaveAlicuotasDto,
  ) {
    return this.svc.saveForPeriod(servicioId, +month, +year, dto.lineas);
  }
}
