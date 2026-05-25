// src/services/service.entity.ts
import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { Building } from '../buildings/building.entity';

export enum TipoServicio {
  AGUA          = 'agua',
  LUZ           = 'luz',
  INTERNET      = 'internet',
  LIMPIEZA      = 'limpieza',
  MANTENIMIENTO = 'mantenimiento',
  OTRO          = 'otro',
}

export enum ModoCalculo {
  POR_CONSUMO_M3       = 'por_consumo_m3',
  POR_CONSUMO_AJUSTADO = 'por_consumo_ajustado',  // ← nuevo
  DIVISION_IGUALITARIA = 'division_igualitaria',
  PORCENTAJE_ALICUOTA  = 'porcentaje_alicuota',
}

export type UnidadMedida = 'm3' | 'kwh' | 'unidad' | null;

@Entity('servicios')
export class Service {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'id_edificio' })
  idEdificio: string;

  @ManyToOne(() => Building, (b) => b.servicios)
  @JoinColumn({ name: 'id_edificio' })
  edificio: Building;

  @Column({ name: 'nombre_servicio', length: 100 })
  nombreServicio: string;

  @Column({ type: 'enum', enum: TipoServicio })
  tipo: TipoServicio;

  // VARCHAR para permitir nuevos modos sin migración de enum
  @Column({ name: 'modo_calculo', length: 30 })
  modoCalculo: string;

  // Unidad de medida para servicios con medición individual
  // 'm3' → metros cúbicos, 'kwh' → kilovatios hora, null → sin medición
  @Column({ name: 'unidad_medida', length: 10, nullable: true, default: null })
  unidadMedida: UnidadMedida;

  @Column({ name: 'detalle_servicio', type: 'jsonb', default: {} })
  detalleServicio: Record<string, any>;

  @Column({ default: true })
  activo: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
