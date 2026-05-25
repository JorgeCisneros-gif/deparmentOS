import { Service } from '../services/service.entity';
export declare class Receipt {
    id: string;
    idServicio: string;
    servicio: Service;
    nroRecibo: string;
    periodoMes: number;
    periodoAnio: number;
    fechaEmision: string;
    fechaVencimiento: string;
    montoTotalFactura: number;
    m3LecturaActual: number;
    m3LecturaAnterior: number;
    m3ConsumoTotal: number;
    precioM3: number;
    totalUnidadesFactura: number;
    m3Propios: number;
    factorAjuste: number;
    factorEstado: string;
    proveedor: string;
    observacion: string;
    detalleJson: object;
    createdAt: Date;
    updatedAt: Date;
}
