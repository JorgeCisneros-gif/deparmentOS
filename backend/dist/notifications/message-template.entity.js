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
exports.MessageTemplate = exports.DEFAULT_TEMPLATE = void 0;
const typeorm_1 = require("typeorm");
const building_entity_1 = require("../buildings/building.entity");
exports.DEFAULT_TEMPLATE = `🏢 *{edificio}* — Depto *{depto}*

Buenas, le comunicamos su cuota de *{periodo}*:

{lineas_desglose}

*TOTAL: S/. {total}*
📅 Vence: {vencimiento}

{cuentas}Por favor envíe el comprobante de pago al confirmar.
¡Gracias! 🙏`;
let MessageTemplate = class MessageTemplate {
};
exports.MessageTemplate = MessageTemplate;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], MessageTemplate.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'id_edificio' }),
    __metadata("design:type", String)
], MessageTemplate.prototype, "idEdificio", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => building_entity_1.Building),
    (0, typeorm_1.JoinColumn)({ name: 'id_edificio' }),
    __metadata("design:type", building_entity_1.Building)
], MessageTemplate.prototype, "edificio", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 50, nullable: true }),
    __metadata("design:type", String)
], MessageTemplate.prototype, "tipo", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 100, default: 'Plantilla principal' }),
    __metadata("design:type", String)
], MessageTemplate.prototype, "nombre", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], MessageTemplate.prototype, "descripcion", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'cuerpo', type: 'text' }),
    __metadata("design:type", String)
], MessageTemplate.prototype, "templateText", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'custom_variables', type: 'jsonb', default: [] }),
    __metadata("design:type", Array)
], MessageTemplate.prototype, "customVariables", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], MessageTemplate.prototype, "activo", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'es_default', default: false }),
    __metadata("design:type", Boolean)
], MessageTemplate.prototype, "esDefault", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'created_by', nullable: true }),
    __metadata("design:type", String)
], MessageTemplate.prototype, "createdBy", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], MessageTemplate.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], MessageTemplate.prototype, "updatedAt", void 0);
exports.MessageTemplate = MessageTemplate = __decorate([
    (0, typeorm_1.Entity)('message_templates')
], MessageTemplate);
//# sourceMappingURL=message-template.entity.js.map