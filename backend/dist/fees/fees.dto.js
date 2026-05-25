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
exports.UpdateFeeStatusDto = exports.CalculateFeesDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class CalculateFeesDto {
}
exports.CalculateFeesDto = CalculateFeesDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'UUID del edificio' }),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CalculateFeesDto.prototype, "idEdificio", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 3 }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(12),
    __metadata("design:type", Number)
], CalculateFeesDto.prototype, "periodoMes", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 2024 }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(2020),
    __metadata("design:type", Number)
], CalculateFeesDto.prototype, "periodoAnio", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '2024-03-24' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CalculateFeesDto.prototype, "fechaVencimiento", void 0);
class UpdateFeeStatusDto {
}
exports.UpdateFeeStatusDto = UpdateFeeStatusDto;
__decorate([
    (0, swagger_1.ApiProperty)({ enum: ['pendiente', 'pagado', 'vencido', 'parcial'] }),
    (0, class_validator_1.IsIn)(['pendiente', 'pagado', 'vencido', 'parcial']),
    __metadata("design:type", String)
], UpdateFeeStatusDto.prototype, "status", void 0);
//# sourceMappingURL=fees.dto.js.map