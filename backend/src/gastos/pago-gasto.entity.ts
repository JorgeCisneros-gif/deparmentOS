import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { GastoExtra } from './gasto-extra.entity';
import { Department } from '../departments/department.entity';

@Entity('pagos_gastos_extras')
export class PagoGasto {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'id_gasto_extra' })
  idGastoExtra: string;

  @ManyToOne(() => GastoExtra, (g) => g.pagos)
  @JoinColumn({ name: 'id_gasto_extra' })
  gastoExtra: GastoExtra;

  @Column({ name: 'id_departamento' })
  idDepartamento: string;

  @ManyToOne(() => Department)
  @JoinColumn({ name: 'id_departamento' })
  departamento: Department;

  @Column({ name: 'fecha_pago', type: 'date' })
  fechaPago: string;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  monto: number;

  @Column({
    name: 'tipo_pago',
    type: 'enum',
    enum: ['efectivo', 'transferencia', 'yape', 'plin', 'otro'],
    default: 'transferencia',
  })
  tipoPago: string;

  @Column({
    type: 'enum',
    enum: ['bcp', 'bbva', 'interbank', 'scotiabank', 'otro'],
    nullable: true,
  })
  banco: string;

  @Column({ nullable: true, length: 100 })
  referencia: string;

  @Column({ name: 'comprobante_url', nullable: true, type: 'text' })
  comprobanteUrl: string;

  @Column({ nullable: true, type: 'text' })
  observacion: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
