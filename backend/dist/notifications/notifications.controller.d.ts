import { NotificationsService, UpdateFeeForMessageDto } from './notifications.service';
import { CustomVariable } from './message-template.entity';
export declare class NotificationsController {
    private readonly svc;
    constructor(svc: NotificationsService);
    getSystemVars(): {
        sistema: {
            variable: string;
            descripcion: string;
            tipo: string;
        }[];
        servicios: {
            variable: string;
            descripcion: string;
            tipo: string;
            emoji: string;
        }[];
    };
    getAllVars(buildingId: string): Promise<{
        sistema: {
            variable: string;
            descripcion: string;
            tipo: string;
        }[];
        servicios: {
            variable: string;
            descripcion: string;
            tipo: string;
            emoji: string;
        }[];
        personalizadas: {
            variable: string;
            descripcion: string;
            tipo: string;
            formula: string;
        }[];
    }>;
    getCustomVars(buildingId: string): Promise<CustomVariable[]>;
    saveCustomVars(buildingId: string, body: {
        variables: CustomVariable[];
    }): Promise<CustomVariable[]>;
    getTemplate(buildingId: string): Promise<import("./message-template.entity").MessageTemplate>;
    saveTemplate(buildingId: string, body: {
        templateText: string;
        nombre?: string;
    }): Promise<import("./message-template.entity").MessageTemplate>;
    resetTemplate(buildingId: string): Promise<import("./message-template.entity").MessageTemplate>;
    updateFee(feeId: string, dto: UpdateFeeForMessageDto): Promise<import("../fees/fee.entity").Fee>;
    getMessage(feeId: string): Promise<import("./notifications.service").MessagePayload>;
    getMessagesPeriod(buildingId: string, month: number, year: number): Promise<{
        totalDeptos: number;
        mensajesGenerados: number;
        mensajes: import("./notifications.service").MessagePayload[];
    }>;
    confirmOne(feeId: string, req: any, body?: {
        fechaMensajeEnviado?: string;
    }): Promise<{
        mensaje: string;
        pagoHabilitado: boolean;
        cuota: {
            id: string;
            mensajeEnviado: boolean;
            fechaMensajeEnviado: Date;
            statusPago: string;
        };
    }>;
    confirmAll(buildingId: string, month: number, year: number, req: any): Promise<{
        confirmados: number;
        yaConfirmados: number;
    }>;
}
