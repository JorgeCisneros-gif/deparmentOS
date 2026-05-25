export declare class CleaningProvider {
    id: string;
    idEdificio: string;
    nombre: string;
    telefono: string;
    banco: string;
    tipoCuenta: string;
    nroCuenta: string;
    costoPorDia: number;
    activo: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export declare class CleaningArea {
    id: string;
    idEdificio: string;
    nombre: string;
    descripcion: string;
    costoExtra: number;
    activo: boolean;
    orden: number;
    createdAt: Date;
    updatedAt: Date;
}
export declare class CleaningRecord {
    id: string;
    idEdificio: string;
    idProveedor: string;
    proveedor: CleaningProvider;
    periodoMes: number;
    periodoAnio: number;
    diasTrabajados: number;
    ambientesIds: string[];
    detalleDias: object[];
    costoBase: number;
    costoAmbientes: number;
    montoTotal: number;
    pagoProveedorStatus: string;
    pagoProveedorFecha: string;
    pagoProveedorRef: string;
    mensajeEnviado: boolean;
    fechaMensajeEnviado: Date;
    mensajeEnviadoPor: string;
    observaciones: string;
    createdAt: Date;
    updatedAt: Date;
}
