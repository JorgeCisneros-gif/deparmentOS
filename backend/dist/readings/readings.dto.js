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
exports.ConfirmOcrReadingDto = exports.UpdateReadingDto = exports.CreateReadingDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class CreateReadingDto {
}
exports.CreateReadingDto = CreateReadingDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'UUID del recibo de agua al que pertenece esta medición' }),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateReadingDto.prototype, "idRecibo", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'UUID del departamento' }),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateReadingDto.prototype, "idDepartamento", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 924.94, description: 'Lectura actual del medidor del depto (m3 acumulado)' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateReadingDto.prototype, "lecturaActual", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 908.56, description: 'Lectura anterior del medidor del depto' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateReadingDto.prototype, "lecturaAnterior", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 59.12, description: 'Monto calculado: m3_consumido × precio_m3 del recibo' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateReadingDto.prototype, "montoCalculado", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ default: false, description: 'True si corresponde a zona común (lobby, etc.)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateReadingDto.prototype, "esZonaComun", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateReadingDto.prototype, "observacion", void 0);
class UpdateReadingDto extends (0, swagger_1.PartialType)(CreateReadingDto) {
}
exports.UpdateReadingDto = UpdateReadingDto;
class ConfirmOcrReadingDto {
}
exports.ConfirmOcrReadingDto = ConfirmOcrReadingDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'UUID del recibo' }),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], ConfirmOcrReadingDto.prototype, "idRecibo", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'UUID del departamento' }),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], ConfirmOcrReadingDto.prototype, "idDepartamento", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1452.0, description: 'Lectura final confirmada (puede editar el valor OCR)' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], ConfirmOcrReadingDto.prototype, "lecturaFinal", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1435.5, description: 'Lectura anterior del medidor' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], ConfirmOcrReadingDto.prototype, "lecturaAnterior", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 59.12 }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], ConfirmOcrReadingDto.prototype, "montoCalculado", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ConfirmOcrReadingDto.prototype, "observacion", void 0);
//# sourceMappingURL=readings.dto.js.map