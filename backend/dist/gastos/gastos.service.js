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
var GastosService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GastosService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const gasto_extra_entity_1 = require("./gasto-extra.entity");
const pago_gasto_entity_1 = require("./pago-gasto.entity");
const department_entity_1 = require("../departments/department.entity");
let GastosService = GastosService_1 = class GastosService {
    constructor(gastoRepo, pagoRepo, deptRepo) {
        this.gastoRepo = gastoRepo;
        this.pagoRepo = pagoRepo;
        this.deptRepo = deptRepo;
        this.logger = new common_1.Logger(GastosService_1.name);
    }
    async findAll(idEdificio, estado) {
        const qb = this.gastoRepo
            .createQueryBuilder('g')
            .leftJoin('pagos_gastos_extras', 'p', 'p.id_gasto_extra = g.id')
            .where('g.id_edificio = :idEdificio', { idEdificio })
            .select([
            'g.id                      AS id',
            'g.nombre                  AS nombre',
            'g.descripcion             AS descripcion',
            'g.fecha_inicio            AS "fechaInicio"',
            'g.fecha_fin               AS "fechaFin"',
            'g.lista_departamentos     AS "listaDepartamentos"',
            'g.estado                  AS estado',
            'g.monto_gasto             AS "montoGasto"',
            'g.monto_por_depto         AS "montoPorDepto"',
            'g.id_edificio             AS "idEdificio"',
            'g.created_at              AS "createdAt"',
            'COUNT(p.id)               AS "totalPagos"',
            'COALESCE(SUM(p.monto), 0) AS "montoCobrado"',
        ])
            .groupBy('g.id')
            .orderBy('g.created_at', 'DESC');
        if (estado)
            qb.andWhere('g.estado = :estado', { estado });
        const rows = await qb.getRawMany();
        return rows.map(r => ({
            ...r,
            montoGasto: parseFloat(r.montoGasto) || 0,
            montoPorDepto: parseFloat(r.montoPorDepto) || 0,
            montoCobrado: parseFloat(r.montoCobrado) || 0,
            totalPagos: parseInt(r.totalPagos) || 0,
        }));
    }
    async findOne(id) {
        const gasto = await this.gastoRepo.findOne({
            where: { id },
            relations: ['edificio'],
        });
        if (!gasto)
            throw new common_1.NotFoundException('Gasto no encontrado');
        const deptos = await this._getDeptosConEstado(gasto);
        const pagos = await this.pagoRepo
            .createQueryBuilder('p')
            .leftJoinAndSelect('p.departamento', 'dp')
            .where('p.id_gasto_extra = :id', { id })
            .orderBy('p.created_at', 'DESC')
            .getMany();
        const montoCobrado = pagos.reduce((s, p) => s + parseFloat(p.monto), 0);
        const montoPendiente = Math.max(0, parseFloat(gasto.montoGasto) - montoCobrado);
        return {
            ...gasto,
            deptos,
            pagos,
            resumen: {
                totalDeptos: deptos.length,
                deptosPagados: deptos.filter((d) => d.pagado).length,
                montoCobrado: parseFloat(montoCobrado.toFixed(2)),
                montoPendiente: parseFloat(montoPendiente.toFixed(2)),
            },
        };
    }
    async create(dto) {
        this.logger.log(`[create] dto recibido: ${JSON.stringify(dto)}`);
        const todosDeptos = await this.deptRepo
            .createQueryBuilder('d')
            .where('d.id_edificio = :idEdificio', { idEdificio: dto.idEdificio })
            .andWhere('d.status = :status', { status: 'activo' })
            .getMany();
        this.logger.log(`[create] deptos activos encontrados: ${todosDeptos.length}`);
        if (!todosDeptos.length)
            throw new common_1.BadRequestException('No hay departamentos activos en este edificio');
        const listaIds = dto.listaDepartamentos?.length
            ? dto.listaDepartamentos
            : todosDeptos.map(d => d.id);
        const nroDeptos = listaIds.length;
        const montoTotal = parseFloat(String(dto.montoGasto));
        const montoPorDepto = parseFloat((montoTotal / nroDeptos).toFixed(2));
        this.logger.log(`[create] listaIds: ${JSON.stringify(listaIds)}, montoPorDepto: ${montoPorDepto}`);
        const gasto = this.gastoRepo.create({
            idEdificio: dto.idEdificio,
            nombre: dto.nombre.trim(),
            descripcion: dto.descripcion?.trim() || null,
            fechaInicio: dto.fechaInicio,
            fechaFin: dto.fechaFin || null,
            listaDepartamentos: listaIds,
            montoGasto: montoTotal,
            montoPorDepto,
            estado: 'activo',
        });
        this.logger.log(`[create] guardando gasto en BD...`);
        const saved = await this.gastoRepo.save(gasto);
        this.logger.log(`[create] gasto guardado id=${saved.id}`);
        return saved;
    }
    async update(id, dto) {
        const gasto = await this.gastoRepo.findOne({ where: { id } });
        if (!gasto)
            throw new common_1.NotFoundException('Gasto no encontrado');
        if (gasto.estado === 'anulado')
            throw new common_1.BadRequestException('No se puede editar un gasto anulado');
        if (dto.nombre !== undefined)
            gasto.nombre = dto.nombre.trim();
        if (dto.descripcion !== undefined)
            gasto.descripcion = dto.descripcion;
        if (dto.fechaFin !== undefined)
            gasto.fechaFin = dto.fechaFin;
        if (dto.listaDepartamentos !== undefined)
            gasto.listaDepartamentos = dto.listaDepartamentos;
        if (dto.montoGasto !== undefined)
            gasto.montoGasto = dto.montoGasto;
        if (dto.estado !== undefined)
            gasto.estado = dto.estado;
        if (dto.montoGasto !== undefined || dto.listaDepartamentos !== undefined) {
            const lista = gasto.listaDepartamentos || [];
            const nro = lista.length || 1;
            gasto.montoPorDepto = parseFloat((parseFloat(String(gasto.montoGasto)) / nro).toFixed(2));
        }
        return this.gastoRepo.save(gasto);
    }
    async cerrar(id) {
        const gasto = await this.gastoRepo.findOne({ where: { id } });
        if (!gasto)
            throw new common_1.NotFoundException('Gasto no encontrado');
        gasto.estado = 'cerrado';
        gasto.fechaFin = gasto.fechaFin || new Date().toISOString().split('T')[0];
        return this.gastoRepo.save(gasto);
    }
    async anular(id) {
        const gasto = await this.gastoRepo.findOne({ where: { id } });
        if (!gasto)
            throw new common_1.NotFoundException('Gasto no encontrado');
        gasto.estado = 'anulado';
        return this.gastoRepo.save(gasto);
    }
    async getPagos(idGastoExtra) {
        return this.pagoRepo
            .createQueryBuilder('p')
            .leftJoinAndSelect('p.departamento', 'dp')
            .where('p.id_gasto_extra = :idGastoExtra', { idGastoExtra })
            .orderBy('p.fecha_pago', 'DESC')
            .getMany();
    }
    async registrarPago(dto, comprobanteUrl) {
        const gasto = await this.gastoRepo.findOne({ where: { id: dto.idGastoExtra } });
        if (!gasto)
            throw new common_1.NotFoundException('Gasto no encontrado');
        if (gasto.estado === 'anulado')
            throw new common_1.BadRequestException('El gasto está anulado');
        if (gasto.listaDepartamentos?.length &&
            !gasto.listaDepartamentos.includes(dto.idDepartamento)) {
            throw new common_1.BadRequestException('El departamento no está incluido en este gasto');
        }
        const pago = this.pagoRepo.create({
            idGastoExtra: dto.idGastoExtra,
            idDepartamento: dto.idDepartamento,
            fechaPago: dto.fechaPago,
            monto: dto.monto,
            tipoPago: dto.tipoPago,
            banco: dto.banco || null,
            referencia: dto.referencia || null,
            observacion: dto.observacion || null,
            comprobanteUrl: comprobanteUrl || dto.comprobanteUrl || null,
        });
        return this.pagoRepo.save(pago);
    }
    async deletePago(id) {
        const pago = await this.pagoRepo.findOne({ where: { id } });
        if (!pago)
            throw new common_1.NotFoundException('Pago no encontrado');
        await this.pagoRepo.remove(pago);
        return { deleted: true };
    }
    async updatePagoComprobante(pagoId, comprobanteUrl) {
        await this.pagoRepo.update(pagoId, { comprobanteUrl });
        return this.pagoRepo.findOne({ where: { id: pagoId } });
    }
    async _getDeptosConEstado(gasto) {
        const listaIds = gasto.listaDepartamentos || [];
        if (!listaIds.length)
            return [];
        const deptos = await this.deptRepo
            .createQueryBuilder('d')
            .where('d.id IN (:...ids)', { ids: listaIds })
            .orderBy('d.nr_departamento', 'ASC')
            .getMany();
        const pagos = await this.pagoRepo
            .createQueryBuilder('p')
            .where('p.id_gasto_extra = :id', { id: gasto.id })
            .getMany();
        const montoPorDepto = parseFloat(String(gasto.montoPorDepto)) || 0;
        return deptos.map(d => {
            const pagosDepto = pagos.filter(p => p.idDepartamento === d.id);
            const totalPagado = pagosDepto.reduce((s, p) => s + parseFloat(String(p.monto)), 0);
            const saldo = Math.max(0, montoPorDepto - totalPagado);
            return {
                id: d.id,
                nrDepartamento: d.nrDepartamento,
                montoPorDepto,
                totalPagado: parseFloat(totalPagado.toFixed(2)),
                saldo: parseFloat(saldo.toFixed(2)),
                pagado: saldo <= 0,
                pagos: pagosDepto,
            };
        });
    }
};
exports.GastosService = GastosService;
exports.GastosService = GastosService = GastosService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(gasto_extra_entity_1.GastoExtra)),
    __param(1, (0, typeorm_1.InjectRepository)(pago_gasto_entity_1.PagoGasto)),
    __param(2, (0, typeorm_1.InjectRepository)(department_entity_1.Department)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], GastosService);
//# sourceMappingURL=gastos.service.js.map