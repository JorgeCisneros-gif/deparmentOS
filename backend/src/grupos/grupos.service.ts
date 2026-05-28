// src/grupos/grupos.service.ts
import {
  Injectable, NotFoundException, ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Grupo } from './grupo.entity';
import { CreateGrupoDto, UpdateGrupoDto } from './grupos.dto';

// UUID del SuperGrupo — cargado desde la BD al arrancar
// Se usa como valor de referencia para el supervisor
export const SUPERGRUPO_NOMBRE = 'SuperGrupo';

@Injectable()
export class GruposService {
  constructor(
    @InjectRepository(Grupo)
    private readonly repo: Repository<Grupo>,
  ) {}

  // ── CRUD ─────────────────────────────────────────────────────

  async create(dto: CreateGrupoDto, idAccount: string | null): Promise<Grupo> {
  // Solo validar duplicado si tiene cuenta asignada
  if (idAccount) {
    const existing = await this.repo.findOne({ where: { idAccount } });
    if (existing) {
      throw new ConflictException(
        'Esta cuenta ya tiene un grupo asignado. Solo se permite un grupo por cuenta.',
      );
    }
  }

  const grupo = this.repo.create({
    nombre:    dto.nombre,
    ruc:       dto.ruc       || null,
    direccion: dto.direccion || null,
    idAccount: idAccount || null,
    status:    'activo',
  });

  return this.repo.save(grupo);
}

  // Supervisor ve todos — administrador solo el suyo
  async findAll(idAccount?: string): Promise<Grupo[]> {
    if (idAccount) {
      return this.repo.find({
        where: { idAccount },
        relations: ['edificios'],
      });
    }
    // Supervisor — todos incluyendo SuperGrupo
    return this.repo.find({
      order: { createdAt: 'DESC' },
      relations: ['edificios'],
    });
  }

  async findOne(id: string): Promise<Grupo> {
    const g = await this.repo.findOne({
      where: { id },
      relations: ['edificios', 'edificios.departamentos'],
    });
    if (!g) throw new NotFoundException('Grupo no encontrado');
    return g;
  }

  // Obtener el grupo de una cuenta específica
  async findByAccount(idAccount: string): Promise<Grupo | null> {
    return this.repo.findOne({
      where: { idAccount },
      relations: ['edificios'],
    });
  }

  // Obtener el SuperGrupo
  async getSuperGrupo(): Promise<Grupo | null> {
    return this.repo.findOne({
      where: { nombre: SUPERGRUPO_NOMBRE },
      relations: ['edificios'],
    });
  }

  async update(id: string, dto: UpdateGrupoDto): Promise<Grupo> {
    const g = await this.findOne(id);
    Object.assign(g, dto);
    return this.repo.save(g);
  }

  // Vincular grupo a una cuenta (llamado desde AccountsController)
  async assignToAccount(grupoId: string, accountId: string): Promise<Grupo> {
    const g = await this.findOne(grupoId);
    g.idAccount = accountId;
    return this.repo.save(g);
  }

  async deactivate(id: string): Promise<Grupo> {
    const g = await this.findOne(id);
    g.status = 'inactivo';
    return this.repo.save(g);
  }

  // Stats de edificios y departamentos del grupo
  async getStats(id: string): Promise<any> {
    const grupo = await this.findOne(id);
    const totalEdificios  = grupo.edificios?.length || 0
    const totalDeptos     = grupo.edificios?.reduce(
      (sum, e) => sum + (e.departamentos?.length || 0), 0
    ) || 0

    return {
      id:              grupo.id,
      nombre:          grupo.nombre,
      totalEdificios,
      totalDeptos,
      edificios:       grupo.edificios,
    }
  }
}
