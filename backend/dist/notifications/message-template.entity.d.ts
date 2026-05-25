import { Building } from '../buildings/building.entity';
export declare const DEFAULT_TEMPLATE = "\uD83C\uDFE2 *{edificio}* \u2014 Depto *{depto}*\n\nBuenas, le comunicamos su cuota de *{periodo}*:\n\n{lineas_desglose}\n\n*TOTAL: S/. {total}*\n\uD83D\uDCC5 Vence: {vencimiento}\n\n{cuentas}Por favor env\u00EDe el comprobante de pago al confirmar.\n\u00A1Gracias! \uD83D\uDE4F";
export interface CustomVariable {
    nombre: string;
    formula: string;
    descripcion: string;
}
export declare class MessageTemplate {
    id: string;
    idEdificio: string;
    edificio: Building;
    tipo: string;
    nombre: string;
    descripcion: string;
    templateText: string;
    customVariables: CustomVariable[];
    activo: boolean;
    esDefault: boolean;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
}
