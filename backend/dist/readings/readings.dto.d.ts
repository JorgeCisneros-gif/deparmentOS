export declare class CreateReadingDto {
    idRecibo: string;
    idDepartamento: string;
    lecturaActual: number;
    lecturaAnterior: number;
    montoCalculado: number;
    esZonaComun?: boolean;
    observacion?: string;
}
declare const UpdateReadingDto_base: import("@nestjs/common").Type<Partial<CreateReadingDto>>;
export declare class UpdateReadingDto extends UpdateReadingDto_base {
}
export declare class ConfirmOcrReadingDto {
    idRecibo: string;
    idDepartamento: string;
    lecturaFinal: number;
    lecturaAnterior: number;
    montoCalculado: number;
    observacion?: string;
}
export {};
