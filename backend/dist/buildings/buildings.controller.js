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
exports.BuildingsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const buildings_service_1 = require("./buildings.service");
const buildings_dto_1 = require("./buildings.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const subscription_guard_1 = require("../auth/guards/subscription.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const user_entity_1 = require("../users/user.entity");
const grupos_service_1 = require("../grupos/grupos.service");
let BuildingsController = class BuildingsController {
    constructor(svc, gruposSvc) {
        this.svc = svc;
        this.gruposSvc = gruposSvc;
    }
    async create(dto, req) {
        if (!dto['idGrupo']) {
            if (req.user.role === user_entity_1.UserRole.SUPERVISOR) {
                const superGrupo = await this.gruposSvc.getSuperGrupo();
                dto['idGrupo'] = superGrupo.id;
            }
            else if (req.user.idGrupo) {
                dto['idGrupo'] = req.user.idGrupo;
            }
        }
        return this.svc.create(dto);
    }
    async findAll(req) {
        if (req.user.role === user_entity_1.UserRole.SUPERVISOR) {
            return this.svc.findAll();
        }
        return this.svc.findByGrupo(req.user.idGrupo);
    }
    findOne(id) { return this.svc.findOne(id); }
    update(id, dto, req) {
        if (dto['idGrupo'] && req.user.role !== user_entity_1.UserRole.SUPERVISOR) {
            delete dto['idGrupo'];
        }
        return this.svc.update(id, dto);
    }
    remove(id) { return this.svc.remove(id); }
};
exports.BuildingsController = BuildingsController;
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)(user_entity_1.UserRole.ADMINISTRADOR),
    (0, common_1.UseGuards)(subscription_guard_1.SubscriptionGuard),
    (0, subscription_guard_1.SubscriptionCheck)('edificios'),
    (0, swagger_1.ApiOperation)({ summary: 'Crear edificio' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [buildings_dto_1.CreateBuildingDto, Object]),
    __metadata("design:returntype", Promise)
], BuildingsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)(user_entity_1.UserRole.GESTION),
    (0, swagger_1.ApiOperation)({ summary: 'Listar edificios' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BuildingsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, roles_decorator_1.Roles)(user_entity_1.UserRole.PROPIETARIO),
    (0, swagger_1.ApiOperation)({ summary: 'Ver edificio' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], BuildingsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, roles_decorator_1.Roles)(user_entity_1.UserRole.ADMINISTRADOR),
    (0, swagger_1.ApiOperation)({ summary: 'Actualizar edificio (incluye cambio de grupo)' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, buildings_dto_1.UpdateBuildingDto, Object]),
    __metadata("design:returntype", void 0)
], BuildingsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, roles_decorator_1.Roles)(user_entity_1.UserRole.SUPERVISOR),
    (0, swagger_1.ApiOperation)({ summary: 'Eliminar edificio' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], BuildingsController.prototype, "remove", null);
exports.BuildingsController = BuildingsController = __decorate([
    (0, swagger_1.ApiTags)('Buildings'),
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, common_1.Controller)('buildings'),
    __metadata("design:paramtypes", [buildings_service_1.BuildingsService,
        grupos_service_1.GruposService])
], BuildingsController);
//# sourceMappingURL=buildings.controller.js.map