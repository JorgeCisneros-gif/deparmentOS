export declare class CreateBuildingDto {
    nombre: string;
    direccion: string;
    nroDepas?: number;
    cuentaBbva?: string;
    cuentaBcp?: string;
    serviciosActivos?: Record<string, boolean>;
}
declare const UpdateBuildingDto_base: import("@nestjs/common").Type<Partial<CreateBuildingDto>>;
export declare class UpdateBuildingDto extends UpdateBuildingDto_base {
}
export {};
