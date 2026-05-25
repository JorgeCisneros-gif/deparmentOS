import { Repository } from 'typeorm';
import { Alicuota } from './alicuota.entity';
import { Department } from '../departments/department.entity';
export interface AlicuotaLineDto {
    idDepartamento: string;
    porcentaje: number;
}
export declare class AlicuotasService {
    private readonly repo;
    private readonly dRepo;
    constructor(repo: Repository<Alicuota>, dRepo: Repository<Department>);
    getForPeriod(idServicio: string, idEdificio: string, mes: number, anio: number): Promise<{
        periodoMes: number;
        periodoAnio: number;
        sumaPorcentajes: number;
        completo: boolean;
        departamentos: {
            id: string;
            nrDepartamento: string;
            piso: number;
            propietario: string;
            porcentaje: number;
            ultimoValor: number;
        }[];
    }>;
    saveForPeriod(idServicio: string, mes: number, anio: number, lineas: AlicuotaLineDto[]): Promise<{
        message: string;
        suma: number;
        completo: boolean;
    }>;
    getPorcentaje(idDepartamento: string, idServicio: string, mes: number, anio: number): Promise<number>;
}
