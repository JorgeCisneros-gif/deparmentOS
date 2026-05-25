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
exports.AlicuotasService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const alicuota_entity_1 = require("./alicuota.entity");
const department_entity_1 = require("../departments/department.entity");
let AlicuotasService = class AlicuotasService {
    constructor(repo, dRepo) {
        this.repo = repo;
        this.dRepo = dRepo;
    }
    async getForPeriod(idServicio, idEdificio, mes, anio) {
        const deptos = await this.dRepo.find({
            where: { idEdificio, status: 'activo' },
            order: { nrDepartamento: 'ASC' },
        });
        const propietariosData = deptos.length > 0
            ? await this.dRepo.query(`SELECT d.id AS depto_id, p.nombre
           FROM departamentos d
           LEFT JOIN propietarios p ON p.id = d.id_propietario
           WHERE d.id = ANY($1)`, [deptos.map(d => d.id)])
            : [];
        const propMap = {};
        propietariosData.forEach((r) => { propMap[r.depto_id] = r.nombre; });
        const current = await this.repo.find({
            where: { idServicio, periodoMes: mes, periodoAnio: anio },
        });
        const currentMap = {};
        current.forEach(a => { currentMap[a.idDepartamento] = parseFloat(a.porcentaje); });
        const lastKnown = await this.repo
            .createQueryBuilder('a')
            .where('a.id_servicio = :idServicio', { idServicio })
            .andWhere('(a.periodo_anio < :anio OR (a.periodo_anio = :anio AND a.periodo_mes < :mes))', { anio, mes })
            .orderBy('a.periodo_anio', 'DESC')
            .addOrderBy('a.periodo_mes', 'DESC')
            .getMany();
        const lastMap = {};
        lastKnown.forEach(a => {
            if (!lastMap[a.idDepartamento]) {
                lastMap[a.idDepartamento] = parseFloat(a.porcentaje);
            }
        });
        const suma = Object.values(currentMap).reduce((s, v) => s + v, 0);
        return {
            periodoMes: mes,
            periodoAnio: anio,
            sumaPorcentajes: parseFloat(suma.toFixed(4)),
            completo: Math.abs(suma - 100) < 0.01,
            departamentos: deptos.map(d => ({
                id: d.id,
                nrDepartamento: d.nrDepartamento,
                piso: d.piso,
                propietario: propMap[d.id] || null,
                porcentaje: currentMap[d.id] ?? null,
                ultimoValor: lastMap[d.id] ?? null,
            })),
        };
    }
    async saveForPeriod(idServicio, mes, anio, lineas) {
        if (!lineas.length)
            throw new common_1.BadRequestException('No se enviaron alícuotas');
        const total = lineas.reduce((s, l) => s + (l.porcentaje || 0), 0);
        if (lineas.some(l => l.porcentaje < 0 || l.porcentaje > 100)) {
            throw new common_1.BadRequestException('Cada porcentaje debe estar entre 0 y 100');
        }
        for (const linea of lineas) {
            await this.repo
                .createQueryBuilder()
                .insert()
                .into(alicuota_entity_1.Alicuota)
                .values({
                idDepartamento: linea.idDepartamento,
                idServicio,
                porcentaje: linea.porcentaje,
                periodoMes: mes,
                periodoAnio: anio,
            })
                .orUpdate(['porcentaje'], ['id_departamento', 'id_servicio', 'periodo_mes', 'periodo_anio'])
                .execute();
        }
        const suma = parseFloat(total.toFixed(4));
        const completo = Math.abs(suma - 100) < 0.01;
        return {
            message: completo ? '✅ Alícuotas guardadas y suman 100%' : `⚠ Alícuotas guardadas. Suma actual: ${suma}%`,
            suma,
            completo,
        };
    }
    async getPorcentaje(idDepartamento, idServicio, mes, anio) {
        const a = await this.repo.findOne({
            where: { idDepartamento, idServicio, periodoMes: mes, periodoAnio: anio },
        });
        return a ? parseFloat(a.porcentaje) : 0;
    }
};
exports.AlicuotasService = AlicuotasService;
exports.AlicuotasService = AlicuotasService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(alicuota_entity_1.Alicuota)),
    __param(1, (0, typeorm_1.InjectRepository)(department_entity_1.Department)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], AlicuotasService);
//# sourceMappingURL=alicuotas.service.js.map