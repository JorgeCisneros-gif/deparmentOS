import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';

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

// Límites por plan — fuente de verdad en código
export const PLAN_LIMITS: Record<SubscriptionPlan, {
  maxEdificios: number;
  maxDeptos:    number;
  maxPeriodos:  number;
  durationDays: number | null; // null = sin caducidad
}> = {
  [SubscriptionPlan.FULL]:       { maxEdificios: 9999, maxDeptos: 9999, maxPeriodos: 9999, durationDays: null },
  [SubscriptionPlan.DEMO]:       { maxEdificios: 1,    maxDeptos: 10,   maxPeriodos: 3,    durationDays: 90   },
  [SubscriptionPlan.STANDARD]:   { maxEdificios: 3,    maxDeptos: 20,   maxPeriodos: 12,   durationDays: null },
  [SubscriptionPlan.PREMIUM]:    { maxEdificios: 10,   maxDeptos: 100,  maxPeriodos: 24,   durationDays: null },
  [SubscriptionPlan.ENTERPRISE]: { maxEdificios: 100,  maxDeptos: 200,  maxPeriodos: 24,   durationDays: null },
};

@Entity('accounts')
export class Account {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  nombre: string;

  @Column({ length: 150, unique: true })
  email: string;

  @Column({ type: 'enum', enum: SubscriptionPlan, default: SubscriptionPlan.DEMO })
  plan: SubscriptionPlan;

  @Column({
    type: 'enum',
    enum: SubscriptionStatus,
    default: SubscriptionStatus.ACTIVE,
    name: 'status',
  })
  status: SubscriptionStatus;

  @Column({ name: 'subscription_start', type: 'date', default: () => 'CURRENT_DATE' })
  subscriptionStart: string;

  @Column({ name: 'subscription_end', type: 'date', nullable: true })
  subscriptionEnd: string | null;

  @Column({ name: 'max_edificios', default: 1 })
  maxEdificios: number;

  @Column({ name: 'max_deptos', default: 10 })
  maxDeptos: number;

  @Column({ name: 'max_periodos', default: 3 })
  maxPeriodos: number;

  @Column({ name: 'created_by', nullable: true })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Helper: verifica si la suscripción está vencida
  isExpired(): boolean {
    if (!this.subscriptionEnd) return false;
    return new Date() > new Date(this.subscriptionEnd);
  }
}
