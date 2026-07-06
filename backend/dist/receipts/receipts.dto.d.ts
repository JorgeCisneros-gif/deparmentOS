export declare class CreateReceiptDto {
    idServicio: string;
    nroRecibo?: string;
    periodoMes: number;
    periodoAnio: number;
    fechaEmision?: string;
    fechaVencimiento?: string;
    montoTotalFactura: number;
    m3LecturaActual?: number;
    m3LecturaAnterior?: number;
    proveedor?: string;
    observacion?: string;
    detalleJson?: object;
    totalUnidadesFactura?: number;
    m3Propios?: number;
    factorAjuste?: number;
    factorEstado?: string;
}
declare const UpdateReceiptDto_base: import("@nestjs/common").Type<Partial<CreateReceiptDto>>;
export declare class UpdateReceiptDto extends UpdateReceiptDto_base {
    status?: string;
}
export {};
