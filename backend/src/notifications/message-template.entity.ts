// src/notifications/message-template.entity.ts
import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { Building } from '../buildings/building.entity';

export const DEFAULT_TEMPLATE = `🏢 *{edificio}* — Depto *{depto}*

Buenas, le comunicamos su cuota de *{periodo}*:

{lineas_desglose}

*TOTAL: S/. {total}*
📅 Vence: {vencimiento}

{cuentas}Por favor envíe el comprobante de pago al confirmar.
¡Gracias! 🙏`;

// Variables del sistema (siempre disponibles):
// {edificio}, {depto}, {periodo}, {lineas_desglose}, {total}, {vencimiento}, {cuentas}
//
// Variables de servicios (dinámicas por los servicios del edificio):
// {svc_agua}, {svc_luz}, {svc_internet}, {svc_limpieza}, {svc_agua_comun}, etc.
// El nombre después de svc_ corresponde al campo "tipo" del servicio.
//
// Variables personalizadas (definidas por el supervisor):
// Cualquier nombre en custom_variables — calculadas con fórmulas simples.

export interface CustomVariable {
  nombre:      string;   // nombre de la variable (sin llaves)
  formula:     string;   // ej: "{svc_agua} + {svc_luz}"
  descripcion: string;   // descripción para mostrar en el editor
}

@Entity('message_templates')
export class MessageTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'id_edificio' })
  idEdificio: string;

  @ManyToOne(() => Building)
  @JoinColumn({ name: 'id_edificio' })
  edificio: Building;

  @Column({ length: 50, nullable: true })
  tipo: string;

  @Column({ length: 100, default: 'Plantilla principal' })
  nombre: string;

  @Column({ nullable: true })
  descripcion: string;

  // Columna real en BD es "cuerpo"
  @Column({ name: 'cuerpo', type: 'text' })
  templateText: string;

  // Variables personalizadas con fórmulas
  @Column({ name: 'custom_variables', type: 'jsonb', default: [] })
  customVariables: CustomVariable[];

  @Column({ default: true })
  activo: boolean;

  @Column({ name: 'es_default', default: false })
  esDefault: boolean;

  @Column({ name: 'created_by', nullable: true })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
