// src/notificacion-tipo/notificacion-tipo.entity.ts
import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, OneToMany,
} from 'typeorm';

@Entity('notificacion_tipo')
export class NotificacionTipo {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 50 })
  codigo: string;

  @Column({ length: 100 })
  nombre: string;

  @Column({ type: 'text', nullable: true })
  descripcion: string;

  // Destinatarios separados por coma
  // Valores posibles: 'propietarios', 'gestion', 'admin'
  // Ejemplos: 'propietarios' | 'gestion,admin' | 'propietarios,gestion,admin'
  @Column({ length: 100, default: 'propietarios' })
  destinatarios: string;

  @Column({ default: true })
  activo: boolean;

  @Column({ default: 0 })
  orden: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Helper para obtener lista de destinatarios
  get destinatariosList(): string[] {
    return this.destinatarios.split(',').map(d => d.trim());
  }
}
