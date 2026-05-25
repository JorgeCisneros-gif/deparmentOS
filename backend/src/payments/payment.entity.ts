import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { Fee } from '../fees/fee.entity';

@Entity('pagos')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'id_cuota' })
  idCuota: string;

  @ManyToOne(() => Fee)
  @JoinColumn({ name: 'id_cuota' })
  cuota: Fee;

  @Column({ name: 'id_propietario',nullable: true  })
  idPropietario: string;

  @Column({ name: 'fecha_pago', type: 'date' })
  fechaPago: string;

  @Column({ name: 'monto_cancelado', type: 'numeric', precision: 10, scale: 2 })
  montoCancelado: number;

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
  @Column({ name: 'estado_pago', length: 30, default: 'aprobado' })
  estadoPago: string;  // 'aprobado' | 'pendiente_aprobacion' | 'rechazado'
 
  @Column({ name: 'aprobado_por', nullable: true })
  aprobadoPor: string;
 
  @Column({ name: 'fecha_aprobacion', nullable: true })
  fechaAprobacion: Date;
}
