export declare enum TemplateTipo {
    CUOTA_SERVICIOS = "cuota_servicios",
    LIMPIEZA = "limpieza",
    RECORDATORIO_PAGO = "recordatorio_pago",
    BIENVENIDA = "bienvenida",
    AVISO_GENERAL = "aviso_general"
}
export declare class MessageTemplate {
    id: string;
    idEdificio: string;
    tipo: TemplateTipo;
    nombre: string;
    descripcion: string;
    cuerpo: string;
    activo: boolean;
    esDefault: boolean;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
}
