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
var PaymentsController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const fs = __importStar(require("fs"));
const payments_service_1 = require("./payments.service");
const payments_dto_1 = require("./payments.dto");
const image_upload_service_1 = require("../shared/image-upload.service");
const fees_service_1 = require("../fees/fees.service");
const storage_gateway_service_1 = require("../storage-gateway/storage-gateway.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const scheduler_token_guard_1 = require("../auth/guards/scheduler-token.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const user_entity_1 = require("../users/user.entity");
let PaymentsController = PaymentsController_1 = class PaymentsController {
    constructor(svc, imageUpload, feesService, storageGateway) {
        this.svc = svc;
        this.imageUpload = imageUpload;
        this.feesService = feesService;
        this.storageGateway = storageGateway;
        this.logger = new common_1.Logger(PaymentsController_1.name);
    }
    housekeeping() {
        return this.svc.runHousekeeping();
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
    async getVoucherContent(id, reply) {
        const voucher = await this.svc.getVoucherById(id);
        if (!voucher)
            throw new common_1.NotFoundException('Comprobante no encontrado');
        if (voucher.storageProvider === 'local' && voucher.filepath) {
            if (!fs.existsSync(voucher.filepath)) {
                this.logger.warn(`Archivo local no existe: ${voucher.filepath}`);
                throw new common_1.NotFoundException('Archivo no disponible en el servidor');
            }
            const buffer = fs.readFileSync(voucher.filepath);
            const contentType = voucher.mimeType || this.guessMimeType(voucher.filename);
            reply
                .header('content-type', contentType)
                .header('cache-control', 'private, max-age=3600')
                .header('content-disposition', `inline; filename="${voucher.filename}"`)
                .send(buffer);
            return;
        }
        if (voucher.storageProvider === 'google_drive') {
            const ctx = await this.svc.resolveOrgIdForVoucher(id);
            if (!ctx)
                throw new common_1.NotFoundException('No se pudo resolver el contexto');
            const fileId = await this.svc.getGatewayFileId(id);
            if (!fileId)
                throw new common_1.NotFoundException('Comprobante sin file_id en el gateway');
            try {
                const file = await this.storageGateway.downloadFileBytes(fileId, ctx.idGrupo);
                reply
                    .header('content-type', file.contentType)
                    .header('cache-control', 'private, max-age=3600')
                    .header('content-disposition', `inline; filename="${file.fileName || voucher.filename}"`)
                    .send(file.buffer);
                return;
            }
            catch (err) {
                this.logger.error(`Error sirviendo voucher ${id} desde Drive: ${err.message}`);
                if (voucher.filepath && fs.existsSync(voucher.filepath)) {
                    const buffer = fs.readFileSync(voucher.filepath);
                    reply
                        .header('content-type', voucher.mimeType || 'image/jpeg')
                        .send(buffer);
                    return;
                }
                throw new common_1.NotFoundException('No se pudo cargar el comprobante');
            }
        }
        throw new common_1.NotFoundException('Comprobante no disponible');
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
    async uploadComprobante(id, body, req) {
        const voucher = await this.svc.uploadVoucher({
            paymentId: id,
            base64: body.base64,
            filename: body.filename,
            uploadedBy: req.user.id,
        });
        return {
            voucherId: voucher.id,
            storageProvider: voucher.storageProvider,
            filename: voucher.filename,
        };
    }
    approve(id, req) {
        return this.svc.approvePayment(id, req.user.id);
    }
    reject(id, req) {
        return this.svc.rejectPayment(id, req.user.id);
    }
    guessMimeType(filename) {
        const ext = (filename || '').toLowerCase().split('.').pop() || '';
        if (ext === 'png')
            return 'image/png';
        if (ext === 'webp')
            return 'image/webp';
        if (ext === 'gif')
            return 'image/gif';
        return 'image/jpeg';
    }
};
exports.PaymentsController = PaymentsController;
__decorate([
    (0, common_1.Post)('housekeeping'),
    (0, common_1.UseGuards)(scheduler_token_guard_1.SchedulerTokenGuard),
    (0, swagger_1.ApiOperation)({
        summary: '🧹 Housekeeping de comprobantes de pago [Solo scheduler]',
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PaymentsController.prototype, "housekeeping", null);
__decorate([
    (0, common_1.Get)('my-fees'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
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
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(user_entity_1.UserRole.GESTION),
    (0, swagger_1.ApiOperation)({ summary: 'Listar pagos pendientes de aprobación del supervisor' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PaymentsController.prototype, "getPendingApproval", null);
__decorate([
    (0, common_1.Get)('period-summary'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(user_entity_1.UserRole.GESTION),
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
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(user_entity_1.UserRole.GESTION),
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
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(user_entity_1.UserRole.GESTION),
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
    (0, common_1.Get)('voucher/:id/content'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Sirve los bytes del comprobante (local o Drive)' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Response)({ passthrough: false })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "getVoucherContent", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(user_entity_1.UserRole.GESTION),
    (0, swagger_1.ApiOperation)({ summary: 'Registrar pago de una cuota' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [payments_dto_1.CreatePaymentDto]),
    __metadata("design:returntype", void 0)
], PaymentsController.prototype, "create", null);
__decorate([
    (0, common_1.Post)('propietario'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
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
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Ver pago' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PaymentsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(':id/comprobante'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
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
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], PaymentsController.prototype, "uploadComprobante", null);
__decorate([
    (0, common_1.Patch)(':id/approve'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(user_entity_1.UserRole.GESTION),
    (0, swagger_1.ApiOperation)({ summary: 'Supervisor aprueba un pago pendiente' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], PaymentsController.prototype, "approve", null);
__decorate([
    (0, common_1.Patch)(':id/reject'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(user_entity_1.UserRole.GESTION),
    (0, swagger_1.ApiOperation)({ summary: 'Supervisor rechaza un pago pendiente' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], PaymentsController.prototype, "reject", null);
exports.PaymentsController = PaymentsController = PaymentsController_1 = __decorate([
    (0, swagger_1.ApiTags)('Payments'),
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, common_1.Controller)('payments'),
    __metadata("design:paramtypes", [payments_service_1.PaymentsService,
        image_upload_service_1.ImageUploadService,
        fees_service_1.FeesService,
        storage_gateway_service_1.StorageGatewayService])
], PaymentsController);
//# sourceMappingURL=payments.controller.js.map