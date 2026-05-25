import { AlicuotasService } from './alicuotas.service';
declare class AlicuotaLineaDto {
    idDepartamento: string;
    porcentaje: number;
}
declare class SaveAlicuotasDto {
    lineas: AlicuotaLineaDto[];
}
export declare class AlicuotasController {
    private readonly svc;
    constructor(svc: AlicuotasService);
    getForPeriod(servicioId: string, edificioId: string, month: number, year: number): Promise<{
        periodoMes: number;
        periodoAnio: number;
        sumaPorcentajes: number;
        completo: boolean;
        departamentos: {
            id: string;
            nrDepartamento: string;
            piso: number;
            propietario: string;
            porcentaje: number;
            ultimoValor: number;
        }[];
    }>;
    saveForPeriod(servicioId: string, month: number, year: number, dto: SaveAlicuotasDto): Promise<{
        message: string;
        suma: number;
        completo: boolean;
    }>;
}
export {};
