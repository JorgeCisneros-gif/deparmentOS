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
exports.ReadingsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const readings_service_1 = require("./readings.service");
const readings_dto_1 = require("./readings.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const scheduler_token_guard_1 = require("../auth/guards/scheduler-token.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const user_entity_1 = require("../users/user.entity");
let ReadingsController = class ReadingsController {
    constructor(svc) {
        this.svc = svc;
    }
    create(dto) {
        return this.svc.create(dto);
    }
    findAll(receiptId, deptId) {
        return this.svc.findAll(receiptId, deptId);
    }
    async getHistory(deptId, req) {
        if (req.user.role === user_entity_1.UserRole.PROPIETARIO && req.user.idDepartamento !== deptId) {
            throw new common_1.BadRequestException('Solo puede ver el historial de su propio departamento');
        }
        return this.svc.getConsumptionHistory(deptId, req.user.role === user_entity_1.UserRole.SUPERVISOR);
    }
    getMeterImage(id) {
        return this.svc.getMeterImageById(id);
    }
    findOne(id) {
        return this.svc.findOne(id);
    }
    update(id, dto) {
        return this.svc.update(id, dto);
    }
    async uploadOcr(req) {
        const fields = {};
        let fileBuffer = null;
        let originalBuffer = null;
        let originalName = 'medidor.jpg';
        let mimeType = 'image/jpeg';
        let fileSizeKb = 0;
        try {
            const parts = req.parts();
            for await (const part of parts) {
                if (part.file) {
                    const buf = await part.toBuffer();
                    if (part.fieldname === 'original') {
                        originalBuffer = buf;
                    }
                    else {
                        fileBuffer = buf;
                        originalName = part.filename || 'medidor.jpg';
                        mimeType = part.mimetype || 'image/jpeg';
                        fileSizeKb = Math.round(buf.length / 1024);
                    }
                }
                else {
                    fields[part.fieldname] = part.value?.trim() || '';
                }
            }
        }
        catch (err) {
            throw new common_1.BadRequestException(`Error procesando el formulario: ${err.message}`);
        }
        const departamentoId = fields['departamentoId'] || '';
        const reciboId = fields['reciboId'] || '';
        if (!fileBuffer || fileBuffer.length === 0)
            throw new common_1.BadRequestException('Se requiere una imagen (campo: image)');
        if (!departamentoId)
            throw new common_1.BadRequestException('departamentoId es requerido');
        if (!reciboId)
            throw new common_1.BadRequestException('reciboId es requerido');
        const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!allowed.includes(mimeType.toLowerCase())) {
            throw new common_1.BadRequestException('Solo se aceptan imágenes JPG, PNG o WEBP');
        }
        return this.svc.processOcrImage(fileBuffer, originalName, fileSizeKb, mimeType, departamentoId, reciboId, req.user.id, originalBuffer ?? undefined);
    }
    confirmOcr(body, req) {
        if (!body || typeof body !== 'object') {
            throw new common_1.BadRequestException('El cuerpo de la petición es requerido y debe ser JSON.');
        }
        const { sessionId, meterImageId, ...dto } = body;
        if (!dto.idRecibo || !dto.idDepartamento) {
            throw new common_1.BadRequestException('idRecibo e idDepartamento son requeridos');
        }
        if (dto.lecturaFinal === undefined || dto.lecturaAnterior === undefined) {
            throw new common_1.BadRequestException('lecturaFinal y lecturaAnterior son requeridos');
        }
        return this.svc.confirmOcr({ sessionId, meterImageId }, dto, req.user.id);
    }
    housekeeping() {
        return this.svc.runHousekeeping();
    }
};
exports.ReadingsController = ReadingsController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(user_entity_1.UserRole.GESTION),
    (0, swagger_1.ApiOperation)({ summary: 'Registrar medición manual' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [readings_dto_1.CreateReadingDto]),
    __metadata("design:returntype", void 0)
], ReadingsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Listar mediciones' }),
    (0, swagger_1.ApiQuery)({ name: 'receiptId', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'deptId', required: false }),
    __param(0, (0, common_1.Query)('receiptId')),
    __param(1, (0, common_1.Query)('deptId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], ReadingsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('history/:deptId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Historial de consumo de agua de un departamento' }),
    __param(0, (0, common_1.Param)('deptId')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ReadingsController.prototype, "getHistory", null);
__decorate([
    (0, common_1.Get)('meter-image/:id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Obtener filename de imagen de medidor por su ID' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ReadingsController.prototype, "getMeterImage", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Ver medición' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ReadingsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(user_entity_1.UserRole.GESTION),
    (0, swagger_1.ApiOperation)({ summary: 'Corregir medición' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, readings_dto_1.UpdateReadingDto]),
    __metadata("design:returntype", void 0)
], ReadingsController.prototype, "update", null);
__decorate([
    (0, common_1.Post)('ocr'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(user_entity_1.UserRole.GESTION),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiOperation)({
        summary: '📸 Subir foto del medidor → OCR automático',
        description: 'Procesa OCR pero NO persiste la imagen todavía. Devuelve un sessionId ' +
            'temporal (30 min) que debe usarse en POST /readings/confirm-ocr.',
    }),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            required: ['image', 'departamentoId', 'reciboId'],
            properties: {
                departamentoId: { type: 'string', format: 'uuid' },
                reciboId: { type: 'string', format: 'uuid' },
                image: { type: 'string', format: 'binary' },
                original: { type: 'string', format: 'binary' },
            },
        },
    }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ReadingsController.prototype, "uploadOcr", null);
__decorate([
    (0, common_1.Post)('confirm-ocr'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(user_entity_1.UserRole.GESTION),
    (0, swagger_1.ApiOperation)({
        summary: '✅ Confirmar lectura OCR y guardar medición',
    }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ReadingsController.prototype, "confirmOcr", null);
__decorate([
    (0, common_1.Post)('housekeeping'),
    (0, common_1.UseGuards)(scheduler_token_guard_1.SchedulerTokenGuard),
    (0, swagger_1.ApiOperation)({
        summary: '🧹 Housekeeping de fotos de medidores [Solo scheduler]',
        description: 'Endpoint interno disparado por el servicio scheduler.\n\n' +
            'Realiza:\n' +
            '1. Reintenta uploads pendientes al Storage Gateway\n' +
            '2. Borra archivos locales que ya están confirmados en Drive\n' +
            '3. Expira fotos locales viejas (legacy)\n\n' +
            'Autenticación: header `Authorization: Bearer <SCHEDULER_API_TOKEN>` ' +
            'o `x-scheduler-token: <SCHEDULER_API_TOKEN>`.',
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ReadingsController.prototype, "housekeeping", null);
exports.ReadingsController = ReadingsController = __decorate([
    (0, swagger_1.ApiTags)('Readings'),
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, common_1.Controller)('readings'),
    __metadata("design:paramtypes", [readings_service_1.ReadingsService])
], ReadingsController);
//# sourceMappingURL=readings.controller.js.map