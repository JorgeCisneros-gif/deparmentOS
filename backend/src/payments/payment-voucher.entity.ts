// src/payments/payment-voucher.entity.ts
import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { Payment } from './payment.entity';

export type StorageProvider = 'local' | 'google_drive';

/**
 * Espejo de meter_images pero para comprobantes de pago.
 *
 * Permite múltiples comprobantes por pago (relación 1:N con pagos)
 * aunque la lógica del servicio crea 1 por pago. Si en el futuro un
 * pago necesita varios comprobantes (correcciones, soporte doble),
 * no requiere migración.
 *
 * Los reportes NO leen esta tabla: trabajan solo con pagos.
 * Esta tabla existe únicamente para servir/almacenar los archivos.
 */
@Entity('payment_vouchers')
export class PaymentVoucher {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'id_pago' })
  idPago: string;

  @ManyToOne(() => Payment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_pago' })
  pago: Payment;

  // ── Archivo ──

  @Column({ length: 255 })
  filename: string;

  /** Path local. Nullable cuando el archivo ya fue purgado del filesystem. */
  @Column({ type: 'text', nullable: true })
  filepath: string | null;

  @Column({ name: 'mime_type', length: 100, nullable: true })
  mimeType: string | null;

  @Column({ name: 'size_kb', type: 'int', nullable: true })
  sizeKb: number | null;

  // ── Storage gateway (Drive) ──

  @Column({ name: 'storage_provider', length: 20, default: 'local' })
  storageProvider: StorageProvider;

  @Column({ name: 'gateway_file_id', type: 'text', nullable: true })
  gatewayFileId: string | null;

  @Column({ name: 'external_url', type: 'text', nullable: true })
  externalUrl: string | null;

  @Column({ name: 'gateway_uploaded_at', type: 'timestamptz', nullable: true })
  gatewayUploadedAt: Date | null;

  @Column({ name: 'gateway_last_error', type: 'text', nullable: true })
  gatewayLastError: string | null;

  @Column({ name: 'gateway_attempts', type: 'int', default: 0 })
  gatewayAttempts: number;

  @Column({ name: 'local_purgeable_at', type: 'timestamptz', nullable: true })
  localPurgeableAt: Date | null;

  // ── Auditoría ──

  @Column({ name: 'uploaded_by', nullable: true })
  uploadedBy: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
