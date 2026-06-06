// src/notificacion-config/notificacion-config.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificacionConfig, TipoNotificacion } from './notificacion-config.entity';
import { UpsertNotificacionConfigDto } from './notificacion-config.dto';

// Configuración por defecto para cada tipo al inicializarse
const DEFAULTS: Record<TipoNotificacion, Partial<NotificacionConfig>> = {
  [TipoNotificacion.VENCIMIENTO_PAGO]: {
    activo: false, horaEnvio: '09:00', diasOffset: 2,
    diaMes: null, destinatariosGestion: null,
  },
  [TipoNotificacion.GASTOS_GENERALES]: {
    activo: false, horaEnvio: '09:00', diasOffset: 1,
    diaMes: null, destinatariosGestion: null,
  },
  [TipoNotificacion.RECOLECCION_MEDICION]: {
    activo: false, horaEnvio: '08:00', diasOffset: 0,
    diaMes: 1, destinatariosGestion: 'ambos' as any,
  },
  [TipoNotificacion.VENCIMIENTO_SERVICIO]: {
    activo: false, horaEnvio: '08:00', diasOffset: 0,
    diaMes: null, destinatariosGestion: 'ambos' as any,
  },
};

@Injectable()
export class NotificacionConfigService {
  constructor(
    @InjectRepository(NotificacionConfig)
    private readonly repo: Repository<NotificacionConfig>,
  ) {}

  // Devuelve las 4 configuraciones del grupo (crea defaults si no existen)
  async getByGrupo(idGrupo: string): Promise<NotificacionConfig[]> {
    const existing = await this.repo.find({ where: { idGrupo } });
    const existingTipos = existing.map(c => c.tipo);
    const allTipos = Object.values(TipoNotificacion);

    // Crear defaults para los tipos que no existen
    const missing = allTipos.filter(t => !existingTipos.includes(t));
    if (missing.length > 0) {
      const toCreate = missing.map(tipo =>
        this.repo.create({ idGrupo, tipo, ...DEFAULTS[tipo] }),
      );
      const saved = await this.repo.save(toCreate);
      return [...existing, ...saved].sort((a, b) => a.tipo.localeCompare(b.tipo));
    }

    return existing.sort((a, b) => a.tipo.localeCompare(b.tipo));
  }

  // Upsert de una configuración específica
  async upsert(idGrupo: string, dto: UpsertNotificacionConfigDto): Promise<NotificacionConfig> {
    const existing = await this.repo.findOne({
      where: { idGrupo, tipo: dto.tipo },
    });

    if (existing) {
      Object.assign(existing, {
        activo:                dto.activo,
        horaEnvio:             dto.horaEnvio,
        diasOffset:            dto.diasOffset ?? existing.diasOffset,
        diaMes:                dto.diaMes ?? existing.diaMes,
        destinatariosGestion:  dto.destinatariosGestion ?? existing.destinatariosGestion,
      });
      return this.repo.save(existing);
    }

    return this.repo.save(
      this.repo.create({
        idGrupo,
        tipo:                 dto.tipo,
        activo:               dto.activo,
        horaEnvio:            dto.horaEnvio,
        diasOffset:           dto.diasOffset ?? DEFAULTS[dto.tipo].diasOffset ?? 0,
        diaMes:               dto.diaMes ?? DEFAULTS[dto.tipo].diaMes ?? null,
        destinatariosGestion: dto.destinatariosGestion ?? DEFAULTS[dto.tipo].destinatariosGestion ?? null,
      }),
    );
  }

  // Bulk upsert de todas las configuraciones del grupo
  async bulkUpsert(idGrupo: string, configs: UpsertNotificacionConfigDto[]): Promise<NotificacionConfig[]> {
    return Promise.all(configs.map(c => this.upsert(idGrupo, c)));
  }

  // Usado por el scheduler — obtiene TODAS las configs activas
  async getAllActivas(): Promise<NotificacionConfig[]> {
    return this.repo.find({ where: { activo: true }, relations: ['grupo'] });
  }

  // Usado por el scheduler — filtra por tipo
  async getActivasByTipo(tipo: TipoNotificacion): Promise<NotificacionConfig[]> {
    return this.repo.find({ where: { activo: true, tipo }, relations: ['grupo'] });
  }
}
