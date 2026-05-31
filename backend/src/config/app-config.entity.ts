// src/config/app-config.entity.ts
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('app_config')
export class AppConfig {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 100 })
  clave: string;

  @Column({ type: 'jsonb' })
  valor: any;

  @Column({ nullable: true, type: 'text' })
  descripcion: string;
}
