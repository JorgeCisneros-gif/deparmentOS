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
var GastosController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GastosController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const user_entity_1 = require("../users/user.entity");
const gastos_service_1 = require("./gastos.service");
const gastos_dto_1 = require("./gastos.dto");
const image_upload_service_1 = require("../shared/image-upload.service");
let GastosController = GastosController_1 = class GastosController {
    constructor(svc, imgSvc) {
        this.svc = svc;
        this.imgSvc = imgSvc;
        this.logger = new common_1.Logger(GastosController_1.name);
    }
    findAll(buildingId, estado) {
        return this.svc.findAll(buildingId, estado);
    }
    findOne(id) {
        return this.svc.findOne(id);
    }
    async create(dto) {
        this.logger.log(`[POST /gastos] body recibido: ${JSON.stringify(dto)}`);
        try {
            const result = await this.svc.create(dto);
            this.logger.log(`[POST /gastos] gasto creado id=${result.id}`);
            return result;
        }
        catch (err) {
            this.logger.error(`[POST /gastos] ERROR: ${err?.message}`, err?.stack);
            throw new common_1.HttpException({ message: err?.message || 'Error creando gasto', detail: err?.detail || null }, err?.status || common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async update(id, dto) {
        this.logger.log(`[PATCH /gastos/${id}] body: ${JSON.stringify(dto)}`);
        try {
            return await this.svc.update(id, dto);
        }
        catch (err) {
            this.logger.error(`[PATCH /gastos/${id}] ERROR: ${err?.message}`, err?.stack);
            throw new common_1.HttpException({ message: err?.message || 'Error actualizando gasto' }, err?.status || common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    cerrar(id) {
        return this.svc.cerrar(id);
    }
    anular(id) {
        return this.svc.anular(id);
    }
    getPagos(id) {
        return this.svc.getPagos(id);
    }
    async registrarPago(req) {
        this.logger.log(`[POST /gastos/pagos] content-type: ${req.headers['content-type']}`);
        let dto;
        let comprobanteUrl;
        const contentType = req.headers['content-type'] || '';
        if (contentType.includes('multipart/form-data')) {
            try {
                const { fields, image } = await this.imgSvc.parseMultipart(req, {
                    subdir: 'comprobantes', maxSizeMb: 5,
                });
                dto = {
                    idGastoExtra: fields.idGastoExtra,
                    idDepartamento: fields.idDepartamento,
                    fechaPago: fields.fechaPago,
                    monto: parseFloat(fields.monto),
                    tipoPago: fields.tipoPago,
                    banco: fields.banco,
                    referencia: fields.referencia,
                    observacion: fields.observacion,
                };
                if (image) {
                    const filepath = this.imgSvc.saveBuffer(image.buffer, image.filename, 'comprobante', { subdir: 'comprobantes' });
                    comprobanteUrl = `/uploads/comprobantes/${filepath.split(/[/\\]/).pop()}`;
                }
            }
            catch (err) {
                this.logger.error(`[POST /gastos/pagos] multipart error: ${err?.message}`);
                throw new common_1.HttpException({ message: err?.message }, common_1.HttpStatus.BAD_REQUEST);
            }
        }
        else {
            dto = req.body;
            this.logger.log(`[POST /gastos/pagos] JSON body: ${JSON.stringify(dto)}`);
        }
        try {
            return await this.svc.registrarPago(dto, comprobanteUrl);
        }
        catch (err) {
            this.logger.error(`[POST /gastos/pagos] ERROR: ${err?.message}`, err?.stack);
            throw new common_1.HttpException({ message: err?.message || 'Error registrando pago' }, err?.status || common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    deletePago(id) {
        return this.svc.deletePago(id);
    }
    async uploadComprobante(id, body) {
        const filepath = this.imgSvc.saveBase64(body.base64, body.filename, `comprobante_gasto_${id}`, { subdir: 'comprobantes' });
        return this.svc.updatePagoComprobante(id, filepath);
    }
};
exports.GastosController = GastosController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Listar gastos extras de un edificio' }),
    (0, swagger_1.ApiQuery)({ name: 'buildingId', required: true }),
    (0, swagger_1.ApiQuery)({ name: 'estado', required: false }),
    __param(0, (0, common_1.Query)('buildingId')),
    __param(1, (0, common_1.Query)('estado')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], GastosController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Detalle de un gasto con pagos y estado por depto' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], GastosController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)(user_entity_1.UserRole.SUPERVISOR),
    (0, swagger_1.ApiOperation)({ summary: 'Crear nuevo gasto extra' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [gastos_dto_1.CreateGastoDto]),
    __metadata("design:returntype", Promise)
], GastosController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, roles_decorator_1.Roles)(user_entity_1.UserRole.SUPERVISOR),
    (0, swagger_1.ApiOperation)({ summary: 'Editar gasto extra' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, gastos_dto_1.UpdateGastoDto]),
    __metadata("design:returntype", Promise)
], GastosController.prototype, "update", null);
__decorate([
    (0, common_1.Patch)(':id/cerrar'),
    (0, roles_decorator_1.Roles)(user_entity_1.UserRole.SUPERVISOR),
    (0, swagger_1.ApiOperation)({ summary: 'Cerrar un gasto' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], GastosController.prototype, "cerrar", null);
__decorate([
    (0, common_1.Patch)(':id/anular'),
    (0, roles_decorator_1.Roles)(user_entity_1.UserRole.SUPERVISOR),
    (0, swagger_1.ApiOperation)({ summary: 'Anular un gasto' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], GastosController.prototype, "anular", null);
__decorate([
    (0, common_1.Get)(':id/pagos'),
    (0, swagger_1.ApiOperation)({ summary: 'Pagos registrados de un gasto' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], GastosController.prototype, "getPagos", null);
__decorate([
    (0, common_1.Post)('pagos'),
    (0, roles_decorator_1.Roles)(user_entity_1.UserRole.SUPERVISOR),
    (0, swagger_1.ApiOperation)({ summary: 'Registrar pago de gasto extra' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], GastosController.prototype, "registrarPago", null);
__decorate([
    (0, common_1.Delete)('pagos/:id'),
    (0, roles_decorator_1.Roles)(user_entity_1.UserRole.SUPERVISOR),
    (0, swagger_1.ApiOperation)({ summary: 'Eliminar un pago de gasto extra' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], GastosController.prototype, "deletePago", null);
__decorate([
    (0, common_1.Post)('pagos/:id/comprobante'),
    (0, roles_decorator_1.Roles)(user_entity_1.UserRole.SUPERVISOR),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], GastosController.prototype, "uploadComprobante", null);
exports.GastosController = GastosController = GastosController_1 = __decorate([
    (0, swagger_1.ApiTags)('gastos'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, common_1.Controller)('gastos'),
    __metadata("design:paramtypes", [gastos_service_1.GastosService,
        image_upload_service_1.ImageUploadService])
], GastosController);
//# sourceMappingURL=gastos.controller.js.map