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
exports.ConfirmProviderPaymentDto = exports.UpdateCleaningRecordDto = exports.CreateCleaningRecordDto = exports.DiaLimpiezaDto = exports.UpdateAreaDto = exports.CreateAreaDto = exports.UpdateProviderDto = exports.CreateProviderDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
class CreateProviderDto {
}
exports.CreateProviderDto = CreateProviderDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateProviderDto.prototype, "idEdificio", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'María García' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateProviderDto.prototype, "nombre", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '51999888777' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateProviderDto.prototype, "telefono", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: ['bcp', 'bbva', 'interbank', 'scotiabank', 'otro'] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['bcp', 'bbva', 'interbank', 'scotiabank', 'otro']),
    __metadata("design:type", String)
], CreateProviderDto.prototype, "banco", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: ['ahorros', 'corriente', 'yape', 'plin', 'efectivo'], default: 'ahorros' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['ahorros', 'corriente', 'yape', 'plin', 'efectivo']),
    __metadata("design:type", String)
], CreateProviderDto.prototype, "tipoCuenta", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '191-12345678-0-01' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateProviderDto.prototype, "nroCuenta", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 40.00, description: 'Costo base por día de trabajo' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateProviderDto.prototype, "costoPorDia", void 0);
class UpdateProviderDto extends (0, swagger_1.PartialType)(CreateProviderDto) {
}
exports.UpdateProviderDto = UpdateProviderDto;
class CreateAreaDto {
}
exports.CreateAreaDto = CreateAreaDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateAreaDto.prototype, "idEdificio", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Cochera' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateAreaDto.prototype, "nombre", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Limpieza de la cochera y acceso vehicular' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateAreaDto.prototype, "descripcion", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 0, description: 'Costo extra adicional al costo base por día' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateAreaDto.prototype, "costoExtra", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 1 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateAreaDto.prototype, "orden", void 0);
class UpdateAreaDto extends (0, swagger_1.PartialType)(CreateAreaDto) {
}
exports.UpdateAreaDto = UpdateAreaDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateAreaDto.prototype, "activo", void 0);
class DiaLimpiezaDto {
}
exports.DiaLimpiezaDto = DiaLimpiezaDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2024-03-05' }),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], DiaLimpiezaDto.prototype, "fecha", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: [String], description: 'Nombres de ambientes limpiados ese día' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], DiaLimpiezaDto.prototype, "ambientes", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], DiaLimpiezaDto.prototype, "nota", void 0);
class CreateCleaningRecordDto {
}
exports.CreateCleaningRecordDto = CreateCleaningRecordDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateCleaningRecordDto.prototype, "idEdificio", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateCleaningRecordDto.prototype, "idProveedor", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 3 }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(12),
    __metadata("design:type", Number)
], CreateCleaningRecordDto.prototype, "periodoMes", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 2024 }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(2020),
    __metadata("design:type", Number)
], CreateCleaningRecordDto.prototype, "periodoAnio", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 9, description: 'Total de días trabajados en el mes' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateCleaningRecordDto.prototype, "diasTrabajados", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        type: [String],
        description: 'UUIDs de los ambientes limpiados este mes',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsUUID)('4', { each: true }),
    __metadata("design:type", Array)
], CreateCleaningRecordDto.prototype, "ambientesIds", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        type: [DiaLimpiezaDto],
        description: 'Detalle día a día (opcional, para auditoría)',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => DiaLimpiezaDto),
    __metadata("design:type", Array)
], CreateCleaningRecordDto.prototype, "detalleDias", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCleaningRecordDto.prototype, "observaciones", void 0);
class UpdateCleaningRecordDto extends (0, swagger_1.PartialType)(CreateCleaningRecordDto) {
}
exports.UpdateCleaningRecordDto = UpdateCleaningRecordDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: ['pendiente', 'pagado'] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['pendiente', 'pagado']),
    __metadata("design:type", String)
], UpdateCleaningRecordDto.prototype, "pagoProveedorStatus", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], UpdateCleaningRecordDto.prototype, "pagoProveedorFecha", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateCleaningRecordDto.prototype, "pagoProveedorRef", void 0);
class ConfirmProviderPaymentDto {
}
exports.ConfirmProviderPaymentDto = ConfirmProviderPaymentDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2024-03-28' }),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], ConfirmProviderPaymentDto.prototype, "fecha", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'OP-20240328-001' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ConfirmProviderPaymentDto.prototype, "referencia", void 0);
//# sourceMappingURL=cleaning.dto.js.map