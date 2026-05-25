// src/services/services.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Service } from './service.entity';
import { CreateServiceDto, UpdateServiceDto } from './services.dto';

@Injectable()
export class ServicesService {
  constructor(
    @InjectRepository(Service)
    private readonly repo: Repository<Service>,
  ) {}

  create(dto: CreateServiceDto) {
    return this.repo.save(this.repo.create(dto));
  }

  // Devuelve TODOS los servicios del edificio (activos globalmente).
  // El control por edificio se hace mediante edificio.serviciosActivos,
  // no mediante el campo activo de esta tabla.
  findAll(idEdificio?: string) {
    const where: any = { activo: true };
    if (idEdificio) where.idEdificio = idEdificio;
    return this.repo.find({ where, order: { tipo: 'ASC' } });
  }

  async findOne(id: string) {
    const s = await this.repo.findOne({ where: { id } });
    if (!s) throw new NotFoundException('Servicio no encontrado');
    return s;
  }

  async update(id: string, dto: UpdateServiceDto) {
    const s = await this.findOne(id);
    Object.assign(s, dto);
    return this.repo.save(s);
  }

  async remove(id: string): Promise<{ message: string }> {
    const s = await this.findOne(id);
    // Desactivar en vez de eliminar para no romper referencias históricas
    s.activo = false;
    await this.repo.save(s);
    return { message: `Servicio "${s.nombreServicio}" desactivado correctamente` };
  }
}
