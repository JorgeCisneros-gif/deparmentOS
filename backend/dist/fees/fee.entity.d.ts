import { Department } from '../departments/department.entity';
export interface MontoServicioItem {
    nombre: string;
    tipo: string;
    modoCalculo: string;
    monto: number;
    idServicio?: string;
    detalle?: Record<string, any>;
}
export declare class Fee {
    id: string;
    idDepartamento: string;
    departamento: Department;
    periodoMes: number;
    periodoAnio: number;
    montosServicios: Record<string, MontoServicioItem>;
    montoTotal: number;
    ajusteMesAnterior: number;
    fechaVencimiento: string;
    statusPago: string;
    mensajeEnviado: boolean;
    fechaMensajeEnviado: Date;
    mensajeEnviadoPor: string;
    detalleJson: object;
    createdAt: Date;
    updatedAt: Date;
}
