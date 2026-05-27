import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';

export enum UserRole {
  SUPERVISOR    = 'supervisor',
  ADMINISTRADOR = 'administrador',
  GESTION       = 'gestion',        // ← nuevo
  PROPIETARIO   = 'propietario',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 150 })
  email: string;

  @Column({ name: 'password_hash' })
  @Exclude()
  passwordHash: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.PROPIETARIO })
  role: UserRole;

  // ── Relación con cuenta (null = supervisor global) ─────────
  @Column({ name: 'id_account', nullable: true })
  idAccount: string | null;

  // ── Asignaciones ────────────────────────────────────────────
  @Column({ name: 'id_edificio', nullable: true })
  idEdificio: string | null;

  @Column({ name: 'id_departamento', nullable: true })
  idDepartamento: string | null;

  @Column({ name: 'id_propietario', nullable: true })
  idPropietario: string | null;

  // ── Estado ──────────────────────────────────────────────────
  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'last_login', nullable: true })
  lastLogin: Date;

  @Column({ name: 'refresh_token', nullable: true })
  @Exclude()
  refreshToken: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
