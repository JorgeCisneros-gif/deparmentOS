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
var FeesService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeesService = exports.CalculateFeesDto = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const alicuota_entity_1 = require("../alicuotas/alicuota.entity");
const fee_entity_1 = require("./fee.entity");
const department_entity_1 = require("../departments/department.entity");
const service_entity_1 = require("../services/service.entity");
const departments_service_1 = require("../departments/departments.service");
const receipts_service_1 = require("../receipts/receipts.service");
const readings_service_1 = require("../readings/readings.service");
class CalculateFeesDto {
}
exports.CalculateFeesDto = CalculateFeesDto;
let FeesService = FeesService_1 = class FeesService {
    constructor(repo, serviceRepo, deptRepo, alicuotaRepo, departmentsService, receiptsService, readingsService) {
        this.repo = repo;
        this.serviceRepo = serviceRepo;
        this.deptRepo = deptRepo;
        this.alicuotaRepo = alicuotaRepo;
        this.departmentsService = departmentsService;
        this.receiptsService = receiptsService;
        this.readingsService = readingsService;
        this.logger = new common_1.Logger(FeesService_1.name);
    }
    async calculatePeriod(dto) {
        const { idEdificio, periodoMes, periodoAnio, fechaVencimiento } = dto;
        const deptos = await this.departmentsService.findAll(idEdificio);
        const activeDeptos = deptos.filter(d => d.status === 'activo');
        if (!activeDeptos.length) {
            throw new common_1.BadRequestException('No hay departamentos activos en este edificio');
        }
        const nroDeptos = activeDeptos.length;
        const servicios = await this.serviceRepo.find({
            where: { idEdificio, activo: true },
            order: { tipo: 'ASC' },
        });
        const allReceipts = await this.receiptsService.findAll(undefined, periodoAnio, periodoMes);
        const receiptBySvcId = {};
        for (const r of allReceipts) {
            if (servicios.find(s => s.id === r.idServicio)) {
                receiptBySvcId[r.idServicio] = r;
            }
        }
        const svcAgua = servicios.find(s => s.tipo === service_entity_1.TipoServicio.AGUA);
        const reciboAgua = svcAgua ? receiptBySvcId[svcAgua.id] : null;
        let aguaComunPorDepto = 0;
        if (svcAgua && reciboAgua && svcAgua.modoCalculo === service_entity_1.ModoCalculo.POR_CONSUMO_M3) {
            aguaComunPorDepto = await this.calcularAguaComun(reciboAgua, activeDeptos, nroDeptos);
        }
        const fees = [];
        for (const depto of activeDeptos) {
            const montosServicios = {};
            let montoTotal = 0;
            for (const svc of servicios) {
                const recibo = receiptBySvcId[svc.id];
                if (!recibo)
                    continue;
                const monto = await this.calcularMontoServicio(svc, recibo, depto, activeDeptos, nroDeptos);
                if (monto > 0 || svc.tipo === service_entity_1.TipoServicio.AGUA) {
                    montosServicios[svc.id] = {
                        nombre: svc.nombreServicio,
                        tipo: svc.tipo,
                        modoCalculo: svc.modoCalculo,
                        monto: parseFloat(monto.toFixed(2)),
                        idServicio: svc.id,
                    };
                    montoTotal += monto;
                }
            }
            if (aguaComunPorDepto > 0) {
                montosServicios['agua_comun'] = {
                    nombre: 'Agua áreas comunes',
                    tipo: 'agua_comun',
                    modoCalculo: 'division_igualitaria',
                    monto: parseFloat(aguaComunPorDepto.toFixed(2)),
                };
                montoTotal += aguaComunPorDepto;
            }
            const existing = await this.repo.findOne({
                where: { idDepartamento: depto.id, periodoMes, periodoAnio },
            });
            const ajuste = existing ? parseFloat(existing.ajusteMesAnterior) || 0 : 0;
            montoTotal += ajuste;
            const feeData = {
                idDepartamento: depto.id,
                periodoMes,
                periodoAnio,
                montosServicios,
                montoTotal: parseFloat(montoTotal.toFixed(2)),
                ajusteMesAnterior: ajuste,
                fechaVencimiento,
                detalleJson: {
                    calculado_en: new Date().toISOString(),
                    nro_deptos: nroDeptos,
                    servicios_incluidos: Object.keys(montosServicios).length,
                },
            };
            if (existing) {
                Object.assign(existing, feeData);
                fees.push(await this.repo.save(existing));
            }
            else {
                fees.push(await this.repo.save(this.repo.create(feeData)));
            }
        }
        this.logger.log(`Cuotas calculadas: ${fees.length} deptos · ${periodoMes}/${periodoAnio}`);
        return fees;
    }
    async calcularMontoServicio(svc, recibo, depto, activeDeptos, nroDeptos) {
        const montoTotal = parseFloat(recibo.montoTotalFactura) || 0;
        switch (svc.modoCalculo) {
            case service_entity_1.ModoCalculo.POR_CONSUMO_M3: {
                const readings = await this.readingsService.findAll(recibo.id, depto.id);
                return readings.length > 0
                    ? parseFloat(readings[0].montoCalculado) || 0
                    : 0;
            }
            case service_entity_1.ModoCalculo.DIVISION_IGUALITARIA:
                return parseFloat((montoTotal / nroDeptos).toFixed(2));
            case service_entity_1.ModoCalculo.PORCENTAJE_ALICUOTA: {
                const alicuotaData = await this.alicuotaRepo.findOne({
                    where: {
                        idDepartamento: depto.id,
                        idServicio: svc.id,
                        periodoMes: recibo.periodoMes,
                        periodoAnio: recibo.periodoAnio,
                    },
                });
                const porcentaje = alicuotaData ? parseFloat(alicuotaData.porcentaje) : 0;
                if (porcentaje <= 0) {
                    this.logger.warn(`Sin alícuota para depto ${depto.nrDepartamento} · servicio ${svc.nombreServicio} · ${recibo.periodoMes}/${recibo.periodoAnio}`);
                    return 0;
                }
                return parseFloat((montoTotal * porcentaje / 100).toFixed(2));
            }
            case 'por_consumo_ajustado': {
                const readings = await this.readingsService.findAll(recibo.id, depto.id);
                if (!readings.length)
                    return 0;
                const m3 = parseFloat(readings[0].m3Consumido) || 0;
                if (m3 <= 0)
                    return 0;
                const totalUnidades = parseFloat(recibo.totalUnidadesFactura) || 0;
                const montoFactura = parseFloat(recibo.montoTotalFactura) || 0;
                const precioReal = totalUnidades > 0 ? montoFactura / totalUnidades : 0;
                if (precioReal <= 0) {
                    this.logger.warn(`precioReal=0 para recibo ${recibo.id} — ¿falta totalUnidadesFactura?`);
                    return 0;
                }
                const factor = parseFloat(recibo.factorAjuste) || 1;
                const factorEstado = recibo.factorEstado || 'pendiente';
                if (factorEstado === 'pendiente') {
                    this.logger.warn(`Factor de ajuste pendiente para recibo ${recibo.id} — usando factor 1.0`);
                    return parseFloat((m3 * precioReal).toFixed(2));
                }
                return parseFloat((m3 * precioReal * factor).toFixed(2));
            }
            default:
                this.logger.warn(`modoCalculo desconocido: ${svc.modoCalculo}`);
                return 0;
        }
    }
    async calcularAguaComun(recibo, activeDeptos, nroDeptos) {
        const montoTotalRecibo = parseFloat(recibo.montoTotalFactura) || 0;
        let sumaConsumos = 0;
        for (const d of activeDeptos) {
            const readings = await this.readingsService.findAll(recibo.id, d.id);
            if (readings.length > 0) {
                sumaConsumos += parseFloat(readings[0].montoCalculado) || 0;
            }
        }
        const diferencia = montoTotalRecibo - sumaConsumos;
        const comunTotal = Math.max(0, parseFloat(diferencia.toFixed(2)));
        return comunTotal > 0 ? parseFloat((comunTotal / nroDeptos).toFixed(2)) : 0;
    }
    findAll(idDepartamento, anio, mes, status) {
        const qb = this.repo.createQueryBuilder('f')
            .leftJoinAndSelect('f.departamento', 'd')
            .orderBy('f.periodoAnio', 'DESC')
            .addOrderBy('f.periodoMes', 'DESC')
            .addOrderBy('d.nrDepartamento', 'ASC');
        if (idDepartamento)
            qb.andWhere('f.idDepartamento = :idDepartamento', { idDepartamento });
        if (anio)
            qb.andWhere('f.periodoAnio = :anio', { anio });
        if (mes)
            qb.andWhere('f.periodoMes = :mes', { mes });
        if (status)
            qb.andWhere('f.statusPago = :status', { status });
        return qb.getMany();
    }
    async findOne(id) {
        const f = await this.repo.findOne({ where: { id }, relations: ['departamento'] });
        if (!f)
            throw new common_1.NotFoundException('Cuota no encontrada');
        return f;
    }
    async getPendingSummary(idEdificio, mes, anio) {
        return this.repo
            .createQueryBuilder('f')
            .leftJoin('f.departamento', 'd')
            .leftJoin('d.edificio', 'e')
            .where('e.id = :idEdificio', { idEdificio })
            .andWhere('f.periodoMes = :mes', { mes })
            .andWhere('f.periodoAnio = :anio', { anio })
            .andWhere("f.statusPago IN ('pendiente', 'vencido', 'parcial')")
            .select([
            'd.nrDepartamento AS depto',
            'f.montoTotal AS total',
            'f.statusPago AS status',
            'f.fechaVencimiento AS vencimiento',
        ])
            .orderBy('d.nrDepartamento', 'ASC')
            .getRawMany();
    }
    async updateStatus(id, status) {
        const f = await this.findOne(id);
        f.statusPago = status;
        return this.repo.save(f);
    }
    async getPeriodVencimiento(idEdificio, mes, anio) {
        const row = await this.repo
            .createQueryBuilder('f')
            .innerJoin('f.departamento', 'd')
            .innerJoin('d.edificio', 'e')
            .where('e.id = :idEdificio', { idEdificio })
            .andWhere('f.periodoMes = :mes', { mes })
            .andWhere('f.periodoAnio = :anio', { anio })
            .select(['f.fechaVencimiento', 'f.id'])
            .orderBy('f.createdAt', 'ASC')
            .getOne();
        const count = await this.repo
            .createQueryBuilder('f')
            .innerJoin('f.departamento', 'd')
            .innerJoin('d.edificio', 'e')
            .where('e.id = :idEdificio', { idEdificio })
            .andWhere('f.periodoMes = :mes', { mes })
            .andWhere('f.periodoAnio = :anio', { anio })
            .getCount();
        return {
            fechaVencimiento: row?.fechaVencimiento?.toString()?.split('T')[0] ?? null,
            totalCuotas: count,
        };
    }
    async updatePeriodVencimiento(idEdificio, mes, anio, fechaVencimiento) {
        const deptos = await this.deptRepo.find({ where: { idEdificio } });
        if (!deptos.length)
            return { updated: 0 };
        const deptIds = deptos.map(d => d.id);
        const result = await this.repo
            .createQueryBuilder()
            .update()
            .set({ fechaVencimiento })
            .where('idDepartamento IN (:...deptIds)', { deptIds })
            .andWhere('periodoMes = :mes', { mes })
            .andWhere('periodoAnio = :anio', { anio })
            .execute();
        return { updated: result.affected || 0 };
    }
};
exports.FeesService = FeesService;
exports.FeesService = FeesService = FeesService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(fee_entity_1.Fee)),
    __param(1, (0, typeorm_1.InjectRepository)(service_entity_1.Service)),
    __param(2, (0, typeorm_1.InjectRepository)(department_entity_1.Department)),
    __param(3, (0, typeorm_1.InjectRepository)(alicuota_entity_1.Alicuota)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        departments_service_1.DepartmentsService,
        receipts_service_1.ReceiptsService,
        readings_service_1.ReadingsService])
], FeesService);
//# sourceMappingURL=fees.service.js.map