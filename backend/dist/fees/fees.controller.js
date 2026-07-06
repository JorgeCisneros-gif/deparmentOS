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
exports.FeesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const fees_service_1 = require("./fees.service");
const fees_dto_1 = require("./fees.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const user_entity_1 = require("../users/user.entity");
let FeesController = class FeesController {
    constructor(svc) {
        this.svc = svc;
    }
    calculate(dto) {
        return this.svc.calculatePeriod(dto);
    }
    findAll(req, deptId, year, month, status) {
        if (req.user.role === user_entity_1.UserRole.PROPIETARIO) {
            deptId = req.user.idDepartamento;
        }
        return this.svc.findAll(deptId, year, month, status);
    }
    pending(buildingId, month, year) {
        return this.svc.getPendingSummary(buildingId, month, year);
    }
    async findOne(id, req) {
        const fee = await this.svc.findOne(id);
        if (req.user.role === user_entity_1.UserRole.PROPIETARIO &&
            fee.idDepartamento !== req.user.idDepartamento) {
            throw new common_1.BadRequestException('No tiene acceso a esta cuota');
        }
        return fee;
    }
    updateStatus(id, dto) {
        return this.svc.updateStatus(id, dto.status);
    }
    getPeriodVencimiento(buildingId, month, year) {
        return this.svc.getPeriodVencimiento(buildingId, +month, +year);
    }
    updatePeriodVencimiento(body) {
        return this.svc.updatePeriodVencimiento(body.buildingId, +body.month, +body.year, body.fechaVencimiento);
    }
};
exports.FeesController = FeesController;
__decorate([
    (0, common_1.Post)('calculate'),
    (0, roles_decorator_1.Roles)(user_entity_1.UserRole.GESTION),
    (0, swagger_1.ApiOperation)({
        summary: 'Calcular cuotas del período para todos los deptos del edificio',
        description: `
Calcula automáticamente la cuota mensual de cada departamento:
- **Agua**: m3 consumido × precio/m3 del recibo (individual por depto)
- **Luz / Internet / Limpieza**: monto total ÷ cantidad de deptos activos
Si ya existen cuotas para el período, las actualiza.
    `,
    }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [fees_dto_1.CalculateFeesDto]),
    __metadata("design:returntype", void 0)
], FeesController.prototype, "calculate", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Listar cuotas' }),
    (0, swagger_1.ApiQuery)({ name: 'deptId', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'year', required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'month', required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'status', required: false, enum: ['pendiente', 'pagado', 'vencido', 'parcial'] }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('deptId')),
    __param(2, (0, common_1.Query)('year')),
    __param(3, (0, common_1.Query)('month')),
    __param(4, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Number, Number, String]),
    __metadata("design:returntype", void 0)
], FeesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('pending'),
    (0, roles_decorator_1.Roles)(user_entity_1.UserRole.GESTION),
    (0, swagger_1.ApiOperation)({ summary: 'Resumen de cuotas pendientes del mes por edificio' }),
    (0, swagger_1.ApiQuery)({ name: 'buildingId', required: true }),
    (0, swagger_1.ApiQuery)({ name: 'month', required: true, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'year', required: true, type: Number }),
    __param(0, (0, common_1.Query)('buildingId')),
    __param(1, (0, common_1.Query)('month')),
    __param(2, (0, common_1.Query)('year')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number]),
    __metadata("design:returntype", void 0)
], FeesController.prototype, "pending", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Ver cuota con desglose completo' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], FeesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id/status'),
    (0, roles_decorator_1.Roles)(user_entity_1.UserRole.GESTION),
    (0, swagger_1.ApiOperation)({ summary: 'Actualizar estado de pago de una cuota' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, fees_dto_1.UpdateFeeStatusDto]),
    __metadata("design:returntype", void 0)
], FeesController.prototype, "updateStatus", null);
__decorate([
    (0, common_1.Get)('period-vencimiento'),
    (0, roles_decorator_1.Roles)(user_entity_1.UserRole.GESTION),
    (0, swagger_1.ApiOperation)({ summary: 'Obtener fecha de vencimiento actual de las cuotas del período' }),
    (0, swagger_1.ApiQuery)({ name: 'buildingId', required: true }),
    (0, swagger_1.ApiQuery)({ name: 'month', required: true, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'year', required: true, type: Number }),
    __param(0, (0, common_1.Query)('buildingId')),
    __param(1, (0, common_1.Query)('month')),
    __param(2, (0, common_1.Query)('year')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number]),
    __metadata("design:returntype", void 0)
], FeesController.prototype, "getPeriodVencimiento", null);
__decorate([
    (0, common_1.Patch)('period-vencimiento'),
    (0, roles_decorator_1.Roles)(user_entity_1.UserRole.GESTION),
    (0, swagger_1.ApiOperation)({ summary: 'Actualizar fecha de vencimiento para todas las cuotas del período' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], FeesController.prototype, "updatePeriodVencimiento", null);
exports.FeesController = FeesController = __decorate([
    (0, swagger_1.ApiTags)('Fees'),
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, common_1.Controller)('fees'),
    __metadata("design:paramtypes", [fees_service_1.FeesService])
], FeesController);
//# sourceMappingURL=fees.controller.js.map