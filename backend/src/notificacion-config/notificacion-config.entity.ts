// src/notificacion-config/notificacion-config.entity.ts
import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { Grupo } from '../grupos/grupo.entity';

export enum TipoNotificacion {
  VENCIMIENTO_PAGO      = 'vencimiento_pago',
  GASTOS_GENERALES      = 'gastos_generales',
  RECOLECCION_MEDICION  = 'recoleccion_medicion',
  VENCIMIENTO_SERVICIO  = 'vencimiento_servicio',
}

export enum DestinatariosGestion {
  GESTION       = 'gestion',
  ADMINISTRADOR = 'administrador',
  AMBOS         = 'ambos',
}

@Entity('notificacion_config')
export class NotificacionConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'id_grupo' })
  idGrupo: string;

  @ManyToOne(() => Grupo, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_grupo' })
  grupo: Grupo;

  // ── Tipo de notificación ─────────────────────────────────────
  @Column({
    name: 'tipo',
    type: 'varchar',
    length: 50,
  })
  tipo: TipoNotificacion;

  @Column({ name: 'activo', default: true })
  activo: boolean;

  // ── Hora de envío (HH:MM) ────────────────────────────────────
  @Column({ name: 'hora_envio', type: 'time' })
  horaEnvio: string; // '09:00'

  // ── Offset en días (para vencimiento_pago y gastos_generales) ─
  // vencimiento_pago: días después del envío del mensaje → empieza a notificar
  // gastos_generales: días después de creación del gasto → primer envío
  @Column({ name: 'dias_offset', type: 'integer', default: 0, nullable: true })
  diasOffset: number;

  // ── Día del mes (solo para recoleccion_medicion) ─────────────
  // 1-28: día del mes en que se envía el recordatorio
  @Column({ name: 'dia_mes', type: 'integer', nullable: true })
  diaMes: number | null;

  // ── Destinatarios (solo para tipos de gestión) ───────────────
  // recoleccion_medicion y vencimiento_servicio
  @Column({
    name: 'destinatarios_gestion',
    type: 'varchar',
    length: 20,
    default: 'ambos',
    nullable: true,
  })
  destinatariosGestion: DestinatariosGestion | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
