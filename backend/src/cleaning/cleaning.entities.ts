import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';

// ── Proveedor de limpieza ─────────────────────────────────────

@Entity('proveedores_limpieza')
export class CleaningProvider {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Column({ name: 'id_edificio' }) idEdificio: string;

  @Column({ length: 150 }) nombre: string;

  @Column({ nullable: true, length: 20 }) telefono: string;

  @Column({
    type: 'enum',
    enum: ['bcp', 'bbva', 'interbank', 'scotiabank', 'otro'],
    nullable: true,
  }) banco: string;

  @Column({
    name: 'tipo_cuenta',
    type: 'enum',
    enum: ['ahorros', 'corriente', 'yape', 'plin', 'efectivo'],
    default: 'ahorros',
  }) tipoCuenta: string;

  @Column({ name: 'nro_cuenta', nullable: true, length: 30 }) nroCuenta: string;

  @Column({ name: 'costo_por_dia', type: 'numeric', precision: 10, scale: 2, default: 0 })
  costoPorDia: number;

  @Column({ default: true }) activo: boolean;

  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}

// ── Ambiente de limpieza ──────────────────────────────────────

@Entity('ambientes_limpieza')
export class CleaningArea {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Column({ name: 'id_edificio' }) idEdificio: string;

  @Column({ length: 100 }) nombre: string;

  @Column({ nullable: true, type: 'text' }) descripcion: string;

  @Column({ name: 'costo_extra', type: 'numeric', precision: 10, scale: 2, default: 0 })
  costoExtra: number;

  @Column({ default: true }) activo: boolean;

  @Column({ type: 'smallint', default: 1 }) orden: number;

  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}

// ── Registro mensual de limpieza ──────────────────────────────

@Entity('registros_limpieza')
export class CleaningRecord {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Column({ name: 'id_edificio' }) idEdificio: string;

  @Column({ name: 'id_proveedor' }) idProveedor: string;

  @ManyToOne(() => CleaningProvider)
  @JoinColumn({ name: 'id_proveedor' })
  proveedor: CleaningProvider;

  @Column({ name: 'periodo_mes', type: 'smallint' }) periodoMes: number;
  @Column({ name: 'periodo_anio', type: 'smallint' }) periodoAnio: number;

  @Column({ name: 'dias_trabajados', type: 'smallint', default: 0 })
  diasTrabajados: number;

  @Column({ name: 'ambientes_ids', type: 'uuid', array: true, default: [] })
  ambientesIds: string[];

  @Column({ name: 'detalle_dias', type: 'jsonb', default: [] })
  detalleDias: object[];

  @Column({ name: 'costo_base', type: 'numeric', precision: 10, scale: 2, default: 0 })
  costoBase: number;

  @Column({ name: 'costo_ambientes', type: 'numeric', precision: 10, scale: 2, default: 0 })
  costoAmbientes: number;

  @Column({ name: 'monto_total', type: 'numeric', precision: 10, scale: 2, default: 0 })
  montoTotal: number;

  @Column({ name: 'pago_proveedor_status', default: 'pendiente' })
  pagoProveedorStatus: string;

  @Column({ name: 'pago_proveedor_fecha', type: 'date', nullable: true })
  pagoProveedorFecha: string;

  @Column({ name: 'pago_proveedor_ref', nullable: true, length: 100 })
  pagoProveedorRef: string;

  @Column({ name: 'mensaje_enviado', default: false }) mensajeEnviado: boolean;
  @Column({ name: 'fecha_mensaje_enviado', nullable: true }) fechaMensajeEnviado: Date;
  @Column({ name: 'mensaje_enviado_por', nullable: true }) mensajeEnviadoPor: string;

  @Column({ nullable: true, type: 'text' }) observaciones: string;

  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
