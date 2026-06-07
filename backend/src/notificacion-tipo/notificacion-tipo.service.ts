// src/notificacion-tipo/notificacion-tipo.service.ts
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificacionTipo } from './notificacion-tipo.entity';
import { CreateNotificacionTipoDto, UpdateNotificacionTipoDto } from './notificacion-tipo.dto';

@Injectable()
export class NotificacionTipoService {
  constructor(
    @InjectRepository(NotificacionTipo)
    private readonly repo: Repository<NotificacionTipo>,
  ) {}

  // Todos los tipos — incluyendo inactivos (para mantenimiento)
  findAll(soloActivos = false): Promise<NotificacionTipo[]> {
    return this.repo.find({
      where: soloActivos ? { activo: true } : {},
      order: { orden: 'ASC', nombre: 'ASC' },
    });
  }

  async findOne(id: string): Promise<NotificacionTipo> {
    const tipo = await this.repo.findOne({ where: { id } });
    if (!tipo) throw new NotFoundException('Tipo de notificación no encontrado');
    return tipo;
  }

  async create(dto: CreateNotificacionTipoDto): Promise<NotificacionTipo> {
    const exists = await this.repo.findOne({ where: { codigo: dto.codigo } });
    if (exists) throw new ConflictException(`Ya existe un tipo con código "${dto.codigo}"`);
    return this.repo.save(this.repo.create(dto));
  }

  async update(id: string, dto: UpdateNotificacionTipoDto): Promise<NotificacionTipo> {
    const tipo = await this.findOne(id);
    Object.assign(tipo, dto);
    return this.repo.save(tipo);
  }

  async toggleActivo(id: string): Promise<NotificacionTipo> {
    const tipo = await this.findOne(id);
    tipo.activo = !tipo.activo;
    return this.repo.save(tipo);
  }
}
