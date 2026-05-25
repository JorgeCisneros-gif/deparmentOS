export declare class CreatePaymentDto {
    idCuota: string;
    idPropietario?: string;
    fechaPago: string;
    montoCancelado: number;
    tipoPago: string;
    banco?: string;
    referencia?: string;
    observacion?: string;
}
export declare class CreatePagoAutoDto {
    idCuota: string;
    montoCancelado: number;
    tipoPago: string;
    banco?: string;
    referencia?: string;
    observacion?: string;
    fechaPago: string;
}
