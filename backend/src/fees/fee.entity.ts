// src/fees/fee.entity.ts
import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { Department } from '../departments/department.entity';

// Estructura de cada entrada en montos_servicios
export interface MontoServicioItem {
  nombre:      string;   // "Agua Sedapal"
  tipo:        string;   // "agua" | "luz" | "internet" | ...
  modoCalculo: string;   // "por_consumo_m3" | "division_igualitaria" | ...
  monto:       number;   // 44.13
  // Campos opcionales para trazabilidad
  idServicio?: string;
  detalle?:    Record<string, any>;
}

@Entity('cuotas_departamento')
export class Fee {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'id_departamento' })
  idDepartamento: string;

  @ManyToOne(() => Department)
  @JoinColumn({ name: 'id_departamento' })
  departamento: Department;

  @Column({ name: 'periodo_mes', type: 'smallint' })
  periodoMes: number;

  @Column({ name: 'periodo_anio', type: 'smallint' })
  periodoAnio: number;

  // ── Montos dinámicos por servicio ─────────────────────────────
  // Clave: idServicio (UUID) o 'agua_comun' / 'ajuste' para entradas especiales
  // Valor: MontoServicioItem
  // Ejemplo:
  // {
  //   "abc-uuid-agua":    { nombre: "Agua Sedapal",  tipo: "agua",    monto: 44.13, modoCalculo: "por_consumo_m3" },
  //   "def-uuid-luz":     { nombre: "Luz áreas",     tipo: "luz",     monto: 7.25,  modoCalculo: "division_igualitaria" },
  //   "agua_comun":       { nombre: "Agua común",    tipo: "agua_comun", monto: 0.53 },
  //   "ghi-uuid-limpieza":{ nombre: "Limpieza",      tipo: "limpieza", monto: 5.00, modoCalculo: "division_igualitaria" },
  // }
  @Column({ name: 'montos_servicios', type: 'jsonb', default: {} })
  montosServicios: Record<string, MontoServicioItem>;

  // Monto total calculado por la app = Σ montosServicios + ajuste
  @Column({ name: 'monto_total', type: 'numeric', precision: 10, scale: 2, default: 0 })
  montoTotal: number;

  @Column({ name: 'ajuste_mes_anterior', type: 'numeric', precision: 10, scale: 2, default: 0 })
  ajusteMesAnterior: number;

  @Column({ name: 'fecha_vencimiento', type: 'date', nullable: true })
  fechaVencimiento: string;

  @Column({ name: 'status_pago', length: 30, default: 'pendiente' })
statusPago: string;

  @Column({ name: 'mensaje_enviado', default: false })
  mensajeEnviado: boolean;

  @Column({ name: 'fecha_mensaje_enviado', nullable: true })
  fechaMensajeEnviado: Date;

  @Column({ name: 'mensaje_enviado_por', nullable: true })
  mensajeEnviadoPor: string;

  @Column({ name: 'detalle_json', type: 'jsonb', default: {} })
  detalleJson: object;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
