// src/propietarios/propietario.entity.ts
import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

@Entity('propietarios')
export class Propietario {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 150 })
  nombre: string;

  @Column({ nullable: true, length: 20 })
  telefono: string;

  @Column({ nullable: true, length: 100 })
  correo: string;

  @Column({
    type: 'enum',
    enum: ['bcp', 'bbva', 'interbank', 'scotiabank', 'otro'],
    nullable: true,
  })
  banco: string;

  @Column({
    name: 'tipo_pago',
    type: 'enum',
    enum: ['efectivo', 'transferencia', 'yape', 'plin', 'otro'],
    nullable: true,
    default: 'transferencia',
  })
  tipoPago: string;

  @Column({
    type: 'enum',
    enum: ['activo', 'inactivo'],
    default: 'activo',
  })
  status: string;

  @Column({ nullable: true, type: 'text' })
  observacion: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
