export declare class CreateGastoDto {
    idEdificio: string;
    nombre: string;
    descripcion?: string;
    fechaInicio: string;
    fechaFin?: string;
    listaDepartamentos?: string[] | null;
    montoGasto: number;
}
export declare class UpdateGastoDto {
    nombre?: string;
    descripcion?: string;
    fechaFin?: string;
    listaDepartamentos?: string[] | null;
    montoGasto?: number;
    estado?: 'activo' | 'cerrado' | 'anulado';
}
export declare class CreatePagoGastoDto {
    idGastoExtra: string;
    idDepartamento: string;
    fechaPago: string;
    monto: number;
    tipoPago: 'efectivo' | 'transferencia' | 'yape' | 'plin' | 'otro';
    banco?: 'bcp' | 'bbva' | 'interbank' | 'scotiabank' | 'otro';
    referencia?: string;
    comprobanteUrl?: string;
    observacion?: string;
}
