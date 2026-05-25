export declare class CreatePropietarioDto {
    nombre: string;
    telefono?: string;
    correo?: string;
    banco?: string;
    tipoPago?: string;
    status?: string;
    observacion?: string;
    idDepartamento?: string;
}
declare const UpdatePropietarioDto_base: import("@nestjs/common").Type<Partial<CreatePropietarioDto>>;
export declare class UpdatePropietarioDto extends UpdatePropietarioDto_base {
    status?: string;
}
export {};
