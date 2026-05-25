// src/receipts/receipt.entity.ts
import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { Service } from '../services/service.entity';

@Entity('recibos_servicio')
export class Receipt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'id_servicio' })
  idServicio: string;

  @ManyToOne(() => Service)
  @JoinColumn({ name: 'id_servicio' })
  servicio: Service;

  @Column({ name: 'nro_recibo', nullable: true, length: 60 })
  nroRecibo: string;

  @Column({ name: 'periodo_mes', type: 'smallint' })
  periodoMes: number;

  @Column({ name: 'periodo_anio', type: 'smallint' })
  periodoAnio: number;

  @Column({ name: 'fecha_emision', type: 'date', nullable: true })
  fechaEmision: string;

  @Column({ name: 'fecha_vencimiento', type: 'date', nullable: true })
  fechaVencimiento: string;

  @Column({ name: 'monto_total_factura', type: 'numeric', precision: 10, scale: 2, default: 0 })
  montoTotalFactura: number;

  // Para servicios de agua (lectura de medidor general)
  @Column({ name: 'm3_lectura_actual', type: 'numeric', precision: 10, scale: 3, nullable: true })
  m3LecturaActual: number;

  @Column({ name: 'm3_lectura_anterior', type: 'numeric', precision: 10, scale: 3, nullable: true })
  m3LecturaAnterior: number;

  // Columnas generadas por BD (solo lectura)
  @Column({ name: 'm3_consumo_total', type: 'numeric', precision: 10, scale: 3, nullable: true, insert: false, update: false })
  m3ConsumoTotal: number;

  @Column({ name: 'precio_m3', type: 'numeric', precision: 10, scale: 6, nullable: true, insert: false, update: false })
  precioM3: number;

  // ── Campos para modo por_consumo_ajustado ──────────────────
  // Total de unidades (m3 o kWh) que figura en la factura del proveedor
  @Column({ name: 'total_unidades_factura', type: 'numeric', precision: 12, scale: 4, nullable: true })
  totalUnidadesFactura: number;

  // Suma de m3/kWh propios (mediciones individuales de deptos).
  // Se puede ingresar manualmente antes de tener las mediciones.
  // Se recalcula con el botón "Recalcular factor".
  @Column({ name: 'm3_propios', type: 'numeric', precision: 12, scale: 4, nullable: true })
  m3Propios: number;

  // Factor = totalUnidadesFactura / m3Propios
  // Calculado automáticamente pero editable manualmente.
  // Ejemplo: 99.663 / 94.19 = 1.0581
  @Column({ name: 'factor_ajuste', type: 'numeric', precision: 12, scale: 8, default: 1.0, nullable: true })
  factorAjuste: number;

  // Estado del factor: 'pendiente' | 'estimado' | 'calculado'
  @Column({ name: 'factor_estado', length: 15, default: 'pendiente', nullable: true })
  factorEstado: string;

  // ── Campos adicionales ─────────────────────────────────────
  @Column({ nullable: true, length: 150 })
  proveedor: string;

  @Column({ nullable: true, type: 'text' })
  observacion: string;

  @Column({ name: 'detalle_json', type: 'jsonb', default: {} })
  detalleJson: object;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
