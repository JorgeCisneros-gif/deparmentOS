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
exports.ReceiptsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const receipts_service_1 = require("./receipts.service");
const receipts_dto_1 = require("./receipts.dto");
const service_entity_1 = require("../services/service.entity");
const building_entity_1 = require("../buildings/building.entity");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const user_entity_1 = require("../users/user.entity");
const TIPO_META = {
    agua: { icon: 'Droplets', color: 'var(--blue)', descripcion: 'Factura mensual de agua. Ingresa el monto total y los m³ totales según la factura.' },
    luz: { icon: 'Zap', color: 'var(--accent)', descripcion: 'Factura de electricidad. Se divide en partes iguales entre los departamentos activos.' },
    internet: { icon: 'Wifi', color: 'var(--green)', descripcion: 'Internet para cámaras. Valor por defecto: S/. 30.00. Modifica solo si el costo varió.' },
    limpieza: { icon: 'Brush', color: '#a78bfa', descripcion: 'Costo mensual de limpieza. Se divide en partes iguales entre los departamentos.' },
    mantenimiento: { icon: 'Wrench', color: '#fb923c', descripcion: 'Gastos de mantenimiento del edificio. Se divide en partes iguales.' },
    otro: { icon: 'ReceiptText', color: '#94a3b8', descripcion: 'Gasto adicional del edificio. Se divide en partes iguales entre los departamentos.' },
};
let ReceiptsController = class ReceiptsController {
    constructor(svc, serviceRepo, buildingRepo) {
        this.svc = svc;
        this.serviceRepo = serviceRepo;
        this.buildingRepo = buildingRepo;
    }
    create(dto) { return this.svc.create(dto); }
    async recalcularFactor(reciboId, save) {
        return this.svc.recalcularFactor(reciboId, save === 'true');
    }
    update(id, dto) { return this.svc.update(id, dto); }
    validatePeriod(buildingId, month, year) {
        return this.svc.validatePeriodReceipts(buildingId, +month, +year);
    }
    async getPeriodReceipts(buildingId, month, year) {
        const building = await this.buildingRepo.findOne({ where: { id: buildingId } });
        if (!building)
            return { periodoMes: +month, periodoAnio: +year, listo: false, serviciosItems: [], servicios: {} };
        const serviciosMap = building.serviciosActivos || { agua: true, luz: true, internet: true };
        const enabledKeys = Object.entries(serviciosMap)
            .filter(([, enabled]) => enabled)
            .map(([key]) => key);
        if (!enabledKeys.length) {
            return { periodoMes: +month, periodoAnio: +year, listo: false, serviciosItems: [], servicios: {} };
        }
        const allServices = await this.serviceRepo.find({
            where: { idEdificio: buildingId, activo: true },
            order: { tipo: 'ASC' },
        });
        const isUuid = (s) => /^[0-9a-f]{8}-[0-9a-f]{4}-/.test(s);
        const usingUuids = enabledKeys.length > 0 && isUuid(enabledKeys[0]);
        const enabledServices = usingUuids
            ? allServices.filter(s => serviciosMap[s.id] === true)
            : allServices.filter(s => serviciosMap[s.tipo] === true);
        const allReceipts = await this.svc.findAll(undefined, +year, +month);
        const receiptBySvcId = {};
        for (const r of allReceipts) {
            if (enabledServices.find(s => s.id === r.idServicio))
                receiptBySvcId[r.idServicio] = r;
        }
        const serviciosItems = enabledServices.map(svc => {
            const recibo = receiptBySvcId[svc.id] || null;
            const meta = TIPO_META[svc.tipo] || TIPO_META['otro'];
            return {
                tipo: svc.tipo,
                servicio: svc,
                recibo,
                cargado: !!recibo,
                icon: meta.icon,
                color: meta.color,
                titulo: svc.nombreServicio || svc.tipo,
                descripcion: meta.descripcion,
            };
        });
        const listo = serviciosItems.every(i => i.cargado);
        const byTipo = {};
        const svcByTipo = {};
        for (const item of serviciosItems) {
            byTipo[item.tipo] = item.recibo;
            svcByTipo[item.tipo] = item.servicio;
        }
        return {
            periodoMes: +month, periodoAnio: +year, listo, serviciosItems,
            agua: byTipo['agua'] || null,
            luz: byTipo['luz'] || null,
            internet: byTipo['internet'] || null,
            limpieza: byTipo['limpieza'] || null,
            servicios: svcByTipo,
        };
    }
    findAll(serviceId, year, month) {
        return this.svc.findAll(serviceId, year ? +year : undefined, month ? +month : undefined);
    }
    findOne(id) { return this.svc.findOne(id); }
};
exports.ReceiptsController = ReceiptsController;
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)(user_entity_1.UserRole.SUPERVISOR),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [receipts_dto_1.CreateReceiptDto]),
    __metadata("design:returntype", void 0)
], ReceiptsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('recalcular-factor/:reciboId'),
    (0, swagger_1.ApiOperation)({
        summary: 'Recalcula el factor de ajuste sumando mediciones del período',
        description: `
  Suma los m³/kWh medidos en todos los departamentos para el período del recibo,
  calcula factor = totalUnidadesFactura / suma_mediciones y lo guarda en el recibo.
  `,
    }),
    (0, swagger_1.ApiQuery)({ name: 'save', required: false, type: Boolean, description: 'Si true, guarda el factor calculado' }),
    __param(0, (0, common_1.Param)('reciboId')),
    __param(1, (0, common_1.Query)('save')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ReceiptsController.prototype, "recalcularFactor", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, roles_decorator_1.Roles)(user_entity_1.UserRole.SUPERVISOR),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, receipts_dto_1.UpdateReceiptDto]),
    __metadata("design:returntype", void 0)
], ReceiptsController.prototype, "update", null);
__decorate([
    (0, common_1.Get)('validate-period'),
    (0, roles_decorator_1.Roles)(user_entity_1.UserRole.SUPERVISOR),
    (0, swagger_1.ApiQuery)({ name: 'buildingId', required: true }),
    (0, swagger_1.ApiQuery)({ name: 'month', required: true, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'year', required: true, type: Number }),
    __param(0, (0, common_1.Query)('buildingId')),
    __param(1, (0, common_1.Query)('month')),
    __param(2, (0, common_1.Query)('year')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number]),
    __metadata("design:returntype", void 0)
], ReceiptsController.prototype, "validatePeriod", null);
__decorate([
    (0, common_1.Get)('period'),
    (0, roles_decorator_1.Roles)(user_entity_1.UserRole.SUPERVISOR),
    (0, swagger_1.ApiQuery)({ name: 'buildingId', required: true }),
    (0, swagger_1.ApiQuery)({ name: 'month', required: true, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'year', required: true, type: Number }),
    __param(0, (0, common_1.Query)('buildingId')),
    __param(1, (0, common_1.Query)('month')),
    __param(2, (0, common_1.Query)('year')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number]),
    __metadata("design:returntype", Promise)
], ReceiptsController.prototype, "getPeriodReceipts", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiQuery)({ name: 'serviceId', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'year', required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'month', required: false, type: Number }),
    __param(0, (0, common_1.Query)('serviceId')),
    __param(1, (0, common_1.Query)('year')),
    __param(2, (0, common_1.Query)('month')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number]),
    __metadata("design:returntype", void 0)
], ReceiptsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ReceiptsController.prototype, "findOne", null);
exports.ReceiptsController = ReceiptsController = __decorate([
    (0, swagger_1.ApiTags)('Receipts'),
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, common_1.Controller)('receipts'),
    __param(1, (0, typeorm_1.InjectRepository)(service_entity_1.Service)),
    __param(2, (0, typeorm_1.InjectRepository)(building_entity_1.Building)),
    __metadata("design:paramtypes", [receipts_service_1.ReceiptsService,
        typeorm_2.Repository,
        typeorm_2.Repository])
], ReceiptsController);
//# sourceMappingURL=receipts.controller.js.map