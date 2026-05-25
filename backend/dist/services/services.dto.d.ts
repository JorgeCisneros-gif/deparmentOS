import { TipoServicio, ModoCalculo } from './service.entity';
export declare class CreateServiceDto {
    idEdificio: string;
    nombreServicio: string;
    tipo: TipoServicio;
    modoCalculo: ModoCalculo;
    unidadMedida?: 'm3' | 'kwh' | 'unidad' | null;
    detalleServicio?: Record<string, any>;
}
declare const UpdateServiceDto_base: import("@nestjs/common").Type<Partial<CreateServiceDto>>;
export declare class UpdateServiceDto extends UpdateServiceDto_base {
    activo?: boolean;
}
export {};
