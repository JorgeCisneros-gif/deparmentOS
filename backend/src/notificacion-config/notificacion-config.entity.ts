// src/notificacion-config/notificacion-config.entity.ts
import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { NotificacionTipo } from '../notificacion-tipo/notificacion-tipo.entity';

@Entity('notificacion_config')
export class NotificacionConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'id_edificio' })
  idEdificio: string;

  @Column({ name: 'id_tipo' })
  idTipo: string;

  @ManyToOne(() => NotificacionTipo, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_tipo' })
  tipo: NotificacionTipo;

  @Column({ default: false })
  activo: boolean;

  // Expresión cron: '0 9 * * *' = todos los días 9am
  //                '0 8 15 * *' = día 15 de cada mes 8am
  @Column({ name: 'cron_expresion', length: 50, default: '0 9 * * *' })
  cronExpresion: string;

  // Días de espera desde el evento base
  // vencimiento_pago: días desde envío del mensaje WhatsApp
  // gastos_generales: días desde creación del gasto
  // recoleccion_medicion / vencimiento_servicio: no aplica (0)
  @Column({ name: 'dias_offset', type: 'integer', default: 0 })
  diasOffset: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
