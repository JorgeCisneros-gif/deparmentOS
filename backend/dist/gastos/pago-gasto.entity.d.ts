import { GastoExtra } from './gasto-extra.entity';
import { Department } from '../departments/department.entity';
export declare class PagoGasto {
    id: string;
    idGastoExtra: string;
    gastoExtra: GastoExtra;
    idDepartamento: string;
    departamento: Department;
    fechaPago: string;
    monto: number;
    tipoPago: string;
    banco: string;
    referencia: string;
    comprobanteUrl: string;
    observacion: string;
    createdAt: Date;
    updatedAt: Date;
}
