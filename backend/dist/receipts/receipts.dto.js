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
exports.UpdateReceiptDto = exports.CreateReceiptDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class CreateReceiptDto {
}
exports.CreateReceiptDto = CreateReceiptDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateReceiptDto.prototype, "idServicio", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'REC-2024-001' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateReceiptDto.prototype, "nroRecibo", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 3, description: '1=Enero … 12=Diciembre' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(12),
    __metadata("design:type", Number)
], CreateReceiptDto.prototype, "periodoMes", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 2024 }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(2020),
    __metadata("design:type", Number)
], CreateReceiptDto.prototype, "periodoAnio", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '2024-03-01' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateReceiptDto.prototype, "fechaEmision", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '2024-03-24' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateReceiptDto.prototype, "fechaVencimiento", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 270.00, description: 'Monto total de la factura del proveedor' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateReceiptDto.prototype, "montoTotalFactura", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 924.94, description: 'Solo para agua: lectura actual del medidor general' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateReceiptDto.prototype, "m3LecturaActual", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 908.56, description: 'Solo para agua: lectura anterior del medidor general' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateReceiptDto.prototype, "m3LecturaAnterior", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Empresa Limpieza SAC', description: 'Proveedor del servicio' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateReceiptDto.prototype, "proveedor", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateReceiptDto.prototype, "observacion", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], CreateReceiptDto.prototype, "detalleJson", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Total m³/kWh de la factura del proveedor (para por_consumo_ajustado)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateReceiptDto.prototype, "totalUnidadesFactura", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'm³/kWh propios (estimado manual o calculado desde mediciones)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateReceiptDto.prototype, "m3Propios", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Factor de ajuste editable. Si se omite, se calcula como totalUnidadesFactura / m3Propios' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateReceiptDto.prototype, "factorAjuste", void 0);
class UpdateReceiptDto extends (0, swagger_1.PartialType)(CreateReceiptDto) {
}
exports.UpdateReceiptDto = UpdateReceiptDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: ['vigente', 'vencido', 'pagado', 'anulado'] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['vigente', 'vencido', 'pagado', 'anulado']),
    __metadata("design:type", String)
], UpdateReceiptDto.prototype, "status", void 0);
//# sourceMappingURL=receipts.dto.js.map