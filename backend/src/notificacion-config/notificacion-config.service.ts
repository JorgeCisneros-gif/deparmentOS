// src/notificacion-config/notificacion-config.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificacionConfig } from './notificacion-config.entity';
import { NotificacionTipo } from '../notificacion-tipo/notificacion-tipo.entity';
import { UpsertNotificacionConfigDto } from './notificacion-config.dto';

@Injectable()
export class NotificacionConfigService {
  constructor(
    @InjectRepository(NotificacionConfig)
    private readonly repo: Repository<NotificacionConfig>,
    @InjectRepository(NotificacionTipo)
    private readonly tipoRepo: Repository<NotificacionTipo>,
  ) {}

  // Devuelve configuración de un edificio con todos los tipos activos
  // Si no existe config para un tipo, devuelve defaults
  async getByEdificio(idEdificio: string): Promise<any[]> {
    const tipos  = await this.tipoRepo.find({ where: { activo: true }, order: { orden: 'ASC' } });
    const configs = await this.repo.find({ where: { idEdificio }, relations: ['tipo'] });

    const configByTipo: Record<string, NotificacionConfig> = {};
    configs.forEach(c => { configByTipo[c.idTipo] = c });

    // Devolver los 4 tipos con su config o defaults
    return tipos.map(tipo => {
      const config = configByTipo[tipo.id];
      return {
        idTipo:        tipo.id,
        tipo:          { id: tipo.id, codigo: tipo.codigo, nombre: tipo.nombre, descripcion: tipo.descripcion, destinatarios: tipo.destinatarios },
        activo:        config?.activo        ?? false,
        cronExpresion: config?.cronExpresion ?? '0 9 * * *',
        diasOffset:    config?.diasOffset    ?? 0,
        configId:      config?.id            ?? null,
      };
    });
  }

  // Upsert de una configuración específica
  async upsert(idEdificio: string, dto: UpsertNotificacionConfigDto): Promise<NotificacionConfig> {
    const existing = await this.repo.findOne({
      where: { idEdificio, idTipo: dto.idTipo },
    });

    if (existing) {
      existing.activo        = dto.activo;
      existing.cronExpresion = dto.cronExpresion;
      existing.diasOffset    = dto.diasOffset ?? existing.diasOffset;
      return this.repo.save(existing);
    }

    return this.repo.save(
      this.repo.create({
        idEdificio,
        idTipo:        dto.idTipo,
        activo:        dto.activo,
        cronExpresion: dto.cronExpresion,
        diasOffset:    dto.diasOffset ?? 0,
      }),
    );
  }

  // Bulk upsert — guardar todas las configs del edificio a la vez
  async bulkUpsert(idEdificio: string, configs: UpsertNotificacionConfigDto[]): Promise<any[]> {
    await Promise.all(configs.map(c => this.upsert(idEdificio, c)));
    return this.getByEdificio(idEdificio);
  }

  // Para el scheduler — obtener todas las configs activas con su tipo
  async getAllActivas(): Promise<NotificacionConfig[]> {
    return this.repo.find({
      where: { activo: true },
      relations: ['tipo'],
    });
  }

  // Para el scheduler — filtrar por código de tipo
  async getActivasByCodigo(codigo: string): Promise<NotificacionConfig[]> {
    return this.repo
      .createQueryBuilder('nc')
      .innerJoinAndSelect('nc.tipo', 'nt')
      .where('nc.activo = true')
      .andWhere('nt.codigo = :codigo', { codigo })
      .andWhere('nt.activo = true')
      .getMany();
  }
}
