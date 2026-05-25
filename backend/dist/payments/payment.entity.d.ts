import { Fee } from '../fees/fee.entity';
export declare class Payment {
    id: string;
    idCuota: string;
    cuota: Fee;
    idPropietario: string;
    fechaPago: string;
    montoCancelado: number;
    tipoPago: string;
    banco: string;
    referencia: string;
    comprobanteUrl: string;
    observacion: string;
    createdAt: Date;
    updatedAt: Date;
    estadoPago: string;
    aprobadoPor: string;
    fechaAprobacion: Date;
}
