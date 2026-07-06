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
exports.CleaningController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const cleaning_service_1 = require("./cleaning.service");
const cleaning_dto_1 = require("./cleaning.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const user_entity_1 = require("../users/user.entity");
let CleaningController = class CleaningController {
    constructor(svc) {
        this.svc = svc;
    }
    createProvider(dto) { return this.svc.createProvider(dto); }
    findProviders(buildingId) {
        return this.svc.findProviders(buildingId);
    }
    findProvider(id) { return this.svc.findProvider(id); }
    updateProvider(id, dto) {
        return this.svc.updateProvider(id, dto);
    }
    deactivateProvider(id) { return this.svc.deactivateProvider(id); }
    createArea(dto) { return this.svc.createArea(dto); }
    findAreas(buildingId) { return this.svc.findAreas(buildingId); }
    findArea(id) { return this.svc.findArea(id); }
    updateArea(id, dto) {
        return this.svc.updateArea(id, dto);
    }
    createRecord(dto) { return this.svc.createRecord(dto); }
    findRecords(buildingId, year, month) { return this.svc.findRecords(buildingId, year, month); }
    findRecord(id) { return this.svc.findRecord(id); }
    updateRecord(id, dto) {
        return this.svc.updateRecord(id, dto);
    }
    confirmProviderPayment(id, dto) { return this.svc.confirmProviderPayment(id, dto); }
    getMessage(id, buildingId) { return this.svc.generateCleaningMessage(id, buildingId); }
    confirmMessage(id, req) {
        return this.svc.confirmCleaningMessageSent(id, req.user.id);
    }
};
exports.CleaningController = CleaningController;
__decorate([
    (0, common_1.Post)('providers'),
    (0, swagger_1.ApiOperation)({ summary: 'Registrar proveedor de limpieza (persona que limpia)' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [cleaning_dto_1.CreateProviderDto]),
    __metadata("design:returntype", void 0)
], CleaningController.prototype, "createProvider", null);
__decorate([
    (0, common_1.Get)('providers'),
    (0, swagger_1.ApiOperation)({ summary: 'Listar proveedores del edificio' }),
    (0, swagger_1.ApiQuery)({ name: 'buildingId', required: true }),
    __param(0, (0, common_1.Query)('buildingId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CleaningController.prototype, "findProviders", null);
__decorate([
    (0, common_1.Get)('providers/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Ver proveedor' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CleaningController.prototype, "findProvider", null);
__decorate([
    (0, common_1.Patch)('providers/:id'),
    (0, swagger_1.ApiOperation)({
        summary: 'Actualizar proveedor',
        description: 'Actualiza datos del proveedor: nombre, cuenta bancaria, costo por día, etc.',
    }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, cleaning_dto_1.UpdateProviderDto]),
    __metadata("design:returntype", void 0)
], CleaningController.prototype, "updateProvider", null);
__decorate([
    (0, common_1.Patch)('providers/:id/deactivate'),
    (0, swagger_1.ApiOperation)({ summary: 'Desactivar proveedor' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CleaningController.prototype, "deactivateProvider", null);
__decorate([
    (0, common_1.Post)('areas'),
    (0, swagger_1.ApiOperation)({
        summary: 'Registrar ambiente de limpieza',
        description: 'Ej: Lobby, Cochera, Escaleras. Cada edificio puede tener sus propios ambientes con costos distintos.',
    }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [cleaning_dto_1.CreateAreaDto]),
    __metadata("design:returntype", void 0)
], CleaningController.prototype, "createArea", null);
__decorate([
    (0, common_1.Get)('areas'),
    (0, swagger_1.ApiOperation)({ summary: 'Listar ambientes del edificio' }),
    (0, swagger_1.ApiQuery)({ name: 'buildingId', required: true }),
    __param(0, (0, common_1.Query)('buildingId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CleaningController.prototype, "findAreas", null);
__decorate([
    (0, common_1.Get)('areas/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Ver ambiente' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CleaningController.prototype, "findArea", null);
__decorate([
    (0, common_1.Patch)('areas/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Actualizar ambiente (nombre, costo extra, orden)' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, cleaning_dto_1.UpdateAreaDto]),
    __metadata("design:returntype", void 0)
], CleaningController.prototype, "updateArea", null);
__decorate([
    (0, common_1.Post)('records'),
    (0, swagger_1.ApiOperation)({
        summary: 'Registrar limpieza mensual',
        description: `
Registra los días trabajados y ambientes limpiados del mes.  
El costo total se calcula automáticamente:  
**costo_total = (días × costo_por_día) + suma(costos_extra_ambientes)**

El detalle de días es opcional — sirve para auditoría si se quiere registrar qué días exactos se limpió.
    `,
    }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [cleaning_dto_1.CreateCleaningRecordDto]),
    __metadata("design:returntype", void 0)
], CleaningController.prototype, "createRecord", null);
__decorate([
    (0, common_1.Get)('records'),
    (0, swagger_1.ApiOperation)({ summary: 'Listar registros de limpieza del edificio' }),
    (0, swagger_1.ApiQuery)({ name: 'buildingId', required: true }),
    (0, swagger_1.ApiQuery)({ name: 'year', required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'month', required: false, type: Number }),
    __param(0, (0, common_1.Query)('buildingId')),
    __param(1, (0, common_1.Query)('year')),
    __param(2, (0, common_1.Query)('month')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number]),
    __metadata("design:returntype", void 0)
], CleaningController.prototype, "findRecords", null);
__decorate([
    (0, common_1.Get)('records/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Ver registro de limpieza con detalle de costos' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CleaningController.prototype, "findRecord", null);
__decorate([
    (0, common_1.Patch)('records/:id'),
    (0, swagger_1.ApiOperation)({
        summary: 'Actualizar registro mensual',
        description: 'Permite corregir días trabajados, ambientes o marcar el pago al proveedor.',
    }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, cleaning_dto_1.UpdateCleaningRecordDto]),
    __metadata("design:returntype", void 0)
], CleaningController.prototype, "updateRecord", null);
__decorate([
    (0, common_1.Post)('records/:id/pay-provider'),
    (0, swagger_1.ApiOperation)({
        summary: '💰 Confirmar pago al proveedor de limpieza',
        description: `
Registra que se pagó al proveedor directamente.  
**Este pago es independiente del cobro a los propietarios.**  
El cobro a los propietarios se gestiona por separado con el mensaje de limpieza.
    `,
    }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, cleaning_dto_1.ConfirmProviderPaymentDto]),
    __metadata("design:returntype", void 0)
], CleaningController.prototype, "confirmProviderPayment", null);
__decorate([
    (0, common_1.Get)('records/:id/message'),
    (0, swagger_1.ApiOperation)({
        summary: '📱 Generar mensaje de cobro de limpieza para los propietarios',
        description: `
Genera el mensaje específico de limpieza con:
- Días trabajados y ambientes
- Cuota por departamento (monto_total ÷ nro deptos)
- **Datos de pago del proveedor** (no del edificio)

⚠️ Este mensaje es **diferente** al de agua/luz/internet:  
el pago va directo al proveedor por su cuenta bancaria o Yape/Plin.
    `,
    }),
    (0, swagger_1.ApiQuery)({ name: 'buildingId', required: true }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('buildingId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], CleaningController.prototype, "getMessage", null);
__decorate([
    (0, common_1.Post)('records/:id/confirm-message'),
    (0, swagger_1.ApiOperation)({ summary: '✅ Confirmar que se envió el mensaje de limpieza' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], CleaningController.prototype, "confirmMessage", null);
exports.CleaningController = CleaningController = __decorate([
    (0, swagger_1.ApiTags)('Cleaning'),
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(user_entity_1.UserRole.GESTION),
    (0, common_1.Controller)('cleaning'),
    __metadata("design:paramtypes", [cleaning_service_1.CleaningService])
], CleaningController);
//# sourceMappingURL=cleaning.controller.js.map