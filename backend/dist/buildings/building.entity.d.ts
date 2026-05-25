import { Department } from '../departments/department.entity';
import { Service } from '../services/service.entity';
import { Pais } from '../paises/pais.entity';
export declare class Building {
    id: string;
    nombre: string;
    direccion: string;
    nroDepas: number;
    cuentaBbva: string;
    cuentaBcp: string;
    serviciosActivos: Record<string, boolean>;
    timezone: string;
    paisId: number;
    pais: Pais;
    moneda: string;
    locale: string;
    departamentos: Department[];
    servicios: Service[];
    createdAt: Date;
    updatedAt: Date;
}
