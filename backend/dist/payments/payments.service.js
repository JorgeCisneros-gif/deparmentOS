"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
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
const payment_entity_1 = require("./payment.entity");
const fee_entity_1 = require("../fees/fee.entity");
const service_entity_1 = require("../services/service.entity");
const fees_service_1 = require("../fees/fees.service");
const image_upload_service_1 = require("../shared/image-upload.service");
let PaymentsService = PaymentsService_1 = class PaymentsService {
    constructor(repo, feeRepo, serviceRepo, feesService, imageUpload) {
        this.repo = repo;
        this.feeRepo = feeRepo;
        this.serviceRepo = serviceRepo;
        this.feesService = feesService;
        this.imageUpload = imageUpload;
        this.logger = new common_1.Logger(PaymentsService_1.name);
    }
    async create(dto) {
        console.log('DTO recibido:', JSON.stringify(dto, null, 2));
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
    async updateComprobanteUrl(paymentId, filepath) {
        const payment = await this.findOne(paymentId);
        this.imageUpload.deleteIfExists(payment.comprobanteUrl);
        payment.comprobanteUrl = filepath;
        return this.repo.save(payment);
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
            const medicionData = await this.feeRepo.query(`SELECT md.id, md.id_meter_image, md.m3_consumido, mi.filename, mi.ocr_raw_value, mi.ocr_confidence
         FROM mediciones_departamento md
         INNER JOIN recibos_servicio rs ON rs.id = md.id_recibo
         INNER JOIN servicios s ON s.id = rs.id_servicio
         LEFT JOIN meter_images mi ON mi.id = md.id_meter_image
         WHERE md.id_departamento = $1
           AND rs.periodo_mes = $2
           AND rs.periodo_anio = $3
           AND s.tipo = 'agua'
         LIMIT 1`, [fee.idDepartamento, fee.periodoMes, fee.periodoAnio]);
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
                pagos: pagos.map(p => ({
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
                })),
                medicion: medicionData[0] ? {
                    idMeterImage: medicionData[0].id_meter_image,
                    ocrValor: medicionData[0].ocr_raw_value,
                    confianza: medicionData[0].ocr_confidence,
                    m3Consumido: parseFloat(medicionData[0].m3_consumido) || 0,
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
        return this.repo.find({
            where: { estadoPago: 'pendiente_aprobacion' },
            relations: ['cuota', 'cuota.departamento'],
            order: { createdAt: 'ASC' },
        });
    }
};
exports.PaymentsService = PaymentsService;
exports.PaymentsService = PaymentsService = PaymentsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(payment_entity_1.Payment)),
    __param(1, (0, typeorm_1.InjectRepository)(fee_entity_1.Fee)),
    __param(2, (0, typeorm_1.InjectRepository)(service_entity_1.Service)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        fees_service_1.FeesService,
        image_upload_service_1.ImageUploadService])
], PaymentsService);
//# sourceMappingURL=payments.service.js.map