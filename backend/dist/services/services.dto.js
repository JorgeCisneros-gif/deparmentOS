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
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateServiceDto = exports.CreateServiceDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const service_entity_1 = require("./service.entity");
class CreateServiceDto {
}
exports.CreateServiceDto = CreateServiceDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateServiceDto.prototype, "idEdificio", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Agua Sedapal' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateServiceDto.prototype, "nombreServicio", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: service_entity_1.TipoServicio }),
    (0, class_validator_1.IsEnum)(service_entity_1.TipoServicio),
    __metadata("design:type", String)
], CreateServiceDto.prototype, "tipo", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: service_entity_1.ModoCalculo }),
    (0, class_validator_1.IsEnum)(service_entity_1.ModoCalculo),
    __metadata("design:type", String)
], CreateServiceDto.prototype, "modoCalculo", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        enum: ['m3', 'kwh', 'unidad'],
        description: 'm3=metros cúbicos (agua/gas), kwh=kilovatios hora (luz), unidad=genérico',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['m3', 'kwh', 'unidad']),
    __metadata("design:type", String)
], CreateServiceDto.prototype, "unidadMedida", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        example: { proveedor: 'Empresa Limpieza SAC', zonas: ['Lobby', 'Escaleras'] },
        description: 'Detalle adicional según el tipo de servicio',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], CreateServiceDto.prototype, "detalleServicio", void 0);
class UpdateServiceDto extends (0, swagger_1.PartialType)(CreateServiceDto) {
}
exports.UpdateServiceDto = UpdateServiceDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateServiceDto.prototype, "activo", void 0);
//# sourceMappingURL=services.dto.js.map