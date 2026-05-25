export declare class CreateDepartmentDto {
    idEdificio: string;
    idPropietario?: string;
    nrDepartamento: string;
    piso: number;
}
declare const UpdateDepartmentDto_base: import("@nestjs/common").Type<Partial<CreateDepartmentDto>>;
export declare class UpdateDepartmentDto extends UpdateDepartmentDto_base {
    status?: string;
}
export {};
