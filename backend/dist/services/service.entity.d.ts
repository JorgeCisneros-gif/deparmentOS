import { Building } from '../buildings/building.entity';
export declare enum TipoServicio {
    AGUA = "agua",
    LUZ = "luz",
    INTERNET = "internet",
    LIMPIEZA = "limpieza",
    MANTENIMIENTO = "mantenimiento",
    OTRO = "otro"
}
export declare enum ModoCalculo {
    POR_CONSUMO_M3 = "por_consumo_m3",
    POR_CONSUMO_AJUSTADO = "por_consumo_ajustado",
    DIVISION_IGUALITARIA = "division_igualitaria",
    PORCENTAJE_ALICUOTA = "porcentaje_alicuota"
}
export type UnidadMedida = 'm3' | 'kwh' | 'unidad' | null;
export declare class Service {
    id: string;
    idEdificio: string;
    edificio: Building;
    nombreServicio: string;
    tipo: TipoServicio;
    modoCalculo: string;
    unidadMedida: UnidadMedida;
    detalleServicio: Record<string, any>;
    activo: boolean;
    createdAt: Date;
    updatedAt: Date;
}
