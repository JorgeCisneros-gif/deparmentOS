import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany,
} from 'typeorm';
import { Building } from '../buildings/building.entity';
import { PagoGasto } from './pago-gasto.entity';

export type EstadoGasto = 'activo' | 'cerrado' | 'anulado';

@Entity('gastos_extras')
export class GastoExtra {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'id_edificio' })
  idEdificio: string;

  @ManyToOne(() => Building)
  @JoinColumn({ name: 'id_edificio' })
  edificio: Building;

  @Column({ length: 150 })
  nombre: string;

  @Column({ type: 'text', nullable: true })
  descripcion: string;

  @Column({ name: 'fecha_inicio', type: 'date' })
  fechaInicio: string;

  @Column({ name: 'fecha_fin', type: 'date', nullable: true })
  fechaFin: string;

  /**
   * JSON con los IDs de departamentos involucrados.
   * null o [] = todos los deptos del edificio.
   * Ejemplo: ["uuid-201", "uuid-202"]
   */
  @Column({ name: 'lista_departamentos', type: 'jsonb', nullable: true })
  listaDepartamentos: string[] | null;

  @Column({
    type: 'enum',
    enum: ['activo', 'cerrado', 'anulado'],
    default: 'activo',
  })
  estado: EstadoGasto;

  /** Monto total del gasto (puede distribuirse entre los deptos involucrados) */
  @Column({ name: 'monto_gasto', type: 'numeric', precision: 10, scale: 2 })
  montoGasto: number;

  /** Monto que le corresponde a cada depto (montoGasto / nro deptos) */
  @Column({ name: 'monto_por_depto', type: 'numeric', precision: 10, scale: 2, nullable: true })
  montoPorDepto: number;

  @OneToMany(() => PagoGasto, (p) => p.gastoExtra)
  pagos: PagoGasto[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
