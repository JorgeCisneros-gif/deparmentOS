// src/paises/paises.controller.ts
import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PaisesService } from './paises.service';

@ApiTags('Paises')
@Controller('paises')
export class PaisesController {
  constructor(private readonly svc: PaisesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar países con zonas horarias disponibles' })
  findAll() { return this.svc.findAll(); }

  @Get(':codigo')
  @ApiOperation({ summary: 'Obtener país por código (PE, CL, AR...)' })
  findOne(@Param('codigo') codigo: string) {
    return this.svc.findByCodigo(codigo.toUpperCase());
  }
}
