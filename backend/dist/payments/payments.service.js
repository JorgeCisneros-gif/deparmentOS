"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var PaymentsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const payment_entity_1 = require("./payment.entity");
const payment_voucher_entity_1 = require("./payment-voucher.entity");
const fee_entity_1 = require("../fees/fee.entity");
const service_entity_1 = require("../services/service.entity");
const fees_service_1 = require("../fees/fees.service");
const image_upload_service_1 = require("../shared/image-upload.service");
const storage_gateway_service_1 = require("../storage-gateway/storage-gateway.service");
const HK_MAX_RETRY_ATTEMPTS = 5;
const HK_LOCAL_RETENTION_DAYS = 7;
const HK_BATCH_SIZE = 50;
const MESES_CORTO = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
let PaymentsService = PaymentsService_1 = class PaymentsService {
    constructor(repo, feeRepo, serviceRepo, voucherRepo, feesService, imageUpload, storageGateway) {
        this.repo = repo;
        this.feeRepo = feeRepo;
        this.serviceRepo = serviceRepo;
        this.voucherRepo = voucherRepo;
        this.feesService = feesService;
        this.imageUpload = imageUpload;
        this.storageGateway = storageGateway;
        this.logger = new common_1.Logger(PaymentsService_1.name);
    }
    async create(dto) {
        const fee = await this.feesService.findOne(dto.idCuota);
        if (!fee.mensajeEnviado) {
            throw new common_1.BadRequestException(`Primero confirma el envío del mensaje al propietario del depto ${fee.departamento?.nrDepartamento || ''}.`);
        }
        if (fee.statusPago === 'pagado') {
            throw new common_1.BadRequestException(`La cuota del depto ${fee.departamento?.nrDepartamento || ''} ya está completamente pagada.`);
        }
        const payment = await this.repo.save(this.repo.create(dto));
        const allPayments = await this.repo.find({ where: { idCuota: dto.idCuota } });
        const totalPagado = allPayments.reduce((sum, p) => sum + parseFloat(p.montoCancelado), 0);
        const montoTotal = parseFloat(fee.montoTotal);
        let newStatus = 'pendiente';
        if (totalPagado >= montoTotal)
            newStatus = 'pagado';
        else if (totalPagado > 0)
            newStatus = 'parcial';
        await this.feesService.updateStatus(dto.idCuota, newStatus);
        return payment;
    }
    async uploadVoucher(params) {
        const payment = await this.findOne(params.paymentId);
        const localPath = this.imageUpload.saveBase64(params.base64, params.filename, `comprobante_${params.paymentId}`, { subdir: 'comprobantes' });
        const ext = path.extname(params.filename).toLowerCase().slice(1) || 'jpg';
        const mimeType = ext === 'png' ? 'image/png'
            : ext === 'webp' ? 'image/webp'
                : 'image/jpeg';
        let sizeKb = 0;
        try {
            const stat = fs.statSync(localPath);
            sizeKb = Math.round(stat.size / 1024);
        }
        catch (e) { }
        const voucher = this.voucherRepo.create({
            idPago: params.paymentId,
            filename: path.basename(localPath),
            filepath: localPath,
            mimeType,
            sizeKb,
            storageProvider: 'local',
            gatewayAttempts: 0,
            uploadedBy: params.uploadedBy,
        });
        await this.voucherRepo.save(voucher);
        await this.tryUploadToGateway(voucher, payment);
        payment.comprobanteUrl = '/' + localPath.replace(/^\.?\//, '').replace(/\\/g, '/');
        await this.repo.save(payment);
        return voucher;
    }
    async tryUploadToGateway(voucher, payment) {
        if (!this.storageGateway.isEnabled()) {
            this.logger.warn(`Storage Gateway no configurado, voucher ${voucher.id} queda en local`);
            return;
        }
        try {
            const ctx = await this.resolveVoucherContext(voucher.id);
            if (!ctx)
                throw new Error('No se pudo resolver el contexto del voucher');
            if (!voucher.filepath || !fs.existsSync(voucher.filepath)) {
                throw new Error('Archivo local no encontrado');
            }
            const buffer = fs.readFileSync(voucher.filepath);
            const subFolder = `Comprobantes-Pagos`;
            const customFileName = `pago_${ctx.nrDepartamento}_${MESES_CORTO[ctx.periodoMes]}-${ctx.periodoAnio}_${Date.now()}`;
            const uploadResult = await this.storageGateway.uploadFile({
                orgId: ctx.idGrupo,
                entityType: 'payment_voucher',
                entityId: voucher.id,
                subFolder,
                customFileName,
                fileBuffer: buffer,
                fileName: voucher.filename,
                mimeType: voucher.mimeType || 'image/jpeg',
            });
            voucher.storageProvider = 'google_drive';
            voucher.gatewayFileId = uploadResult.fileId;
            voucher.externalUrl = uploadResult.externalUrl || null;
            voucher.gatewayUploadedAt = new Date();
            voucher.gatewayLastError = null;
            voucher.gatewayAttempts += 1;
            const purgeDate = new Date();
            purgeDate.setDate(purgeDate.getDate() + HK_LOCAL_RETENTION_DAYS);
            voucher.localPurgeableAt = purgeDate;
            await this.voucherRepo.save(voucher);
            this.logger.log(`Voucher ${voucher.id} subido al Drive: ${uploadResult.fileId}`);
        }
        catch (err) {
            voucher.gatewayAttempts += 1;
            voucher.gatewayLastError = (err.message || 'Error desconocido').slice(0, 500);
            await this.voucherRepo.save(voucher);
            this.logger.warn(`Voucher ${voucher.id} no pudo subirse al Drive (intento ${voucher.gatewayAttempts}): ${err.message}`);
        }
    }
    async resolveVoucherContext(voucherId) {
        const rows = await this.voucherRepo.query(`
      SELECT
        e.id_grupo            AS "idGrupo",
        d.nr_departamento     AS "nrDepartamento",
        f.periodo_mes         AS "periodoMes",
        f.periodo_anio        AS "periodoAnio"
      FROM payment_vouchers pv
      JOIN pagos p             ON p.id = pv.id_pago
      JOIN cuotas_departamento f ON f.id = p.id_cuota
      JOIN departamentos d     ON d.id = f.id_departamento
      JOIN edificios e         ON e.id = d.id_edificio
      WHERE pv.id = $1
      LIMIT 1
      `, [voucherId]);
        if (!rows || rows.length === 0)
            return null;
        return rows[0];
    }
    async getVoucherById(id) {
        return this.voucherRepo.findOne({ where: { id } });
    }
    async getVouchersByPayment(paymentId) {
        return this.voucherRepo.find({
            where: { idPago: paymentId },
            order: { createdAt: 'ASC' },
        });
    }
    async resolveOrgIdForVoucher(voucherId) {
        return this.resolveVoucherContext(voucherId);
    }
    async getGatewayFileId(voucherId) {
        const v = await this.voucherRepo.findOne({ where: { id: voucherId } });
        return v?.gatewayFileId ?? null;
    }
    async runHousekeeping() {
        this.logger.log('[VouchersHousekeeping] Iniciando...');
        const retried = await this.retryPendingUploads();
        const purged = await this.purgeLocalFiles();
        this.logger.log(`[VouchersHousekeeping] Retried=${retried.total} (ok=${retried.ok}) Purged=${purged}`);
        return {
            retried: retried.total,
            retriedOk: retried.ok,
            purgedLocal: purged,
        };
    }
    async retryPendingUploads() {
        const vouchers = await this.voucherRepo
            .createQueryBuilder('v')
            .where('v.storage_provider = :p', { p: 'local' })
            .andWhere('v.filepath IS NOT NULL')
            .andWhere('v.gateway_attempts < :max', { max: HK_MAX_RETRY_ATTEMPTS })
            .orderBy('v.created_at', 'ASC')
            .limit(HK_BATCH_SIZE)
            .getMany();
        if (vouchers.length === 0)
            return { total: 0, ok: 0 };
        let ok = 0;
        for (const voucher of vouchers) {
            const payment = await this.repo.findOne({ where: { id: voucher.idPago } });
            if (!payment)
                continue;
            await this.tryUploadToGateway(voucher, payment);
            const updated = await this.voucherRepo.findOne({ where: { id: voucher.id } });
            if (updated?.storageProvider === 'google_drive')
                ok++;
        }
        return { total: vouchers.length, ok };
    }
    async purgeLocalFiles() {
        const now = new Date();
        const vouchers = await this.voucherRepo
            .createQueryBuilder('v')
            .where('v.storage_provider = :p', { p: 'google_drive' })
            .andWhere('v.filepath IS NOT NULL')
            .andWhere('v.local_purgeable_at IS NOT NULL')
            .andWhere('v.local_purgeable_at < :now', { now })
            .limit(HK_BATCH_SIZE)
            .getMany();
        let purged = 0;
        for (const voucher of vouchers) {
            if (!voucher.filepath)
                continue;
            try {
                if (fs.existsSync(voucher.filepath)) {
                    fs.unlinkSync(voucher.filepath);
                }
                voucher.filepath = null;
                await this.voucherRepo.save(voucher);
                purged++;
            }
            catch (err) {
                this.logger.warn(`No se pudo purgar ${voucher.filepath}: ${err.message}`);
            }
        }
        return purged;
    }
    async getPeriodSummary(idEdificio, mes, anio) {
        const todosLosServicios = await this.serviceRepo.find({ where: { idEdificio } });
        const serviciosPorId = {};
        for (const s of todosLosServicios) {
            serviciosPorId[s.id] = { activo: s.activo, nombre: s.nombreServicio, tipo: s.tipo };
        }
        const fees = await this.feeRepo
            .createQueryBuilder('f')
            .leftJoinAndSelect('f.departamento', 'd')
            .leftJoin('d.edificio', 'e')
            .where('e.id = :idEdificio', { idEdificio })
            .andWhere('f.periodo_mes = :mes', { mes })
            .andWhere('f.periodo_anio = :anio', { anio })
            .orderBy('d.nrDepartamento', 'ASC')
            .getMany();
        const result = await Promise.all(fees.map(async (fee) => {
            const pagos = await this.repo.find({ where: { idCuota: fee.id } });
            const totalPagado = pagos.reduce((s, p) => s + parseFloat(p.montoCancelado), 0);
            const medicionData = await this.feeRepo.query(`SELECT md.id, md.id_meter_image, md.m3_consumido, mi.filename, mi.ocr_raw_value, mi.ocr_confidence,
                rs.id_servicio, s.tipo AS servicio_tipo
         FROM mediciones_departamento md
         INNER JOIN recibos_servicio rs ON rs.id = md.id_recibo
         INNER JOIN servicios s ON s.id = rs.id_servicio
         LEFT JOIN meter_images mi ON mi.id = md.id_meter_image
         WHERE md.id_departamento = $1
           AND rs.periodo_mes = $2
           AND rs.periodo_anio = $3`, [fee.idDepartamento, fee.periodoMes, fee.periodoAnio]);
            const montosServicios = fee.montosServicios || {};
            const desglose = Object.entries(montosServicios).map(([key, item]) => {
                const svcInfo = serviciosPorId[key];
                return {
                    key,
                    tipo: item.tipo,
                    label: item.nombre,
                    monto: item.monto,
                    activo: svcInfo ? svcInfo.activo : true,
                };
            }).filter(d => d.monto !== 0);
            const pagosConVoucher = await Promise.all(pagos.map(async (p) => {
                const vouchers = await this.voucherRepo.find({
                    where: { idPago: p.id },
                    order: { createdAt: 'DESC' },
                    take: 1,
                });
                return {
                    id: p.id,
                    monto: parseFloat(p.montoCancelado),
                    montoCancelado: parseFloat(p.montoCancelado),
                    tipoPago: p.tipoPago,
                    banco: p.banco,
                    fechaPago: p.fechaPago,
                    referencia: p.referencia,
                    comprobanteUrl: p.comprobanteUrl,
                    estadoPago: p.estadoPago,
                    aprobadoPor: p.aprobadoPor,
                    voucherId: vouchers[0]?.id || null,
                };
            }));
            return {
                feeId: fee.id,
                depto: fee.departamento?.nrDepartamento,
                idDepartamento: fee.idDepartamento,
                montosServicios,
                desglose,
                montoTotal: parseFloat(fee.montoTotal) || 0,
                ajuste: parseFloat(fee.ajusteMesAnterior) || 0,
                statusPago: fee.statusPago,
                mensajeEnviado: fee.mensajeEnviado,
                fechaMensajeEnviado: fee.fechaMensajeEnviado,
                totalPagado,
                saldo: Math.max(0, (parseFloat(fee.montoTotal) || 0) - totalPagado),
                pagos: pagosConVoucher,
                medicionPorServicio: medicionData.reduce((acc, md) => {
                    acc[md.id_servicio] = {
                        idMeterImage: md.id_meter_image,
                        ocrValor: md.ocr_raw_value,
                        confianza: md.ocr_confidence,
                        m3Consumido: parseFloat(md.m3_consumido) || 0,
                        tipo: md.servicio_tipo,
                    };
                    return acc;
                }, {}),
                medicion: medicionData.find((md) => md.servicio_tipo === 'agua') ? {
                    idMeterImage: medicionData.find((md) => md.servicio_tipo === 'agua').id_meter_image,
                    ocrValor: medicionData.find((md) => md.servicio_tipo === 'agua').ocr_raw_value,
                    confianza: medicionData.find((md) => md.servicio_tipo === 'agua').ocr_confidence,
                    m3Consumido: parseFloat(medicionData.find((md) => md.servicio_tipo === 'agua').m3_consumido) || 0,
                } : null,
                fechaVencimiento: fee.fechaVencimiento,
            };
        }));
        const totalDeptos = result.length;
        const pagados = result.filter(r => r.statusPago === 'pagado').length;
        const mensajesEnviados = result.filter(r => r.mensajeEnviado).length;
        const montoPendiente = result.reduce((s, r) => s + r.saldo, 0);
        return {
            resumen: {
                totalDeptos,
                pagados,
                pendientes: totalDeptos - pagados,
                mensajesEnviados,
                montoPendiente: parseFloat(montoPendiente.toFixed(2)),
                periodoCerrado: totalDeptos > 0 && pagados === totalDeptos,
            },
            serviciosEdificio: todosLosServicios.map(s => ({
                id: s.id, tipo: s.tipo, nombre: s.nombreServicio, activo: s.activo,
                modoCalculo: s.modoCalculo, unidadMedida: s.unidadMedida,
            })),
            departamentos: result,
        };
    }
    findAll(idCuota, idPropietario) {
        const where = {};
        if (idCuota)
            where.idCuota = idCuota;
        if (idPropietario)
            where.idPropietario = idPropietario;
        return this.repo.find({ where, relations: ['cuota'], order: { createdAt: 'DESC' } });
    }
    async findOne(id) {
        const p = await this.repo.findOne({ where: { id }, relations: ['cuota'] });
        if (!p)
            throw new common_1.NotFoundException('Pago no encontrado');
        return p;
    }
    async getPendingByBuilding(idEdificio, mes, anio) {
        return this.repo
            .createQueryBuilder('p')
            .leftJoin('p.cuota', 'f')
            .leftJoin('f.departamento', 'd')
            .leftJoin('d.edificio', 'e')
            .where('e.id = :idEdificio', { idEdificio })
            .andWhere('f.periodoMes = :mes', { mes })
            .andWhere('f.periodoAnio = :anio', { anio })
            .andWhere("f.statusPago IN ('pendiente','parcial','vencido')")
            .select([
            'd.nrDepartamento AS depto',
            'f.id AS cuota_id',
            'f.montoTotal AS cuota_total',
            'f.mensajeEnviado AS mensaje_enviado',
            'SUM(p.montoCancelado) AS total_pagado',
        ])
            .groupBy('d.nrDepartamento, f.id, f.montoTotal, f.mensajeEnviado')
            .orderBy('d.nrDepartamento', 'ASC')
            .getRawMany();
    }
    async createPropietario(dto, idPropietario) {
        const fee = await this.feesService.findOne(dto.idCuota);
        if (fee.statusPago === 'pagado') {
            throw new common_1.BadRequestException('Esta cuota ya está completamente pagada.');
        }
        const payment = await this.repo.save(this.repo.create({
            ...dto,
            idPropietario,
            estadoPago: 'pendiente_aprobacion',
        }));
        return payment;
    }
    async approvePayment(paymentId, supervisorId) {
        const payment = await this.findOne(paymentId);
        if (payment.estadoPago === 'aprobado') {
            throw new common_1.BadRequestException('Este pago ya fue aprobado.');
        }
        payment.estadoPago = 'aprobado';
        payment.aprobadoPor = supervisorId;
        payment.fechaAprobacion = new Date();
        await this.repo.save(payment);
        const allPayments = await this.repo.find({
            where: { idCuota: payment.idCuota, estadoPago: 'aprobado' },
        });
        const totalPagado = allPayments.reduce((s, p) => s + parseFloat(p.montoCancelado), 0);
        const fee = await this.feesService.findOne(payment.idCuota);
        const montoTotal = parseFloat(fee.montoTotal);
        const newStatus = totalPagado >= montoTotal ? 'pagado'
            : totalPagado > 0 ? 'parcial'
                : 'pendiente';
        await this.feesService.updateStatus(payment.idCuota, newStatus);
        return payment;
    }
    async rejectPayment(paymentId, supervisorId) {
        const payment = await this.findOne(paymentId);
        payment.estadoPago = 'rechazado';
        payment.aprobadoPor = supervisorId;
        payment.fechaAprobacion = new Date();
        return this.repo.save(payment);
    }
    async getPendingApproval() {
        const pagos = await this.repo.find({
            where: { estadoPago: 'pendiente_aprobacion' },
            relations: ['cuota', 'cuota.departamento'],
            order: { createdAt: 'ASC' },
        });
        return Promise.all(pagos.map(async (p) => {
            const vouchers = await this.voucherRepo.find({
                where: { idPago: p.id },
                order: { createdAt: 'DESC' },
                take: 1,
            });
            return {
                ...p,
                voucherId: vouchers[0]?.id || null,
            };
        }));
    }
};
exports.PaymentsService = PaymentsService;
exports.PaymentsService = PaymentsService = PaymentsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(payment_entity_1.Payment)),
    __param(1, (0, typeorm_1.InjectRepository)(fee_entity_1.Fee)),
    __param(2, (0, typeorm_1.InjectRepository)(service_entity_1.Service)),
    __param(3, (0, typeorm_1.InjectRepository)(payment_voucher_entity_1.PaymentVoucher)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        fees_service_1.FeesService,
        image_upload_service_1.ImageUploadService,
        storage_gateway_service_1.StorageGatewayService])
], PaymentsService);
//# sourceMappingURL=payments.service.js.map