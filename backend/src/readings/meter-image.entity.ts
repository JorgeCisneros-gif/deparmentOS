import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';

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

  @Column({ type: 'text' })
  filepath: string;

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
}
