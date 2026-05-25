import { Building } from '../buildings/building.entity';
export declare class Department {
    id: string;
    idEdificio: string;
    edificio: Building;
    idPropietario: string;
    nrDepartamento: string;
    piso: number;
    status: string;
    createdAt: Date;
    updatedAt: Date;
}
