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
exports.CreatePagoAutoDto = exports.CreatePaymentDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class CreatePaymentDto {
}
exports.CreatePaymentDto = CreatePaymentDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreatePaymentDto.prototype, "idCuota", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreatePaymentDto.prototype, "idPropietario", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2024-03-20' }),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreatePaymentDto.prototype, "fechaPago", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 89.50 }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0.01),
    __metadata("design:type", Number)
], CreatePaymentDto.prototype, "montoCancelado", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: ['efectivo', 'transferencia', 'yape', 'plin', 'otro'], default: 'transferencia' }),
    (0, class_validator_1.IsIn)(['efectivo', 'transferencia', 'yape', 'plin', 'otro']),
    __metadata("design:type", String)
], CreatePaymentDto.prototype, "tipoPago", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: ['bcp', 'bbva', 'interbank', 'scotiabank', 'otro'] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['bcp', 'bbva', 'interbank', 'scotiabank', 'otro']),
    __metadata("design:type", String)
], CreatePaymentDto.prototype, "banco", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'OP-20240320-001' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePaymentDto.prototype, "referencia", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePaymentDto.prototype, "observacion", void 0);
class CreatePagoAutoDto {
}
exports.CreatePagoAutoDto = CreatePagoAutoDto;
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreatePagoAutoDto.prototype, "idCuota", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreatePagoAutoDto.prototype, "montoCancelado", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePagoAutoDto.prototype, "tipoPago", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePagoAutoDto.prototype, "banco", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePagoAutoDto.prototype, "referencia", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePagoAutoDto.prototype, "observacion", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePagoAutoDto.prototype, "fechaPago", void 0);
//# sourceMappingURL=payments.dto.js.map