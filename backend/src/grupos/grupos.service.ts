// src/grupos/grupos.service.ts
import {
  Injectable, NotFoundException, ConflictException, ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import {
  Grupo, SubscriptionPlan, PLAN_LIMITS, SUPERGRUPO_NOMBRE,
} from './grupo.entity';
import { CreateGrupoDto, UpdateGrupoDto, CreateGrupoAdminDto, UpdateSuscripcionDto } from './grupos.dto';

@Injectable()
export class GruposService {
  constructor(
    @InjectRepository(Grupo)
    private readonly repo: Repository<Grupo>,
  ) {}

  // ── CRUD ─────────────────────────────────────────────────────

  async create(dto: CreateGrupoDto, supervisorId: string): Promise<Grupo> {
    const limits = PLAN_LIMITS[dto.plan || SubscriptionPlan.DEMO];

    let subscriptionEnd = dto.subscriptionEnd || null;
    if ((dto.plan === SubscriptionPlan.DEMO || !dto.plan) && !subscriptionEnd) {
      const end = new Date();
      end.setDate(end.getDate() + 90);
      subscriptionEnd = end.toISOString().split('T')[0];
    }

    const grupo = this.repo.create({
      nombre:          dto.nombre,
      ruc:             dto.ruc       || null,
      direccion:       dto.direccion || null,
      plan:            dto.plan || SubscriptionPlan.DEMO,
      subscriptionEnd,
      maxEdificios:    limits.maxEdificios,
      maxDeptos:       limits.maxDeptos,
      maxPeriodos:     limits.maxPeriodos,
      status:          'activo',
      createdBy:       supervisorId,
    });

    return this.repo.save(grupo);
  }

  async findAll(includeSuper = true): Promise<Grupo[]> {
    const qb = this.repo.createQueryBuilder('g')
      .leftJoinAndSelect('g.edificios', 'e')
      .leftJoinAndSelect('g.usuarios', 'u')
      .orderBy('g.createdAt', 'DESC');

    if (!includeSuper) {
      qb.where('g.nombre != :nombre', { nombre: SUPERGRUPO_NOMBRE });
    }

    return qb.getMany();
  }

  async findOne(id: string): Promise<Grupo> {
    const g = await this.repo.findOne({
      where: { id },
      relations: ['edificios', 'edificios.departamentos', 'usuarios'],
    });
    if (!g) throw new NotFoundException('Grupo no encontrado');
    return g;
  }

  async findByUser(idGrupo: string): Promise<Grupo> {
    return this.findOne(idGrupo);
  }

  async getSuperGrupo(): Promise<Grupo> {
    const g = await this.repo.findOne({
      where: { nombre: SUPERGRUPO_NOMBRE },
      relations: ['edificios'],
    });
    if (!g) throw new NotFoundException('SuperGrupo no encontrado');
    return g;
  }

  async update(id: string, dto: UpdateGrupoDto): Promise<Grupo> {
    const g = await this.findOne(id);
    if (g.isSuperGrupo()) throw new ForbiddenException('No se puede modificar el SuperGrupo');
    Object.assign(g, dto);
    return this.repo.save(g);
  }

  async updateSuscripcion(id: string, dto: UpdateSuscripcionDto): Promise<Grupo> {
    const g = await this.findOne(id);
    if (g.isSuperGrupo()) throw new ForbiddenException('El SuperGrupo no tiene restricciones');

    if (dto.plan) {
      const limits = PLAN_LIMITS[dto.plan];
      g.plan         = dto.plan;
      g.maxEdificios = limits.maxEdificios;
      g.maxDeptos    = limits.maxDeptos;
      g.maxPeriodos  = limits.maxPeriodos;

      if (dto.plan === SubscriptionPlan.DEMO && !dto.subscriptionEnd) {
        const end = new Date();
        end.setDate(end.getDate() + 90);
        g.subscriptionEnd = end.toISOString().split('T')[0];
      }
    }

    if (dto.subscriptionEnd !== undefined) g.subscriptionEnd = dto.subscriptionEnd;
    return this.repo.save(g);
  }

  async suspend(id: string): Promise<Grupo> {
    const g = await this.findOne(id);
    if (g.isSuperGrupo()) throw new ForbiddenException('No se puede suspender el SuperGrupo');
    g.status = 'suspendido';
    return this.repo.save(g);
  }

  async activate(id: string): Promise<Grupo> {
    const g = await this.findOne(id);
    g.status = 'activo';
    return this.repo.save(g);
  }

  async remove(id: string): Promise<{ message: string }> {
    const g = await this.findOne(id);
    if (g.isSuperGrupo()) throw new ForbiddenException('No se puede eliminar el SuperGrupo');

    // Cascada: usuarios, edificios (→ deptos → mediciones → pagos) via FK BD
    await this.repo.query(`DELETE FROM users WHERE id_grupo = $1`, [id]);
    await this.repo.remove(g);
    return { message: 'Grupo eliminado correctamente' };
  }

  // ── Crear administrador del grupo ─────────────────────────────
  async createAdmin(grupoId: string, dto: CreateGrupoAdminDto): Promise<any> {
    const grupo = await this.findOne(grupoId);

    // Verificar que no exista el email
    const [existing] = await this.repo.query(
      `SELECT id FROM users WHERE email = $1 LIMIT 1`, [dto.email]
    );
    if (existing) throw new ConflictException('El email ya está registrado');

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const [newUser] = await this.repo.query(`
      INSERT INTO users (email, password_hash, role, id_grupo, is_active)
      VALUES ($1, $2, 'administrador', $3, true)
      RETURNING id, email, role, id_grupo, is_active, created_at
    `, [dto.email, passwordHash, grupoId]);

    return newUser;
  }

  // ── Reset contraseña de un usuario del grupo ─────────────────
  async resetUserPassword(grupoId: string, userId: string, newPassword: string): Promise<void> {
    const [user] = await this.repo.query(
      `SELECT id FROM users WHERE id = $1 AND id_grupo = $2 LIMIT 1`,
      [userId, grupoId]
    );
    if (!user) throw new NotFoundException('Usuario no encontrado en este grupo');

    const hash = await bcrypt.hash(newPassword, 10);
    await this.repo.query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [hash, userId]);
  }

  // ── Validaciones de límites ───────────────────────────────────

  async assertActive(grupoId: string): Promise<void> {
    const g = await this.findOne(grupoId);
    if (g.isSuperGrupo()) return; // sin restricciones

    if (g.status === 'suspendido') {
      throw new ForbiddenException({
        code: 'SUBSCRIPTION_SUSPENDED',
        message: 'Suscripción suspendida. Contacta al administrador.',
      });
    }
    if (g.isExpired()) {
      g.status = 'expirado';
      await this.repo.save(g);
      throw new ForbiddenException({
        code: 'SUBSCRIPTION_EXPIRED',
        message: 'Suscripción vencida. Contacta al administrador.',
      });
    }
  }

  async checkEdificiosLimit(grupoId: string): Promise<void> {
    const g = await this.findOne(grupoId);
    if (g.isSuperGrupo()) return;
    await this.assertActive(grupoId);

    const [{ count }] = await this.repo.query(
      `SELECT COUNT(*) as count FROM edificios WHERE id_grupo = $1`, [grupoId]
    );
    if (parseInt(count) >= g.maxEdificios) {
      throw new ForbiddenException(
        `Límite de edificios alcanzado (${g.maxEdificios}). Actualiza tu plan.`
      );
    }
  }

  async checkDeptosLimit(grupoId: string, edificioId: string): Promise<void> {
    const g = await this.findOne(grupoId);
    if (g.isSuperGrupo()) return;
    await this.assertActive(grupoId);

    const [{ count }] = await this.repo.query(
      `SELECT COUNT(*) as count FROM departamentos WHERE id_edificio = $1`, [edificioId]
    );
    if (parseInt(count) >= g.maxDeptos) {
      throw new ForbiddenException(
        `Límite de departamentos alcanzado (${g.maxDeptos}). Actualiza tu plan.`
      );
    }
  }

  async checkPeriodosLimit(grupoId: string, edificioId: string): Promise<void> {
    const g = await this.findOne(grupoId);
    if (g.isSuperGrupo()) return;
    await this.assertActive(grupoId);

    const [{ count }] = await this.repo.query(`
      SELECT COUNT(DISTINCT (rs.periodo_mes || '-' || rs.periodo_anio)) as count
      FROM recibos_servicio rs
      INNER JOIN servicios s ON s.id = rs.id_servicio
      WHERE s.id_edificio = $1
    `, [edificioId]);

    if (parseInt(count) >= g.maxPeriodos) {
      throw new ForbiddenException(
        `Límite de períodos alcanzado (${g.maxPeriodos}). Actualiza tu plan.`
      );
    }
  }

  // ── Verificar que el grupo tiene edificio con departamentos ──
  async assertHasEdificioConDeptos(grupoId: string): Promise<void> {
    const [result] = await this.repo.query(`
      SELECT COUNT(d.id) as total_deptos
      FROM edificios e
      INNER JOIN departamentos d ON d.id_edificio = e.id
      WHERE e.id_grupo = $1
    `, [grupoId]);

    if (parseInt(result.total_deptos) === 0) {
      throw new ForbiddenException({
        code: 'NO_EDIFICIO_CON_DEPTOS',
        message: 'Debes configurar al menos un edificio con departamentos antes de crear usuarios.',
      });
    }
  }

  // ── Stats para el panel del supervisor ───────────────────────
  async getStats(): Promise<any> {
    const grupos = await this.findAll(false);
    return {
      total:     grupos.length,
      activos:   grupos.filter(g => g.status === 'activo' && !g.isExpired()).length,
      expirados: grupos.filter(g => g.isExpired()).length,
      suspendidos: grupos.filter(g => g.status === 'suspendido').length,
      byPlan: Object.values(SubscriptionPlan).reduce((acc, plan) => {
        acc[plan] = grupos.filter(g => g.plan === plan).length;
        return acc;
      }, {} as Record<string, number>),
    };
  }
}
