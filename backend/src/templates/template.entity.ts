import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

export enum TemplateTipo {
  CUOTA_SERVICIOS   = 'cuota_servicios',
  LIMPIEZA          = 'limpieza',
  RECORDATORIO_PAGO = 'recordatorio_pago',
  BIENVENIDA        = 'bienvenida',
  AVISO_GENERAL     = 'aviso_general',
}

@Entity('message_templates')
export class MessageTemplate {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Column({ name: 'id_edificio' }) idEdificio: string;

  @Column({ type: 'enum', enum: TemplateTipo }) tipo: TemplateTipo;

  @Column({ length: 100 }) nombre: string;

  @Column({ nullable: true, type: 'text' }) descripcion: string;

  @Column({ type: 'text' }) cuerpo: string;

  @Column({ default: true }) activo: boolean;

  @Column({ name: 'es_default', default: false }) esDefault: boolean;

  @Column({ name: 'created_by', nullable: true }) createdBy: string;

  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
