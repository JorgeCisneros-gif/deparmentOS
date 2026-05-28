// src/grupos/grupo.entity.ts
import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, OneToMany,
} from 'typeorm';
import { Building } from '../buildings/building.entity';
import { User } from '../users/user.entity';

export enum SubscriptionPlan {
  FULL       = 'full',
  DEMO       = 'demo',
  STANDARD   = 'standard',
  PREMIUM    = 'premium',
  ENTERPRISE = 'enterprise',
}

export enum SubscriptionStatus {
  ACTIVE    = 'active',
  EXPIRED   = 'expired',
  SUSPENDED = 'suspended',
}

export const PLAN_LIMITS: Record<SubscriptionPlan, {
  maxEdificios: number;
  maxDeptos:    number;
  maxPeriodos:  number;
  durationDays: number | null;
}> = {
  [SubscriptionPlan.FULL]:       { maxEdificios: 9999, maxDeptos: 9999, maxPeriodos: 9999, durationDays: null },
  [SubscriptionPlan.DEMO]:       { maxEdificios: 1,    maxDeptos: 10,   maxPeriodos: 3,    durationDays: 90   },
  [SubscriptionPlan.STANDARD]:   { maxEdificios: 3,    maxDeptos: 20,   maxPeriodos: 12,   durationDays: null },
  [SubscriptionPlan.PREMIUM]:    { maxEdificios: 10,   maxDeptos: 100,  maxPeriodos: 24,   durationDays: null },
  [SubscriptionPlan.ENTERPRISE]: { maxEdificios: 100,  maxDeptos: 200,  maxPeriodos: 24,   durationDays: null },
};

export const SUPERGRUPO_NOMBRE = 'SuperGrupo';

@Entity('grupos')
export class Grupo {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 150 })
  nombre: string;

  @Column({ nullable: true, length: 20 })
  ruc: string | null;

  @Column({ type: 'text', nullable: true })
  direccion: string | null;

  @Column({ default: 'activo' })
  status: string;

  // ── Suscripción ──────────────────────────────────────────────
  @Column({ type: 'enum', enum: SubscriptionPlan, default: SubscriptionPlan.DEMO })
  plan: SubscriptionPlan;

  @Column({ name: 'subscription_end', type: 'date', nullable: true })
  subscriptionEnd: string | null;

  @Column({ name: 'max_edificios', default: 1 })
  maxEdificios: number;

  @Column({ name: 'max_deptos', default: 10 })
  maxDeptos: number;

  @Column({ name: 'max_periodos', default: 3 })
  maxPeriodos: number;

  @Column({ name: 'created_by', nullable: true })
  createdBy: string | null;

  // ── Relaciones ───────────────────────────────────────────────
  @OneToMany(() => Building, b => b.grupo)
  edificios: Building[];

  @OneToMany(() => User, u => u.grupo)
  usuarios: User[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // ── Helpers ──────────────────────────────────────────────────
  isExpired(): boolean {
    if (!this.subscriptionEnd) return false;
    return new Date() > new Date(this.subscriptionEnd);
  }

  isSuperGrupo(): boolean {
    return this.nombre === SUPERGRUPO_NOMBRE;
  }
}
