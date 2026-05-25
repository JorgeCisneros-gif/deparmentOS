import { Building } from '../buildings/building.entity';
import { PagoGasto } from './pago-gasto.entity';
export type EstadoGasto = 'activo' | 'cerrado' | 'anulado';
export declare class GastoExtra {
    id: string;
    idEdificio: string;
    edificio: Building;
    nombre: string;
    descripcion: string;
    fechaInicio: string;
    fechaFin: string;
    listaDepartamentos: string[] | null;
    estado: EstadoGasto;
    montoGasto: number;
    montoPorDepto: number;
    pagos: PagoGasto[];
    createdAt: Date;
    updatedAt: Date;
}
