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
exports.NotificationsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const notifications_service_1 = require("./notifications.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const user_entity_1 = require("../users/user.entity");
let NotificationsController = class NotificationsController {
    constructor(svc) {
        this.svc = svc;
    }
    getSystemVars() {
        return { sistema: this.svc.getSystemVariables(), servicios: this.svc.getServiceVariables() };
    }
    getAllVars(buildingId) {
        return this.svc.getAllVariables(buildingId);
    }
    getCustomVars(buildingId) {
        return this.svc.getCustomVariables(buildingId);
    }
    saveCustomVars(buildingId, body) {
        return this.svc.saveCustomVariables(buildingId, body.variables);
    }
    getTemplate(buildingId) {
        return this.svc.getTemplate(buildingId);
    }
    saveTemplate(buildingId, body) {
        return this.svc.saveTemplate(buildingId, body.templateText, body.nombre);
    }
    resetTemplate(buildingId) {
        return this.svc.resetTemplate(buildingId);
    }
    updateFee(feeId, dto) {
        return this.svc.updateFeeForMessage(feeId, dto);
    }
    getMessage(feeId) {
        return this.svc.generateMessageForFee(feeId);
    }
    getMessagesPeriod(buildingId, month, year) {
        return this.svc.generateMessagesForPeriod(buildingId, +month, +year);
    }
    confirmOne(feeId, req, body) {
        return this.svc.confirmMessageSent(feeId, req.user.id, body?.fechaMensajeEnviado);
    }
    confirmAll(buildingId, month, year, req) {
        return this.svc.confirmAllMessagesSent(buildingId, +month, +year, req.user.id);
    }
};
exports.NotificationsController = NotificationsController;
__decorate([
    (0, common_1.Get)('template/variables/list'),
    (0, swagger_1.ApiOperation)({ summary: 'Listar variables del sistema y de servicios' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], NotificationsController.prototype, "getSystemVars", null);
__decorate([
    (0, common_1.Get)('template/variables/all/:buildingId'),
    (0, swagger_1.ApiOperation)({ summary: 'Listar todas las variables (sistema + servicios + personalizadas)' }),
    __param(0, (0, common_1.Param)('buildingId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], NotificationsController.prototype, "getAllVars", null);
__decorate([
    (0, common_1.Get)('template/custom-vars/:buildingId'),
    (0, swagger_1.ApiOperation)({ summary: 'Obtener variables personalizadas del edificio' }),
    __param(0, (0, common_1.Param)('buildingId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], NotificationsController.prototype, "getCustomVars", null);
__decorate([
    (0, common_1.Patch)('template/custom-vars/:buildingId'),
    (0, swagger_1.ApiOperation)({ summary: 'Guardar variables personalizadas del edificio' }),
    __param(0, (0, common_1.Param)('buildingId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], NotificationsController.prototype, "saveCustomVars", null);
__decorate([
    (0, common_1.Get)('template/:buildingId'),
    (0, swagger_1.ApiOperation)({ summary: 'Obtener plantilla del edificio' }),
    __param(0, (0, common_1.Param)('buildingId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], NotificationsController.prototype, "getTemplate", null);
__decorate([
    (0, common_1.Patch)('template/:buildingId'),
    (0, swagger_1.ApiOperation)({ summary: 'Guardar plantilla del edificio' }),
    __param(0, (0, common_1.Param)('buildingId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], NotificationsController.prototype, "saveTemplate", null);
__decorate([
    (0, common_1.Post)('template/:buildingId/reset'),
    (0, swagger_1.ApiOperation)({ summary: 'Restablecer plantilla por defecto' }),
    __param(0, (0, common_1.Param)('buildingId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], NotificationsController.prototype, "resetTemplate", null);
__decorate([
    (0, common_1.Patch)('fee/:feeId'),
    (0, swagger_1.ApiOperation)({ summary: 'Editar montos/fecha de vencimiento antes de enviar mensaje' }),
    __param(0, (0, common_1.Param)('feeId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], NotificationsController.prototype, "updateFee", null);
__decorate([
    (0, common_1.Get)('message/:feeId'),
    (0, swagger_1.ApiOperation)({ summary: 'Generar mensaje para un departamento' }),
    __param(0, (0, common_1.Param)('feeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], NotificationsController.prototype, "getMessage", null);
__decorate([
    (0, common_1.Get)('messages/period'),
    (0, swagger_1.ApiOperation)({ summary: 'Generar mensajes para todos los deptos del período' }),
    (0, swagger_1.ApiQuery)({ name: 'buildingId', required: true }),
    (0, swagger_1.ApiQuery)({ name: 'month', required: true, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'year', required: true, type: Number }),
    __param(0, (0, common_1.Query)('buildingId')),
    __param(1, (0, common_1.Query)('month')),
    __param(2, (0, common_1.Query)('year')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number]),
    __metadata("design:returntype", void 0)
], NotificationsController.prototype, "getMessagesPeriod", null);
__decorate([
    (0, common_1.Post)('confirm/:feeId'),
    (0, swagger_1.ApiOperation)({ summary: 'Confirmar envío del mensaje al propietario' }),
    __param(0, (0, common_1.Param)('feeId')),
    __param(1, (0, common_1.Request)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], NotificationsController.prototype, "confirmOne", null);
__decorate([
    (0, common_1.Post)('confirm-all'),
    (0, swagger_1.ApiQuery)({ name: 'buildingId', required: true }),
    (0, swagger_1.ApiQuery)({ name: 'month', required: true, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'year', required: true, type: Number }),
    __param(0, (0, common_1.Query)('buildingId')),
    __param(1, (0, common_1.Query)('month')),
    __param(2, (0, common_1.Query)('year')),
    __param(3, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number, Object]),
    __metadata("design:returntype", void 0)
], NotificationsController.prototype, "confirmAll", null);
exports.NotificationsController = NotificationsController = __decorate([
    (0, swagger_1.ApiTags)('Notifications'),
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(user_entity_1.UserRole.GESTION),
    (0, common_1.Controller)('notifications'),
    __metadata("design:paramtypes", [notifications_service_1.NotificationsService])
], NotificationsController);
//# sourceMappingURL=notifications.controller.js.map