import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { Receipt } from '../receipts/receipt.entity';
import { Department } from '../departments/department.entity';

@Entity('mediciones_departamento')
export class Reading {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'id_recibo' })
  idRecibo: string;

  @ManyToOne(() => Receipt)
  @JoinColumn({ name: 'id_recibo' })
  recibo: Receipt;

  @Column({ name: 'id_departamento' })
  idDepartamento: string;

  @ManyToOne(() => Department)
  @JoinColumn({ name: 'id_departamento' })
  departamento: Department;

  @Column({ name: 'lectura_actual', type: 'numeric', precision: 10, scale: 3 })
  lecturaActual: number;

  @Column({ name: 'lectura_anterior', type: 'numeric', precision: 10, scale: 3 })
  lecturaAnterior: number;

  // Columna generada en BD (solo lectura)
  @Column({ name: 'm3_consumido', type: 'numeric', precision: 10, scale: 3, nullable: true, insert: false, update: false })
  m3Consumido: number;

  @Column({ name: 'monto_calculado', type: 'numeric', precision: 10, scale: 2, default: 0 })
  montoCalculado: number;

  @Column({ name: 'es_zona_comun', default: false })
  esZonaComun: boolean;

  @Column({ nullable: true, type: 'text' })
  observacion: string;

  // Referencia a la imagen del medidor si se usó OCR
  @Column({ name: 'id_meter_image', nullable: true })
  idMeterImage: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
