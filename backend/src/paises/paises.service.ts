// src/paises/paises.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pais } from './pais.entity';

@Injectable()
export class PaisesService {
  constructor(
    @InjectRepository(Pais)
    private readonly repo: Repository<Pais>,
  ) {}

  findAll() {
    return this.repo.find({ where: { activo: true }, order: { nombre: 'ASC' } });
  }

  findByCodigo(codigo: string) {
    return this.repo.findOne({ where: { codigo, activo: true } });
  }
}
