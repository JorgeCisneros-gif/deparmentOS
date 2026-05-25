import { TemplateService } from './template.service';
import { CreateTemplateDto, UpdateTemplateDto, RenderTemplateDto, RenderAllDto } from './template.dto';
import { TemplateTipo } from './template.entity';
export declare class TemplateController {
    private readonly svc;
    constructor(svc: TemplateService);
    create(dto: CreateTemplateDto, req: any): Promise<import("./template.entity").MessageTemplate>;
    findAll(buildingId: string, tipo?: TemplateTipo): Promise<import("./template.entity").MessageTemplate[]>;
    getVariables(tipo?: TemplateTipo): string[] | Record<string, string[]>;
    findOne(id: string): Promise<import("./template.entity").MessageTemplate>;
    preview(id: string): Promise<{
        cuerpo: string;
        renderizado: string;
    }>;
    update(id: string, dto: UpdateTemplateDto): Promise<import("./template.entity").MessageTemplate>;
    deactivate(id: string): Promise<void>;
    renderOne(dto: RenderTemplateDto): Promise<{
        template: {
            id: string;
            nombre: string;
            tipo: string;
        };
        depto: string;
        propietario: string;
        telefono: string;
        mensajeTexto: string;
        variablesUsadas: Record<string, string | number>;
    }>;
    renderAll(dto: RenderAllDto): Promise<{
        template: {
            id: string;
            nombre: string;
            tipo: string;
        };
        totalDeptos: number;
        mensajes: Array<{
            depto: string;
            propietario: string;
            telefono: string;
            mensajeTexto: string;
        }>;
    }>;
}
