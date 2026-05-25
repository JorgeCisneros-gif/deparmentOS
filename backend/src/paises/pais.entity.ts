// src/paises/pais.entity.ts
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('paises')
export class Pais {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 3, unique: true })
  codigo: string;

  @Column({ length: 100 })
  nombre: string;

  @Column({ length: 60 })
  timezone: string;

  @Column({ length: 10, default: 'USD' })
  moneda: string;

  @Column({ length: 10, default: 'es' })
  locale: string;

  @Column({ default: true })
  activo: boolean;
}
