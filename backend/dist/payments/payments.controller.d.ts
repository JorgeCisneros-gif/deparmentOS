import { PaymentsService } from './payments.service';
import { CreatePagoAutoDto, CreatePaymentDto } from './payments.dto';
import { ImageUploadService } from '../shared/image-upload.service';
import { FeesService } from '../fees/fees.service';
import { StorageGatewayService } from '../storage-gateway/storage-gateway.service';
export declare class PaymentsController {
    private readonly svc;
    private readonly imageUpload;
    private readonly feesService;
    private readonly storageGateway;
    private readonly logger;
    constructor(svc: PaymentsService, imageUpload: ImageUploadService, feesService: FeesService, storageGateway: StorageGatewayService);
    housekeeping(): Promise<{
        retried: number;
        retriedOk: number;
        purgedLocal: number;
    }>;
    getMyFees(req: any, year?: number, month?: number): Promise<import("../fees/fee.entity").Fee[]>;
    getPendingApproval(): Promise<any[]>;
    periodSummary(buildingId: string, month: number, year: number): Promise<{
        resumen: {
            totalDeptos: number;
            pagados: number;
            pendientes: number;
            mensajesEnviados: number;
            montoPendiente: number;
            periodoCerrado: boolean;
        };
        serviciosEdificio: {
            id: string;
            tipo: import("../services/service.entity").TipoServicio;
            nombre: string;
            activo: boolean;
            modoCalculo: string;
            unidadMedida: import("../services/service.entity").UnidadMedida;
        }[];
        departamentos: {
            feeId: string;
            depto: string;
            idDepartamento: string;
            montosServicios: Record<string, import("../fees/fee.entity").MontoServicioItem>;
            desglose: {
                key: string;
                tipo: string;
                label: string;
                monto: number;
                activo: boolean;
            }[];
            montoTotal: number;
            ajuste: number;
            statusPago: string;
            mensajeEnviado: boolean;
            fechaMensajeEnviado: Date;
            totalPagado: number;
            saldo: number;
            pagos: {
                id: string;
                monto: number;
                montoCancelado: number;
                tipoPago: string;
                banco: string;
                fechaPago: string;
                referencia: string;
                comprobanteUrl: string;
                estadoPago: string;
                aprobadoPor: string;
                voucherId: string;
            }[];
            medicionPorServicio: any;
            medicion: {
                idMeterImage: any;
                ocrValor: any;
                confianza: any;
                m3Consumido: number;
            };
            fechaVencimiento: string;
        }[];
    }>;
    pending(buildingId: string, month: number, year: number): Promise<any[]>;
    findAll(feeId?: string, ownerId?: string): Promise<import("./payment.entity").Payment[]>;
    getVoucherContent(id: string, reply: any): Promise<void>;
    create(dto: CreatePaymentDto): Promise<import("./payment.entity").Payment>;
    createPropietario(dto: CreatePagoAutoDto, req: any): Promise<import("./payment.entity").Payment>;
    findOne(id: string): Promise<import("./payment.entity").Payment>;
    uploadComprobante(id: string, body: {
        base64: string;
        filename: string;
    }, req: any): Promise<{
        voucherId: string;
        storageProvider: import("./payment-voucher.entity").StorageProvider;
        filename: string;
    }>;
    approve(id: string, req: any): Promise<import("./payment.entity").Payment>;
    reject(id: string, req: any): Promise<import("./payment.entity").Payment>;
    private guessMimeType;
}
