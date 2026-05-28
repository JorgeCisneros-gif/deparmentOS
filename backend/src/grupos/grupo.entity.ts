// src/grupos/grupo.entity.ts
import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, OneToMany,
} from 'typeorm';
import { Building } from '../buildings/building.entity';

export enum GrupoStatus {
  ACTIVO   = 'activo',
  INACTIVO = 'inactivo',
}

@Entity('grupos')
export class Grupo {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'id_account', nullable: true })
  idAccount: string | null;  // null = SuperGrupo del supervisor

  @Column({ length: 150 })
  nombre: string;

  @Column({ nullable: true, length: 20 })
  ruc: string | null;

  @Column({ type: 'text', nullable: true })
  direccion: string | null;

  @Column({ default: GrupoStatus.ACTIVO })
  status: string;

  @OneToMany(() => Building, b => b.grupo)
  edificios: Building[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
