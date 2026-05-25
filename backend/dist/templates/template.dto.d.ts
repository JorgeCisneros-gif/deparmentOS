import { TemplateTipo } from './template.entity';
export declare class CreateTemplateDto {
    idEdificio: string;
    tipo: TemplateTipo;
    nombre: string;
    descripcion?: string;
    cuerpo: string;
    esDefault?: boolean;
}
declare const UpdateTemplateDto_base: import("@nestjs/common").Type<Partial<CreateTemplateDto>>;
export declare class UpdateTemplateDto extends UpdateTemplateDto_base {
}
export declare class RenderTemplateDto {
    templateId: string;
    feeId?: string;
    cleaningRecordId?: string;
    departamentoId?: string;
    variablesExtra?: Record<string, string>;
}
export declare class RenderAllDto {
    templateId: string;
    idEdificio: string;
    feeId?: string;
    cleaningRecordId?: string;
    variablesExtra?: Record<string, string>;
}
export {};
