// src/accounts/accounts.service.ts
import {
  Injectable, NotFoundException, ConflictException,
  BadRequestException, ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import {
  Account, SubscriptionPlan, SubscriptionStatus, PLAN_LIMITS,
} from './account.entity';
import { CreateAccountDto, UpdateAccountDto, ResetAccountPasswordDto } from './accounts.dto';

@Injectable()
export class AccountsService {
  constructor(
    @InjectRepository(Account)
    private readonly repo: Repository<Account>,
  ) {}

  async create(dto: CreateAccountDto, supervisorId: string): Promise<Account> {
    const exists = await this.repo.findOne({ where: { email: dto.email } });
    if (exists) throw new ConflictException('Ya existe una cuenta con ese email');

    const limits = PLAN_LIMITS[dto.plan];

    let subscriptionEnd = dto.subscriptionEnd || null;
    if (dto.plan === SubscriptionPlan.DEMO && !subscriptionEnd) {
      const end = new Date();
      end.setDate(end.getDate() + (limits.durationDays || 90));
      subscriptionEnd = end.toISOString().split('T')[0];
    }

    const account = this.repo.create({
      nombre:         dto.nombre,
      email:          dto.email,
      plan:           dto.plan,
      status:         SubscriptionStatus.ACTIVE,
      subscriptionEnd,
      maxEdificios:   limits.maxEdificios,
      maxDeptos:      limits.maxDeptos,
      maxPeriodos:    limits.maxPeriodos,
      createdBy:      supervisorId,
    });

    return this.repo.save(account);
  }

  async findAll(): Promise<Account[]> {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<Account> {
    const acc = await this.repo.findOne({ where: { id } });
    if (!acc) throw new NotFoundException('Cuenta no encontrada');
    return acc;
  }

  async update(id: string, dto: UpdateAccountDto | any): Promise<Account> {
    const acc = await this.findOne(id);

    if (dto.plan && dto.plan !== acc.plan) {
      const limits = PLAN_LIMITS[dto.plan];
      acc.maxEdificios = limits.maxEdificios;
      acc.maxDeptos    = limits.maxDeptos;
      acc.maxPeriodos  = limits.maxPeriodos;

      if (dto.plan === SubscriptionPlan.DEMO && !dto.subscriptionEnd) {
        const end = new Date();
        end.setDate(end.getDate() + 90);
        acc.subscriptionEnd = end.toISOString().split('T')[0];
      }
    }

    Object.assign(acc, dto);
    return this.repo.save(acc);
  }

  async suspend(id: string): Promise<Account> {
    const acc = await this.findOne(id);
    acc.status = SubscriptionStatus.SUSPENDED;
    return this.repo.save(acc);
  }

  async activate(id: string): Promise<Account> {
    const acc = await this.findOne(id);
    acc.status = SubscriptionStatus.ACTIVE;
    return this.repo.save(acc);
  }

  // Eliminar cuenta en cascada — grupos, edificios, usuarios, etc.
  // La cascada se maneja por FK en la BD (ON DELETE CASCADE)
  async remove(id: string): Promise<{ message: string }> {
    const acc = await this.findOne(id);

    // Eliminar usuarios de la cuenta primero
    await this.repo.query(
      `DELETE FROM users WHERE id_account = $1`, [id]
    );

    // Eliminar el grupo (cascade borrará edificios → deptos → mediciones → pagos)
    await this.repo.query(
      `DELETE FROM grupos WHERE id_account = $1`, [id]
    );

    // Eliminar la cuenta
    await this.repo.remove(acc);

    return { message: 'Cuenta eliminada correctamente' };
  }

  async resetAdminPassword(accountId: string, dto: ResetAccountPasswordDto): Promise<void> {
    const adminUser = await this.repo.query(
      `SELECT id FROM users WHERE id_account = $1 AND role = 'administrador' LIMIT 1`,
      [accountId],
    );

    if (!adminUser.length) {
      throw new NotFoundException('No se encontró administrador para esta cuenta');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.repo.query(
      `UPDATE users SET password_hash = $1 WHERE id = $2`,
      [passwordHash, adminUser[0].id],
    );
  }

  // ── Validaciones de límites ───────────────────────────────────

  async checkEdificiosLimit(accountId: string): Promise<void> {
    const acc = await this.findOne(accountId);
    this.assertActive(acc);

    const [{ count }] = await this.repo.query(
      `SELECT COUNT(*) as count FROM edificios WHERE id_account = $1`,
      [accountId],
    );

    if (parseInt(count) >= acc.maxEdificios) {
      throw new ForbiddenException(
        `Límite de edificios alcanzado (${acc.maxEdificios}). Actualiza tu plan.`,
      );
    }
  }

  async checkDeptosLimit(accountId: string, edificioId: string): Promise<void> {
    const acc = await this.findOne(accountId);
    this.assertActive(acc);

    const [{ count }] = await this.repo.query(
      `SELECT COUNT(*) as count FROM departamentos WHERE id_edificio = $1`,
      [edificioId],
    );

    if (parseInt(count) >= acc.maxDeptos) {
      throw new ForbiddenException(
        `Límite de departamentos alcanzado (${acc.maxDeptos}). Actualiza tu plan.`,
      );
    }
  }

  async checkPeriodosLimit(accountId: string, edificioId: string): Promise<void> {
    const acc = await this.findOne(accountId);
    this.assertActive(acc);

    const [{ count }] = await this.repo.query(
      `SELECT COUNT(DISTINCT (rs.periodo_mes || '-' || rs.periodo_anio)) as count
       FROM recibos_servicio rs
       INNER JOIN servicios s ON s.id = rs.id_servicio
       WHERE s.id_edificio = $1`,
      [edificioId],
    );

    if (parseInt(count) >= acc.maxPeriodos) {
      throw new ForbiddenException(
        `Límite de períodos alcanzado (${acc.maxPeriodos}). Actualiza tu plan.`,
      );
    }
  }

  private assertActive(acc: Account): void {
    if (acc.status === SubscriptionStatus.SUSPENDED) {
      throw new ForbiddenException('Cuenta suspendida. Contacta al administrador.');
    }
    if (acc.status === SubscriptionStatus.EXPIRED || acc.isExpired()) {
      acc.status = SubscriptionStatus.EXPIRED;
      this.repo.save(acc);
      throw new ForbiddenException('Suscripción vencida. Renueva tu plan.');
    }
  }

  async getStats(): Promise<any> {
    const accounts = await this.findAll();
    return {
      total:     accounts.length,
      active:    accounts.filter(a => a.status === SubscriptionStatus.ACTIVE).length,
      expired:   accounts.filter(a => a.status === SubscriptionStatus.EXPIRED || a.isExpired()).length,
      suspended: accounts.filter(a => a.status === SubscriptionStatus.SUSPENDED).length,
      byPlan: Object.values(SubscriptionPlan).reduce((acc, plan) => {
        acc[plan] = accounts.filter(a => a.plan === plan).length;
        return acc;
      }, {} as Record<string, number>),
    };
  }
}
