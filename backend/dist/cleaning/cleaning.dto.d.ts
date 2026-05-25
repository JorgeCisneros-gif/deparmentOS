export declare class CreateProviderDto {
    idEdificio: string;
    nombre: string;
    telefono?: string;
    banco?: string;
    tipoCuenta?: string;
    nroCuenta?: string;
    costoPorDia: number;
}
declare const UpdateProviderDto_base: import("@nestjs/common").Type<Partial<CreateProviderDto>>;
export declare class UpdateProviderDto extends UpdateProviderDto_base {
}
export declare class CreateAreaDto {
    idEdificio: string;
    nombre: string;
    descripcion?: string;
    costoExtra?: number;
    orden?: number;
}
declare const UpdateAreaDto_base: import("@nestjs/common").Type<Partial<CreateAreaDto>>;
export declare class UpdateAreaDto extends UpdateAreaDto_base {
    activo?: boolean;
}
export declare class DiaLimpiezaDto {
    fecha: string;
    ambientes?: string[];
    nota?: string;
}
export declare class CreateCleaningRecordDto {
    idEdificio: string;
    idProveedor: string;
    periodoMes: number;
    periodoAnio: number;
    diasTrabajados: number;
    ambientesIds?: string[];
    detalleDias?: DiaLimpiezaDto[];
    observaciones?: string;
}
declare const UpdateCleaningRecordDto_base: import("@nestjs/common").Type<Partial<CreateCleaningRecordDto>>;
export declare class UpdateCleaningRecordDto extends UpdateCleaningRecordDto_base {
    pagoProveedorStatus?: string;
    pagoProveedorFecha?: string;
    pagoProveedorRef?: string;
}
export declare class ConfirmProviderPaymentDto {
    fecha: string;
    referencia?: string;
}
export {};
