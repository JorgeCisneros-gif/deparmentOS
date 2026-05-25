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
exports.UpdatePropietarioDto = exports.CreatePropietarioDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class CreatePropietarioDto {
}
exports.CreatePropietarioDto = CreatePropietarioDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Juan Pérez' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(150),
    __metadata("design:type", String)
], CreatePropietarioDto.prototype, "nombre", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '999888777' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePropietarioDto.prototype, "telefono", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'juan@gmail.com' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePropietarioDto.prototype, "correo", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: ['bcp', 'bbva', 'interbank', 'scotiabank', 'otro'] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(['bcp', 'bbva', 'interbank', 'scotiabank', 'otro']),
    __metadata("design:type", String)
], CreatePropietarioDto.prototype, "banco", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: ['efectivo', 'transferencia', 'yape', 'plin', 'otro'] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(['efectivo', 'transferencia', 'yape', 'plin', 'otro']),
    __metadata("design:type", String)
], CreatePropietarioDto.prototype, "tipoPago", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: ['activo', 'inactivo'] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(['activo', 'inactivo']),
    __metadata("design:type", String)
], CreatePropietarioDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePropietarioDto.prototype, "observacion", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Departamento a vincular al crear el propietario' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePropietarioDto.prototype, "idDepartamento", void 0);
class UpdatePropietarioDto extends (0, swagger_1.PartialType)(CreatePropietarioDto) {
}
exports.UpdatePropietarioDto = UpdatePropietarioDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: ['activo', 'inactivo'] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(['activo', 'inactivo']),
    __metadata("design:type", String)
], UpdatePropietarioDto.prototype, "status", void 0);
//# sourceMappingURL=propietarios.dto.js.map