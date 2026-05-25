// src/propietarios/propietarios.service.ts
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Propietario } from './propietario.entity';
import { CreatePropietarioDto, UpdatePropietarioDto } from './propietarios.dto';

@Injectable()
export class PropietariosService {
  constructor(
    @InjectRepository(Propietario)
    private readonly repo: Repository<Propietario>,
  ) {}

  async create(dto: CreatePropietarioDto & { idDepartamento?: string }): Promise<Propietario> {
    const { idDepartamento, ...propData } = dto as any;
    const entity = this.repo.create(propData);
    const saved  = (await this.repo.save(entity) as unknown) as Propietario;

    // Si viene idDepartamento, vincular propietario al departamento
    if (idDepartamento) {
      await this.repo.query(
        `UPDATE departamentos SET id_propietario = $1 WHERE id = $2`,
        [saved.id, idDepartamento],
      );
    }
    return saved;
  }

  findAll(status?: string): Promise<Propietario[]> {
    const where: any = status ? { status } : {};
    return this.repo.find({ where, order: { nombre: 'ASC' } });
  }

  async findOne(id: string): Promise<Propietario> {
    const p = await this.repo.findOne({ where: { id } });
    if (!p) throw new NotFoundException('Propietario no encontrado');
    return p;
  }

  async update(id: string, dto: UpdatePropietarioDto): Promise<Propietario> {
    const p = await this.findOne(id);
    Object.assign(p, dto);
    return this.repo.save(p);
  }

  async deactivate(id: string): Promise<Propietario> {
    const p = await this.findOne(id);
    p.status = 'inactivo';
    return this.repo.save(p);
  }

  // Devuelve propietarios con su depto asignado (para la tabla del frontend)
  async findAllWithDept(idEdificio?: string): Promise<any[]> {
    let sql = `
      SELECT
        p.id, p.nombre, p.telefono, p.correo, p.banco, p.tipo_pago,
        p.status, p.observacion, p.created_at,
        d.id AS depto_id, d.nr_departamento, d.piso,
        e.id AS edificio_id, e.nombre AS edificio_nombre
      FROM propietarios p
      LEFT JOIN departamentos d ON d.id_propietario = p.id
      LEFT JOIN edificios e ON e.id = d.id_edificio
    `;
    const params: any[] = [];
    if (idEdificio) {
      sql += ` WHERE e.id = $1`;
      params.push(idEdificio);
    }
    sql += ` ORDER BY p.nombre ASC`;

    return this.repo.query(sql, params);
  }
}
