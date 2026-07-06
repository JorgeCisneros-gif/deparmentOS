import { Repository } from 'typeorm';
import { Payment } from './payment.entity';
import { PaymentVoucher } from './payment-voucher.entity';
import { Fee, MontoServicioItem } from '../fees/fee.entity';
import { Service } from '../services/service.entity';
import { CreatePagoAutoDto, CreatePaymentDto } from './payments.dto';
import { FeesService } from '../fees/fees.service';
import { ImageUploadService } from '../shared/image-upload.service';
import { StorageGatewayService } from '../storage-gateway/storage-gateway.service';
export declare class PaymentsService {
    private readonly repo;
    private readonly feeRepo;
    private readonly serviceRepo;
    private readonly voucherRepo;
    private readonly feesService;
    private readonly imageUpload;
    private readonly storageGateway;
    private readonly logger;
    constructor(repo: Repository<Payment>, feeRepo: Repository<Fee>, serviceRepo: Repository<Service>, voucherRepo: Repository<PaymentVoucher>, feesService: FeesService, imageUpload: ImageUploadService, storageGateway: StorageGatewayService);
    create(dto: CreatePaymentDto): Promise<Payment>;
    uploadVoucher(params: {
        paymentId: string;
        base64: string;
        filename: string;
        uploadedBy: string;
    }): Promise<PaymentVoucher>;
    private tryUploadToGateway;
    private resolveVoucherContext;
    getVoucherById(id: string): Promise<PaymentVoucher | null>;
    getVouchersByPayment(paymentId: string): Promise<PaymentVoucher[]>;
    resolveOrgIdForVoucher(voucherId: string): Promise<{
        idGrupo: string;
    } | null>;
    getGatewayFileId(voucherId: string): Promise<string | null>;
    runHousekeeping(): Promise<{
        retried: number;
        retriedOk: number;
        purgedLocal: number;
    }>;
    private retryPendingUploads;
    private purgeLocalFiles;
    getPeriodSummary(idEdificio: string, mes: number, anio: number): Promise<{
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
            montosServicios: Record<string, MontoServicioItem>;
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
    findAll(idCuota?: string, idPropietario?: string): Promise<Payment[]>;
    findOne(id: string): Promise<Payment>;
    getPendingByBuilding(idEdificio: string, mes: number, anio: number): Promise<any[]>;
    createPropietario(dto: CreatePagoAutoDto, idPropietario: string): Promise<Payment>;
    approvePayment(paymentId: string, supervisorId: string): Promise<Payment>;
    rejectPayment(paymentId: string, supervisorId: string): Promise<Payment>;
    getPendingApproval(): Promise<any[]>;
}
