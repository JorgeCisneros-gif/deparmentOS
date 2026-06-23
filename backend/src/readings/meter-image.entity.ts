import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn,
} from 'typeorm';

export type StorageProvider = 'local' | 'google_drive';

@Entity('meter_images')
export class MeterImage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'id_departamento' })
  idDepartamento: string;

  @Column({ name: 'id_recibo', nullable: true })
  idRecibo: string;

  @Column({ length: 255 })
  filename: string;

  // filepath ahora es NULLABLE: cuando la foto migra al Drive y
  // se purga el archivo local, este campo queda NULL.
  @Column({ type: 'text', nullable: true })
  filepath: string | null;

  @Column({ name: 'file_size_kb', nullable: true })
  fileSizeKb: number;

  @Column({ name: 'ocr_raw_value', nullable: true, length: 20 })
  ocrRawValue: string;

  @Column({ name: 'ocr_confidence', type: 'numeric', precision: 5, scale: 2, nullable: true })
  ocrConfidence: number;

  @Column({ name: 'ocr_used_red', default: false })
  ocrUsedRed: boolean;

  @Column({ name: 'lectura_final', type: 'numeric', precision: 10, scale: 3, nullable: true })
  lecturaFinal: number;

  @Column({ name: 'ocr_metadata', type: 'jsonb', default: {} })
  ocrMetadata: object;

  @Column({ name: 'expires_at', type: 'date' })
  expiresAt: string;

  @Column({ name: 'created_by', nullable: true })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // ── Storage Gateway integration ──────────────────────────────

  /**
   * Provider donde vive la foto.
   * 'local'        → archivo en /uploads/meters/ del servidor
   * 'google_drive' → archivo en el Drive del cliente (gateway)
   */
  @Column({ name: 'storage_provider', length: 20, default: 'local' })
  storageProvider: StorageProvider;

  /** ID asignado por el gateway. Sirve para pedir la URL de descarga. */
  @Column({ name: 'gateway_file_id', length: 64, nullable: true })
  gatewayFileId: string | null;

  /** URL pública del archivo en Drive. */
  @Column({ name: 'external_url', type: 'text', nullable: true })
  externalUrl: string | null;

  /** Cuándo se subió con éxito al gateway. */
  @Column({ name: 'gateway_uploaded_at', type: 'timestamptz', nullable: true })
  gatewayUploadedAt: Date | null;

  /** Último error al subir. NULL = OK o nunca intentado. */
  @Column({ name: 'gateway_last_error', type: 'text', nullable: true })
  gatewayLastError: string | null;

  /** Contador de intentos de upload (para evitar reintentos infinitos). */
  @Column({ name: 'gateway_attempts', type: 'smallint', default: 0 })
  gatewayAttempts: number;

  /**
   * Momento desde el que el archivo local puede borrarse.
   * Se setea al confirmar subida exitosa al gateway. Da 7 días
   * de gracia antes de que el housekeeping borre el local.
   */
  @Column({ name: 'local_purgeable_at', type: 'timestamptz', nullable: true })
  localPurgeableAt: Date | null;
}
