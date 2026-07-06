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
exports.TemplateController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const template_service_1 = require("./template.service");
const template_dto_1 = require("./template.dto");
const template_entity_1 = require("./template.entity");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const user_entity_1 = require("../users/user.entity");
let TemplateController = class TemplateController {
    constructor(svc) {
        this.svc = svc;
    }
    create(dto, req) {
        return this.svc.create(dto, req.user.id);
    }
    findAll(buildingId, tipo) {
        return this.svc.findAll(buildingId, tipo);
    }
    getVariables(tipo) {
        return this.svc.getVariables(tipo);
    }
    findOne(id) { return this.svc.findOne(id); }
    preview(id) { return this.svc.preview(id); }
    update(id, dto) {
        return this.svc.update(id, dto);
    }
    deactivate(id) { return this.svc.deactivate(id); }
    renderOne(dto) {
        return this.svc.renderForOne(dto);
    }
    renderAll(dto) {
        return this.svc.renderForAll(dto);
    }
};
exports.TemplateController = TemplateController;
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)(user_entity_1.UserRole.ADMINISTRADOR),
    (0, swagger_1.ApiOperation)({
        summary: 'Crear plantilla de mensaje personalizada',
        description: `
Crea una plantilla con variables entre dobles llaves que se reemplazan automáticamente.

**Ejemplo de cuerpo:**
\`\`\`
Hola {{propietario}} (Depto {{depto}}), su cuota de {{periodo}} es S/. {{monto_total}}.
Consumo de agua: {{m3}} m³ a S/. {{precio_m3}} por m³.
Vence el {{fecha_vencimiento}}.
\`\`\`

Si \`esDefault: true\`, esta plantilla se usará automáticamente para el tipo indicado.
    `,
    }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [template_dto_1.CreateTemplateDto, Object]),
    __metadata("design:returntype", void 0)
], TemplateController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Listar plantillas del edificio' }),
    (0, swagger_1.ApiQuery)({ name: 'buildingId', required: true }),
    (0, swagger_1.ApiQuery)({ name: 'tipo', required: false, enum: template_entity_1.TemplateTipo }),
    __param(0, (0, common_1.Query)('buildingId')),
    __param(1, (0, common_1.Query)('tipo')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], TemplateController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('variables'),
    (0, swagger_1.ApiOperation)({
        summary: '📋 Ver todas las variables disponibles por tipo de plantilla',
        description: 'Devuelve la lista de variables que se pueden usar en cada tipo de plantilla.',
    }),
    (0, swagger_1.ApiQuery)({ name: 'tipo', required: false, enum: template_entity_1.TemplateTipo }),
    __param(0, (0, common_1.Query)('tipo')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], TemplateController.prototype, "getVariables", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Ver plantilla' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], TemplateController.prototype, "findOne", null);
__decorate([
    (0, common_1.Get)(':id/preview'),
    (0, swagger_1.ApiOperation)({
        summary: '👁️ Previsualizar plantilla con datos de ejemplo',
        description: 'Renderiza la plantilla con valores ficticios para que el supervisor vea cómo quedará el mensaje antes de enviarlo.',
    }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], TemplateController.prototype, "preview", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, roles_decorator_1.Roles)(user_entity_1.UserRole.ADMINISTRADOR),
    (0, swagger_1.ApiOperation)({ summary: 'Actualizar plantilla' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, template_dto_1.UpdateTemplateDto]),
    __metadata("design:returntype", void 0)
], TemplateController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, roles_decorator_1.Roles)(user_entity_1.UserRole.ADMINISTRADOR),
    (0, swagger_1.ApiOperation)({ summary: 'Desactivar plantilla' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], TemplateController.prototype, "deactivate", null);
__decorate([
    (0, common_1.Post)('render/one'),
    (0, roles_decorator_1.Roles)(user_entity_1.UserRole.ADMINISTRADOR),
    (0, swagger_1.ApiOperation)({
        summary: '📱 Renderizar mensaje para un destinatario',
        description: `
Aplica la plantilla con datos reales de un departamento/cuota específica.

Devuelve el **mensaje listo para copiar y enviar**, junto con el teléfono del propietario.

**Según el tipo de plantilla, enviar:**
- \`cuota_servicios\` / \`recordatorio_pago\`: enviar \`feeId\`
- \`limpieza\`: enviar \`cleaningRecordId\` + \`departamentoId\`
- \`bienvenida\` / \`aviso_general\`: enviar \`departamentoId\`

Para variables personalizadas adicionales usar \`variablesExtra\`:
\`{"mensaje_libre": "Habrá corte de agua el lunes."}\`
    `,
    }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [template_dto_1.RenderTemplateDto]),
    __metadata("design:returntype", void 0)
], TemplateController.prototype, "renderOne", null);
__decorate([
    (0, common_1.Post)('render/all'),
    (0, roles_decorator_1.Roles)(user_entity_1.UserRole.ADMINISTRADOR),
    (0, swagger_1.ApiOperation)({
        summary: '📱 Renderizar mensaje para TODOS los deptos del edificio',
        description: `
Genera el mensaje personalizado para cada departamento activo en una sola llamada.

Devuelve un array con: depto, propietario, teléfono y mensaje listo para enviar.

Ideal para el flujo mensual donde el supervisor envía a todos los vecinos de corrido.
    `,
    }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [template_dto_1.RenderAllDto]),
    __metadata("design:returntype", void 0)
], TemplateController.prototype, "renderAll", null);
exports.TemplateController = TemplateController = __decorate([
    (0, swagger_1.ApiTags)('Templates'),
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, common_1.Controller)('templates'),
    __metadata("design:paramtypes", [template_service_1.TemplateService])
], TemplateController);
//# sourceMappingURL=template.controller.js.map