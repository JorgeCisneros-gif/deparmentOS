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
exports.ReceiptsService = exports.INTERNET_MONTO_DEFAULT = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const receipt_entity_1 = require("./receipt.entity");
const service_entity_1 = require("../services/service.entity");
const building_entity_1 = require("../buildings/building.entity");
exports.INTERNET_MONTO_DEFAULT = 30.00;
let ReceiptsService = class ReceiptsService {
    constructor(repo, serviceRepo, buildingRepo) {
        this.repo = repo;
        this.serviceRepo = serviceRepo;
        this.buildingRepo = buildingRepo;
    }
    async create(dto) {
        const servicio = await this.serviceRepo.findOne({ where: { id: dto.idServicio } });
        if (!servicio)
            throw new common_1.NotFoundException('Servicio no encontrado');
        if (servicio.tipo === service_entity_1.TipoServicio.AGUA) {
            const esAjustado = servicio.modoCalculo === 'por_consumo_ajustado';
            if (!esAjustado && (dto.m3LecturaActual == null || dto.m3LecturaAnterior == null)) {
                throw new common_1.BadRequestException('Para AGUA se requieren m3LecturaActual y m3LecturaAnterior');
            }
            if (!dto.montoTotalFactura || dto.montoTotalFactura <= 0) {
                throw new common_1.BadRequestException('Para AGUA se requiere el monto total de la factura');
            }
        }
        if ([service_entity_1.TipoServicio.LUZ, 'limpieza', 'mantenimiento', 'otro'].includes(servicio.tipo)) {
            if (!dto.montoTotalFactura || dto.montoTotalFactura <= 0) {
                throw new common_1.BadRequestException(`Para ${servicio.tipo.toUpperCase()} se requiere el monto total`);
            }
        }
        if (servicio.tipo === service_entity_1.TipoServicio.INTERNET) {
            if (!dto.montoTotalFactura || dto.montoTotalFactura <= 0) {
                dto.montoTotalFactura = exports.INTERNET_MONTO_DEFAULT;
            }
        }
        return this.repo.save(this.repo.create(dto));
    }
    findAll(idServicio, anio, mes) {
        const qb = this.repo.createQueryBuilder('r')
            .leftJoinAndSelect('r.servicio', 's')
            .orderBy('r.periodoAnio', 'DESC')
            .addOrderBy('r.periodoMes', 'DESC');
        if (idServicio)
            qb.andWhere('r.idServicio = :idServicio', { idServicio });
        if (anio)
            qb.andWhere('r.periodoAnio = :anio', { anio });
        if (mes)
            qb.andWhere('r.periodoMes = :mes', { mes });
        return qb.getMany();
    }
    async findOne(id) {
        const r = await this.repo.findOne({ where: { id }, relations: ['servicio'] });
        if (!r)
            throw new common_1.NotFoundException('Recibo no encontrado');
        return r;
    }
    async update(id, dto) {
        const r = await this.findOne(id);
        if (r.servicio?.tipo === service_entity_1.TipoServicio.INTERNET) {
            if (!dto.montoTotalFactura || dto.montoTotalFactura <= 0) {
                dto.montoTotalFactura = exports.INTERNET_MONTO_DEFAULT;
            }
        }
        Object.assign(r, dto);
        return this.repo.save(r);
    }
    async validatePeriodReceipts(idEdificio, periodoMes, periodoAnio) {
        const building = await this.buildingRepo.findOne({ where: { id: idEdificio } });
        const serviciosMap = building?.serviciosActivos || {};
        const enabledKeys = Object.entries(serviciosMap)
            .filter(([, enabled]) => enabled)
            .map(([key]) => key);
        const isUuid = (s) => /^[0-9a-f]{8}-[0-9a-f]{4}-/.test(s);
        let tiposRequeridos;
        if (enabledKeys.length > 0 && isUuid(enabledKeys[0])) {
            const serviciosEdificio = await this.serviceRepo.find({ where: { idEdificio } });
            const idToTipo = {};
            serviciosEdificio.forEach(s => { idToTipo[s.id] = s.tipo; });
            tiposRequeridos = enabledKeys
                .map(id => idToTipo[id])
                .filter(Boolean);
        }
        else {
            tiposRequeridos = enabledKeys;
        }
        if (!tiposRequeridos.length) {
            return { listo: true, serviciosFaltantes: [], detalle: {} };
        }
        const recibosDelPeriodo = await this.repo
            .createQueryBuilder('r')
            .leftJoinAndSelect('r.servicio', 's')
            .where('s.id_edificio = :idEdificio', { idEdificio })
            .andWhere('r.periodo_mes = :mes', { mes: periodoMes })
            .andWhere('r.periodo_anio = :anio', { anio: periodoAnio })
            .andWhere("r.status != 'anulado'")
            .getMany();
        const recibosPorTipo = {};
        for (const r of recibosDelPeriodo) {
            if (r.servicio)
                recibosPorTipo[r.servicio.tipo] = r;
        }
        const detalle = {};
        const serviciosFaltantes = [];
        for (const tipo of tiposRequeridos) {
            const recibo = recibosPorTipo[tipo];
            if (recibo) {
                detalle[tipo] = {
                    cargado: true,
                    monto: parseFloat(recibo.montoTotalFactura),
                    ...(tipo === service_entity_1.TipoServicio.AGUA && { precioM3: parseFloat(recibo.precioM3) }),
                };
            }
            else {
                detalle[tipo] = { cargado: false };
                serviciosFaltantes.push(tipo);
            }
        }
        return {
            listo: serviciosFaltantes.length === 0,
            serviciosFaltantes,
            detalle,
        };
    }
    async recalcularFactor(reciboId, save = false) {
        const recibo = await this.repo.findOne({
            where: { id: reciboId },
            relations: ['servicio'],
        });
        if (!recibo)
            throw new common_1.NotFoundException('Recibo no encontrado');
        if (recibo.servicio.modoCalculo !== 'por_consumo_ajustado') {
            throw new common_1.BadRequestException('Este recibo no es de tipo por_consumo_ajustado');
        }
        const totalUnidades = parseFloat(recibo.totalUnidadesFactura);
        if (!totalUnidades || totalUnidades <= 0) {
            throw new common_1.BadRequestException('Ingresa primero el total de unidades de la factura');
        }
        const medicionesData = await this.repo.query(`SELECT COALESCE(SUM(md.m3_consumido), 0) AS suma_m3
       FROM mediciones_departamento md
       INNER JOIN recibos_servicio rs ON rs.id = md.id_recibo
       WHERE rs.id_servicio = $1
         AND rs.periodo_mes = $2
         AND rs.periodo_anio = $3`, [recibo.idServicio, recibo.periodoMes, recibo.periodoAnio]);
        const sumaM3 = parseFloat(medicionesData[0]?.suma_m3 || 0);
        if (sumaM3 <= 0) {
            return {
                reciboId,
                totalUnidadesFactura: totalUnidades,
                sumaM3Mediciones: 0,
                factorAjuste: null,
                factorEstado: 'pendiente',
                mensaje: '⏳ Aún no hay mediciones registradas para este período',
            };
        }
        const factor = parseFloat((totalUnidades / sumaM3).toFixed(8));
        if (save) {
            recibo.m3Propios = sumaM3;
            recibo.factorAjuste = factor;
            recibo.factorEstado = 'calculado';
            await this.repo.save(recibo);
        }
        return {
            reciboId,
            totalUnidadesFactura: totalUnidades,
            sumaM3Mediciones: sumaM3,
            factorAjuste: factor,
            factorEstado: save ? 'calculado' : 'estimado',
            mensaje: save
                ? `✅ Factor guardado: ${factor} (${totalUnidades} / ${sumaM3})`
                : `Factor calculado: ${factor} — presiona guardar para aplicarlo`,
        };
    }
};
exports.ReceiptsService = ReceiptsService;
exports.ReceiptsService = ReceiptsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(receipt_entity_1.Receipt)),
    __param(1, (0, typeorm_1.InjectRepository)(service_entity_1.Service)),
    __param(2, (0, typeorm_1.InjectRepository)(building_entity_1.Building)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], ReceiptsService);
//# sourceMappingURL=receipts.service.js.map