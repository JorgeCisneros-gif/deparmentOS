import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { Building } from '../buildings/building.entity';

@Entity('departamentos')
export class Department {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'id_edificio' })
  idEdificio: string;

  @ManyToOne(() => Building, (b) => b.departamentos)
  @JoinColumn({ name: 'id_edificio' })
  edificio: Building;

  @Column({ name: 'id_propietario', nullable: true })
  idPropietario: string;

  @Column({ name: 'nr_departamento', length: 10 })
  nrDepartamento: string;

  @Column({ type: 'smallint' })
  piso: number;

  @Column({
    type: 'enum',
    enum: ['activo', 'inactivo'],
    default: 'activo',
  })
  status: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
