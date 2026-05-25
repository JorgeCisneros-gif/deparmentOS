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
exports.RenderAllDto = exports.RenderTemplateDto = exports.UpdateTemplateDto = exports.CreateTemplateDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const template_entity_1 = require("./template.entity");
class CreateTemplateDto {
}
exports.CreateTemplateDto = CreateTemplateDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateTemplateDto.prototype, "idEdificio", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: template_entity_1.TemplateTipo, description: 'Tipo de mensaje' }),
    (0, class_validator_1.IsEnum)(template_entity_1.TemplateTipo),
    __metadata("design:type", String)
], CreateTemplateDto.prototype, "tipo", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Cuota mensual con emoji' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateTemplateDto.prototype, "nombre", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateTemplateDto.prototype, "descripcion", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: `Cuerpo del mensaje con variables entre dobles llaves.
Variables disponibles según tipo:

**cuota_servicios / recordatorio_pago:**
{{propietario}} {{depto}} {{edificio}} {{periodo}} {{mes}} {{anio}}
{{m3}} {{precio_m3}} {{monto_agua}} {{monto_luz}} {{monto_internet}}
{{monto_limpieza}} {{monto_otros}} {{ajuste}} {{monto_total}}
{{fecha_vencimiento}} {{status_pago}}

**limpieza:**
{{propietario}} {{depto}} {{edificio}} {{periodo}}
{{dias_trabajados}} {{ambientes}} {{costo_dia}}
{{monto_total_limpieza}} {{cuota_depto}} {{nro_deptos}}

**bienvenida / aviso_general:**
{{propietario}} {{depto}} {{edificio}} {{mensaje_libre}}`,
        example: 'Hola {{propietario}}, su cuota de {{periodo}} es S/. {{monto_total}}.',
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateTemplateDto.prototype, "cuerpo", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ default: false, description: 'Si TRUE reemplaza la plantilla default del mismo tipo' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateTemplateDto.prototype, "esDefault", void 0);
class UpdateTemplateDto extends (0, swagger_1.PartialType)(CreateTemplateDto) {
}
exports.UpdateTemplateDto = UpdateTemplateDto;
class RenderTemplateDto {
}
exports.RenderTemplateDto = RenderTemplateDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'UUID de la plantilla a usar' }),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], RenderTemplateDto.prototype, "templateId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'UUID de la cuota (para cuota_servicios y recordatorio_pago)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], RenderTemplateDto.prototype, "feeId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'UUID del registro de limpieza (para tipo limpieza)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], RenderTemplateDto.prototype, "cleaningRecordId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'UUID del departamento (para bienvenida o aviso_general)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], RenderTemplateDto.prototype, "departamentoId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Variables libres adicionales para reemplazar en el cuerpo. Ej: {"mensaje_libre": "Habrá corte de agua el lunes."}',
        example: { mensaje_libre: 'Habrá corte de agua el lunes 18 de marzo de 8am a 12pm.' },
    }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], RenderTemplateDto.prototype, "variablesExtra", void 0);
class RenderAllDto {
}
exports.RenderAllDto = RenderAllDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'UUID de la plantilla' }),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], RenderAllDto.prototype, "templateId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'UUID del edificio' }),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], RenderAllDto.prototype, "idEdificio", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'UUID de la cuota (si aplica al tipo)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], RenderAllDto.prototype, "feeId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'UUID del registro de limpieza (si aplica)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], RenderAllDto.prototype, "cleaningRecordId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], RenderAllDto.prototype, "variablesExtra", void 0);
//# sourceMappingURL=template.dto.js.map