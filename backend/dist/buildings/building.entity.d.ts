import { Department } from '../departments/department.entity';
import { Service } from '../services/service.entity';
import { Pais } from '../paises/pais.entity';
import { Grupo } from '../grupos/grupo.entity';
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
    idAccount: string | null;
    idGrupo: string | null;
    grupo: Grupo;
    departamentos: Department[];
    servicios: Service[];
    createdAt: Date;
    updatedAt: Date;
}
