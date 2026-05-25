// src/buildings/building.entity.ts
import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, OneToMany, ManyToOne, JoinColumn,
} from 'typeorm';
import { Department } from '../departments/department.entity';
import { Service }    from '../services/service.entity';
import { Pais }       from '../paises/pais.entity';

@Entity('edificios')
export class Building {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 150 })
  nombre: string;

  @Column({ type: 'text' })
  direccion: string;

  @Column({ name: 'nro_depas', default: 0 })
  nroDepas: number;

  @Column({ name: 'cuenta_bbva', nullable: true, length: 30 })
  cuentaBbva: string;

  @Column({ name: 'cuenta_bcp', nullable: true, length: 30 })
  cuentaBcp: string;

  @Column({
    name: 'servicios_activos',
    type: 'jsonb',
    default: { agua: true, luz: true, internet: true },
  })
  serviciosActivos: Record<string, boolean>;

  // ── Campos de localización ────────────────────────────────
  // Timezone IANA del edificio — usado para calcular fechas correctamente.
  // Ejemplo: 'America/Lima', 'America/Santiago', 'America/Sao_Paulo'
  @Column({ length: 60, default: 'America/Lima' })
  timezone: string;

  // Referencia al país (para obtener moneda, locale, timezone)
  @Column({ name: 'pais_id', nullable: true })
  paisId: number;

  @ManyToOne(() => Pais, { nullable: true, eager: true })
  @JoinColumn({ name: 'pais_id' })
  pais: Pais;

  // Moneda del edificio (puede diferir del país en casos de dolarización)
  @Column({ length: 10, default: 'PEN' })
  moneda: string;

  // Locale para formateo de fechas y números
  @Column({ length: 10, default: 'es-PE' })
  locale: string;

  @OneToMany(() => Department, (d) => d.edificio)
  departamentos: Department[];

  @OneToMany(() => Service, (s) => s.edificio)
  servicios: Service[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
