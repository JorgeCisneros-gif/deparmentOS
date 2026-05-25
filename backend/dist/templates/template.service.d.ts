import { Repository } from 'typeorm';
import { MessageTemplate, TemplateTipo } from './template.entity';
import { CreateTemplateDto, UpdateTemplateDto, RenderTemplateDto, RenderAllDto } from './template.dto';
export declare class TemplateService {
    private readonly repo;
    constructor(repo: Repository<MessageTemplate>);
    create(dto: CreateTemplateDto, userId: string): Promise<MessageTemplate>;
    findAll(idEdificio: string, tipo?: TemplateTipo): Promise<MessageTemplate[]>;
    findOne(id: string): Promise<MessageTemplate>;
    findDefault(idEdificio: string, tipo: TemplateTipo): Promise<MessageTemplate | null>;
    update(id: string, dto: UpdateTemplateDto): Promise<MessageTemplate>;
    deactivate(id: string): Promise<void>;
    getVariables(tipo?: TemplateTipo): Record<string, string[]> | string[];
    preview(id: string): Promise<{
        cuerpo: string;
        renderizado: string;
    }>;
    renderForOne(dto: RenderTemplateDto): Promise<{
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
    renderForAll(dto: RenderAllDto): Promise<{
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
    private resolveVars;
}
