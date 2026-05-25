import { Department } from '../departments/department.entity';
import { Service } from '../services/service.entity';
export declare class Alicuota {
    id: string;
    idDepartamento: string;
    departamento: Department;
    idServicio: string;
    servicio: Service;
    porcentaje: number;
    periodoMes: number;
    periodoAnio: number;
    createdAt: Date;
}
