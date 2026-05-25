import { Repository } from 'typeorm';
import { Fee } from '../fees/fee.entity';
import { MessageTemplate, CustomVariable } from './message-template.entity';
export interface MessagePayload {
    depto: string;
    propietario: string;
    telefono: string;
    mensajeTexto: string;
    desglose: {
        lineas: Array<{
            key: string;
            label: string;
            monto: number;
            tipo: string;
        }>;
        total: number;
        m3Consumido?: number;
        precioM3?: number;
    };
    periodo: string;
    fechaVencimiento: string;
    mensajeEnviado: boolean;
}
export interface UpdateFeeForMessageDto {
    montosServicios?: Record<string, {
        monto: number;
    }>;
    fechaVencimiento?: string;
    ajusteMesAnterior?: number;
}
export declare class NotificationsService {
    private readonly feeRepo;
    private readonly templateRepo;
    private readonly logger;
    constructor(feeRepo: Repository<Fee>, templateRepo: Repository<MessageTemplate>);
    getSystemVariables(): {
        variable: string;
        descripcion: string;
        tipo: string;
    }[];
    getServiceVariables(): {
        variable: string;
        descripcion: string;
        tipo: string;
        emoji: string;
    }[];
    getAllVariables(idEdificio: string): Promise<{
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
    getCustomVariables(idEdificio: string): Promise<CustomVariable[]>;
    saveCustomVariables(idEdificio: string, variables: CustomVariable[]): Promise<CustomVariable[]>;
    private evaluateFormula;
    getTemplate(idEdificio: string): Promise<MessageTemplate>;
    private buildDefaultTemplate;
    saveTemplate(idEdificio: string, templateText: string, nombre?: string): Promise<MessageTemplate>;
    resetTemplate(idEdificio: string): Promise<MessageTemplate>;
    updateFeeForMessage(feeId: string, dto: UpdateFeeForMessageDto): Promise<Fee>;
    generateMessageForFee(feeId: string): Promise<MessagePayload>;
    generateMessagesForPeriod(idEdificio: string, periodoMes: number, periodoAnio: number): Promise<{
        totalDeptos: number;
        mensajesGenerados: number;
        mensajes: MessagePayload[];
    }>;
    confirmMessageSent(feeId: string, supervisorId: string, fechaMensajeEnviado?: string): Promise<{
        mensaje: string;
        pagoHabilitado: boolean;
        cuota: {
            id: string;
            mensajeEnviado: boolean;
            fechaMensajeEnviado: Date;
            statusPago: string;
        };
    }>;
    confirmAllMessagesSent(idEdificio: string, periodoMes: number, periodoAnio: number, supervisorId: string): Promise<{
        confirmados: number;
        yaConfirmados: number;
    }>;
}
