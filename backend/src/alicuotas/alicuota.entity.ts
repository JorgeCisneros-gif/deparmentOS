// src/alicuotas/alicuota.entity.ts
import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, ManyToOne, JoinColumn, Unique,
} from 'typeorm';
import { Department } from '../departments/department.entity';
import { Service } from '../services/service.entity';

@Entity('alicuotas_departamento')
@Unique(['idDepartamento', 'idServicio', 'periodoMes', 'periodoAnio'])
export class Alicuota {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'id_departamento' })
  idDepartamento: string;

  @ManyToOne(() => Department)
  @JoinColumn({ name: 'id_departamento' })
  departamento: Department;

  @Column({ name: 'id_servicio' })
  idServicio: string;

  @ManyToOne(() => Service)
  @JoinColumn({ name: 'id_servicio' })
  servicio: Service;

  @Column({ type: 'decimal', precision: 7, scale: 4 })
  porcentaje: number;

  @Column({ name: 'periodo_mes', type: 'smallint' })
  periodoMes: number;

  @Column({ name: 'periodo_anio', type: 'smallint' })
  periodoAnio: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
