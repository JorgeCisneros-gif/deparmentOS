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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CleaningService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const cleaning_entities_1 = require("./cleaning.entities");
const MESES = [
    '', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Setiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
let CleaningService = class CleaningService {
    constructor(providerRepo, areaRepo, recordRepo) {
        this.providerRepo = providerRepo;
        this.areaRepo = areaRepo;
        this.recordRepo = recordRepo;
    }
    createProvider(dto) {
        return this.providerRepo.save(this.providerRepo.create(dto));
    }
    findProviders(idEdificio) {
        return this.providerRepo.find({
            where: { idEdificio, activo: true },
            order: { nombre: 'ASC' },
        });
    }
    async findProvider(id) {
        const p = await this.providerRepo.findOne({ where: { id } });
        if (!p)
            throw new common_1.NotFoundException('Proveedor no encontrado');
        return p;
    }
    async updateProvider(id, dto) {
        const p = await this.findProvider(id);
        Object.assign(p, dto);
        return this.providerRepo.save(p);
    }
    async deactivateProvider(id) {
        const p = await this.findProvider(id);
        p.activo = false;
        return this.providerRepo.save(p);
    }
    createArea(dto) {
        return this.areaRepo.save(this.areaRepo.create(dto));
    }
    findAreas(idEdificio) {
        return this.areaRepo.find({
            where: { idEdificio, activo: true },
            order: { orden: 'ASC' },
        });
    }
    async findArea(id) {
        const a = await this.areaRepo.findOne({ where: { id } });
        if (!a)
            throw new common_1.NotFoundException('Ambiente no encontrado');
        return a;
    }
    async updateArea(id, dto) {
        const a = await this.findArea(id);
        Object.assign(a, dto);
        return this.areaRepo.save(a);
    }
    async createRecord(dto) {
        const existing = await this.recordRepo.findOne({
            where: {
                idEdificio: dto.idEdificio,
                periodoMes: dto.periodoMes,
                periodoAnio: dto.periodoAnio,
            },
        });
        if (existing) {
            throw new common_1.BadRequestException(`Ya existe un registro de limpieza para ${MESES[dto.periodoMes]} ${dto.periodoAnio}. Use PATCH /cleaning/records/${existing.id} para actualizarlo.`);
        }
        const proveedor = await this.findProvider(dto.idProveedor);
        const costoBase = parseFloat(proveedor.costoPorDia) * dto.diasTrabajados;
        let costoAmbientes = 0;
        if (dto.ambientesIds?.length) {
            const ambientes = await this.areaRepo
                .createQueryBuilder('a')
                .where('a.id IN (:...ids)', { ids: dto.ambientesIds })
                .getMany();
            costoAmbientes = ambientes.reduce((sum, a) => sum + parseFloat(a.costoExtra), 0);
        }
        const montoTotal = costoBase + costoAmbientes;
        return this.recordRepo.save(this.recordRepo.create({
            ...dto,
            costoBase,
            costoAmbientes,
            montoTotal,
            detalleDias: dto.detalleDias || [],
            ambientesIds: dto.ambientesIds || [],
        }));
    }
    findRecords(idEdificio, anio, mes) {
        const qb = this.recordRepo.createQueryBuilder('r')
            .leftJoinAndSelect('r.proveedor', 'p')
            .where('r.id_edificio = :idEdificio', { idEdificio })
            .orderBy('r.periodoAnio', 'DESC')
            .addOrderBy('r.periodoMes', 'DESC');
        if (anio)
            qb.andWhere('r.periodo_anio = :anio', { anio });
        if (mes)
            qb.andWhere('r.periodo_mes = :mes', { mes });
        return qb.getMany();
    }
    async findRecord(id) {
        const r = await this.recordRepo.findOne({
            where: { id },
            relations: ['proveedor'],
        });
        if (!r)
            throw new common_1.NotFoundException('Registro de limpieza no encontrado');
        return r;
    }
    async updateRecord(id, dto) {
        const record = await this.findRecord(id);
        const proveedor = await this.findProvider(record.idProveedor);
        const diasTrabajados = dto.diasTrabajados ?? record.diasTrabajados;
        const costoBase = parseFloat(proveedor.costoPorDia) * diasTrabajados;
        const ambientesIds = dto.ambientesIds ?? record.ambientesIds ?? [];
        let costoAmbientes = 0;
        if (ambientesIds.length) {
            const ambientes = await this.areaRepo
                .createQueryBuilder('a')
                .where('a.id IN (:...ids)', { ids: ambientesIds })
                .getMany();
            costoAmbientes = ambientes.reduce((sum, a) => sum + parseFloat(a.costoExtra), 0);
        }
        Object.assign(record, {
            ...dto,
            costoBase,
            costoAmbientes,
            montoTotal: costoBase + costoAmbientes,
        });
        return this.recordRepo.save(record);
    }
    async confirmProviderPayment(id, dto) {
        const record = await this.findRecord(id);
        record.pagoProveedorStatus = 'pagado';
        record.pagoProveedorFecha = dto.fecha;
        record.pagoProveedorRef = dto.referencia;
        return this.recordRepo.save(record);
    }
    async generateCleaningMessage(recordId, idEdificio) {
        const record = await this.findRecord(recordId);
        const proveedor = record.proveedor;
        const mes = MESES[record.periodoMes];
        let nombreAmbientes = [];
        if (record.ambientesIds?.length) {
            const ambientes = await this.areaRepo
                .createQueryBuilder('a')
                .where('a.id IN (:...ids)', { ids: record.ambientesIds })
                .orderBy('a.orden', 'ASC')
                .getMany();
            nombreAmbientes = ambientes.map((a) => a.nombre);
        }
        const result = await this.recordRepo.query(`SELECT COUNT(*) as total FROM departamentos WHERE id_edificio = $1 AND status = 'activo'`, [idEdificio]);
        const nroDeptos = parseInt(result[0]?.total || '1');
        const cuotaPorDepto = parseFloat((record.montoTotal / nroDeptos).toFixed(2));
        const datosPago = {
            nombre: proveedor.nombre,
            telefono: proveedor.telefono || 'N/A',
        };
        if (proveedor.banco)
            datosPago.banco = proveedor.banco.toUpperCase();
        if (proveedor.tipoCuenta)
            datosPago.tipoCuenta = proveedor.tipoCuenta;
        if (proveedor.nroCuenta)
            datosPago.nroCuenta = proveedor.nroCuenta;
        const ambientesStr = nombreAmbientes.length
            ? nombreAmbientes.join(' y ')
            : 'edificio';
        const mensajeTexto = [
            `🧹 *Cuota de Limpieza — ${mes} ${record.periodoAnio}*`,
            ``,
            `Estimado/a vecino/a, le informamos el cobro mensual de limpieza:`,
            ``,
            `📋 *Detalle:*`,
            `• Días trabajados: ${record.diasTrabajados}`,
            `• Ambientes: ${ambientesStr}`,
            `• Costo por día: S/. ${parseFloat(proveedor.costoPorDia).toFixed(2)}`,
            ...(record.costoAmbientes > 0
                ? [`• Costo adicional ambientes: S/. ${parseFloat(record.costoAmbientes).toFixed(2)}`]
                : []),
            `• Total mes: S/. ${parseFloat(record.montoTotal).toFixed(2)}`,
            `• Deptos: ${nroDeptos}`,
            ``,
            `💰 *Su cuota: S/. ${cuotaPorDepto.toFixed(2)}*`,
            ``,
            `👤 *Realizar pago directamente a:*`,
            `   ${proveedor.nombre}`,
            ...(proveedor.banco
                ? [`   ${proveedor.banco.toUpperCase()} — ${proveedor.tipoCuenta}: ${proveedor.nroCuenta || 'N/A'}`]
                : []),
            ...(proveedor.telefono
                ? [`   Yape/Plin: ${proveedor.telefono}`]
                : []),
            ``,
            `Por favor envíe el comprobante al confirmar. ¡Gracias! 🙏`,
        ].join('\n');
        return {
            mensajeTexto,
            desglose: {
                diasTrabajados: record.diasTrabajados,
                costoPorDia: parseFloat(proveedor.costoPorDia),
                costoBase: parseFloat(record.costoBase),
                costoAmbientes: parseFloat(record.costoAmbientes),
                montoTotal: parseFloat(record.montoTotal),
                nroDeptos,
                cuotaPorDepto,
                ambientes: nombreAmbientes,
            },
            datosPago,
            cuotaPorDepto,
        };
    }
    async confirmCleaningMessageSent(recordId, supervisorId) {
        const record = await this.findRecord(recordId);
        if (record.mensajeEnviado) {
            return { mensaje: 'El mensaje ya había sido confirmado.', record };
        }
        record.mensajeEnviado = true;
        record.fechaMensajeEnviado = new Date();
        record.mensajeEnviadoPor = supervisorId;
        await this.recordRepo.save(record);
        return {
            mensaje: '✅ Mensaje de limpieza confirmado como enviado.',
            record,
        };
    }
};
exports.CleaningService = CleaningService;
exports.CleaningService = CleaningService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(cleaning_entities_1.CleaningProvider)),
    __param(1, (0, typeorm_1.InjectRepository)(cleaning_entities_1.CleaningArea)),
    __param(2, (0, typeorm_1.InjectRepository)(cleaning_entities_1.CleaningRecord)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], CleaningService);
//# sourceMappingURL=cleaning.service.js.map