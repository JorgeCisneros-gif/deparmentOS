import { Receipt } from '../receipts/receipt.entity';
import { Department } from '../departments/department.entity';
export declare class Reading {
    id: string;
    idRecibo: string;
    recibo: Receipt;
    idDepartamento: string;
    departamento: Department;
    lecturaActual: number;
    lecturaAnterior: number;
    m3Consumido: number;
    montoCalculado: number;
    esZonaComun: boolean;
    observacion: string;
    idMeterImage: string;
    createdAt: Date;
    updatedAt: Date;
}
