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
exports.PaymentsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const payments_service_1 = require("./payments.service");
const payments_dto_1 = require("./payments.dto");
const image_upload_service_1 = require("../shared/image-upload.service");
const fees_service_1 = require("../fees/fees.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const user_entity_1 = require("../users/user.entity");
let PaymentsController = class PaymentsController {
    constructor(svc, imageUpload, feesService) {
        this.svc = svc;
        this.imageUpload = imageUpload;
        this.feesService = feesService;
    }
    async getMyFees(req, year, month) {
        const idDepartamento = req.user.idDepartamento;
        if (!idDepartamento)
            throw new common_1.BadRequestException('Usuario sin departamento asignado');
        return this.feesService.findAll(idDepartamento, year ? +year : undefined, month ? +month : undefined);
    }
    getPendingApproval() {
        return this.svc.getPendingApproval();
    }
    periodSummary(buildingId, month, year) {
        return this.svc.getPeriodSummary(buildingId, +month, +year);
    }
    pending(buildingId, month, year) {
        return this.svc.getPendingByBuilding(buildingId, +month, +year);
    }
    findAll(feeId, ownerId) {
        return this.svc.findAll(feeId, ownerId);
    }
    create(dto) {
        return this.svc.create(dto);
    }
    createPropietario(dto, req) {
        const idPropietario = req.user.idPropietario ?? null;
        return this.svc.createPropietario(dto, idPropietario);
    }
    findOne(id) {
        return this.svc.findOne(id);
    }
    async uploadComprobante(id, body) {
        const filepath = this.imageUpload.saveBase64(body.base64, body.filename, `comprobante_${id}`, { subdir: 'comprobantes' });
        const urlPath = '/' + filepath.replace(/^\.?\//, '').replace(/\\/g, '/');
        return this.svc.updateComprobanteUrl(id, urlPath);
    }
    approve(id, req) {
        return this.svc.approvePayment(id, req.user.id);
    }
    reject(id, req) {
        return this.svc.rejectPayment(id, req.user.id);
    }
};
exports.PaymentsController = PaymentsController;
__decorate([
    (0, common_1.Get)('my-fees'),
    (0, roles_decorator_1.Roles)(user_entity_1.UserRole.SUPERVISOR, user_entity_1.UserRole.PROPIETARIO),
    (0, swagger_1.ApiOperation)({ summary: 'Cuotas del departamento del usuario autenticado' }),
    (0, swagger_1.ApiQuery)({ name: 'year', required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'month', required: false, type: Number }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('year')),
    __param(2, (0, common_1.Query)('month')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, Number]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "getMyFees", null);
__decorate([
    (0, common_1.Get)('pending-approval'),
    (0, swagger_1.ApiOperation)({ summary: 'Listar pagos pendientes de aprobación del supervisor' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PaymentsController.prototype, "getPendingApproval", null);
__decorate([
    (0, common_1.Get)('period-summary'),
    (0, swagger_1.ApiOperation)({ summary: 'Resumen completo del período para cobros' }),
    (0, swagger_1.ApiQuery)({ name: 'buildingId', required: true }),
    (0, swagger_1.ApiQuery)({ name: 'month', required: true, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'year', required: true, type: Number }),
    __param(0, (0, common_1.Query)('buildingId')),
    __param(1, (0, common_1.Query)('month')),
    __param(2, (0, common_1.Query)('year')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number]),
    __metadata("design:returntype", void 0)
], PaymentsController.prototype, "periodSummary", null);
__decorate([
    (0, common_1.Get)('pending'),
    (0, swagger_1.ApiOperation)({ summary: 'Saldo pendiente por edificio y período' }),
    (0, swagger_1.ApiQuery)({ name: 'buildingId', required: true }),
    (0, swagger_1.ApiQuery)({ name: 'month', required: true, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'year', required: true, type: Number }),
    __param(0, (0, common_1.Query)('buildingId')),
    __param(1, (0, common_1.Query)('month')),
    __param(2, (0, common_1.Query)('year')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number]),
    __metadata("design:returntype", void 0)
], PaymentsController.prototype, "pending", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Listar pagos' }),
    (0, swagger_1.ApiQuery)({ name: 'feeId', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'ownerId', required: false }),
    __param(0, (0, common_1.Query)('feeId')),
    __param(1, (0, common_1.Query)('ownerId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], PaymentsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Registrar pago de una cuota' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [payments_dto_1.CreatePaymentDto]),
    __metadata("design:returntype", void 0)
], PaymentsController.prototype, "create", null);
__decorate([
    (0, common_1.Post)('propietario'),
    (0, roles_decorator_1.Roles)(user_entity_1.UserRole.SUPERVISOR, user_entity_1.UserRole.PROPIETARIO),
    (0, swagger_1.ApiOperation)({ summary: 'Propietario registra pago (queda pendiente de aprobación)' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [payments_dto_1.CreatePagoAutoDto, Object]),
    __metadata("design:returntype", void 0)
], PaymentsController.prototype, "createPropietario", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Ver pago' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PaymentsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(':id/comprobante'),
    (0, roles_decorator_1.Roles)(user_entity_1.UserRole.SUPERVISOR, user_entity_1.UserRole.PROPIETARIO),
    (0, swagger_1.ApiOperation)({ summary: 'Subir imagen de comprobante en base64' }),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            properties: {
                base64: { type: 'string' },
                filename: { type: 'string' },
            },
            required: ['base64', 'filename'],
        },
    }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "uploadComprobante", null);
__decorate([
    (0, common_1.Patch)(':id/approve'),
    (0, swagger_1.ApiOperation)({ summary: 'Supervisor aprueba un pago pendiente' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], PaymentsController.prototype, "approve", null);
__decorate([
    (0, common_1.Patch)(':id/reject'),
    (0, swagger_1.ApiOperation)({ summary: 'Supervisor rechaza un pago pendiente' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], PaymentsController.prototype, "reject", null);
exports.PaymentsController = PaymentsController = __decorate([
    (0, swagger_1.ApiTags)('Payments'),
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(user_entity_1.UserRole.SUPERVISOR),
    (0, common_1.Controller)('payments'),
    __metadata("design:paramtypes", [payments_service_1.PaymentsService,
        image_upload_service_1.ImageUploadService,
        fees_service_1.FeesService])
], PaymentsController);
//# sourceMappingURL=payments.controller.js.map