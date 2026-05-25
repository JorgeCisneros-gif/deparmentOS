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
exports.AlicuotasController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const alicuotas_service_1 = require("./alicuotas.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const user_entity_1 = require("../users/user.entity");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const swagger_2 = require("@nestjs/swagger");
class AlicuotaLineaDto {
}
__decorate([
    (0, swagger_2.ApiProperty)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], AlicuotaLineaDto.prototype, "idDepartamento", void 0);
__decorate([
    (0, swagger_2.ApiProperty)({ example: 25.0 }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], AlicuotaLineaDto.prototype, "porcentaje", void 0);
class SaveAlicuotasDto {
}
__decorate([
    (0, swagger_2.ApiProperty)({ type: [AlicuotaLineaDto] }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => AlicuotaLineaDto),
    __metadata("design:type", Array)
], SaveAlicuotasDto.prototype, "lineas", void 0);
let AlicuotasController = class AlicuotasController {
    constructor(svc) {
        this.svc = svc;
    }
    getForPeriod(servicioId, edificioId, month, year) {
        return this.svc.getForPeriod(servicioId, edificioId, +month, +year);
    }
    saveForPeriod(servicioId, month, year, dto) {
        return this.svc.saveForPeriod(servicioId, +month, +year, dto.lineas);
    }
};
exports.AlicuotasController = AlicuotasController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Ver alícuotas de un servicio para un período' }),
    (0, swagger_1.ApiQuery)({ name: 'servicioId', required: true }),
    (0, swagger_1.ApiQuery)({ name: 'edificioId', required: true }),
    (0, swagger_1.ApiQuery)({ name: 'month', required: true, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'year', required: true, type: Number }),
    __param(0, (0, common_1.Query)('servicioId')),
    __param(1, (0, common_1.Query)('edificioId')),
    __param(2, (0, common_1.Query)('month')),
    __param(3, (0, common_1.Query)('year')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Number, Number]),
    __metadata("design:returntype", void 0)
], AlicuotasController.prototype, "getForPeriod", null);
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Guardar alícuotas de un período (upsert por depto)' }),
    (0, swagger_1.ApiQuery)({ name: 'servicioId', required: true }),
    (0, swagger_1.ApiQuery)({ name: 'month', required: true, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'year', required: true, type: Number }),
    (0, swagger_1.ApiBody)({ type: SaveAlicuotasDto }),
    __param(0, (0, common_1.Query)('servicioId')),
    __param(1, (0, common_1.Query)('month')),
    __param(2, (0, common_1.Query)('year')),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number, SaveAlicuotasDto]),
    __metadata("design:returntype", void 0)
], AlicuotasController.prototype, "saveForPeriod", null);
exports.AlicuotasController = AlicuotasController = __decorate([
    (0, swagger_1.ApiTags)('Alicuotas'),
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(user_entity_1.UserRole.SUPERVISOR),
    (0, common_1.Controller)('alicuotas'),
    __metadata("design:paramtypes", [alicuotas_service_1.AlicuotasService])
], AlicuotasController);
//# sourceMappingURL=alicuotas.controller.js.map