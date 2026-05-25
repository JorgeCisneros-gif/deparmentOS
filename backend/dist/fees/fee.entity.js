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
exports.Fee = void 0;
const typeorm_1 = require("typeorm");
const department_entity_1 = require("../departments/department.entity");
let Fee = class Fee {
};
exports.Fee = Fee;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Fee.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'id_departamento' }),
    __metadata("design:type", String)
], Fee.prototype, "idDepartamento", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => department_entity_1.Department),
    (0, typeorm_1.JoinColumn)({ name: 'id_departamento' }),
    __metadata("design:type", department_entity_1.Department)
], Fee.prototype, "departamento", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'periodo_mes', type: 'smallint' }),
    __metadata("design:type", Number)
], Fee.prototype, "periodoMes", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'periodo_anio', type: 'smallint' }),
    __metadata("design:type", Number)
], Fee.prototype, "periodoAnio", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'montos_servicios', type: 'jsonb', default: {} }),
    __metadata("design:type", Object)
], Fee.prototype, "montosServicios", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'monto_total', type: 'numeric', precision: 10, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], Fee.prototype, "montoTotal", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'ajuste_mes_anterior', type: 'numeric', precision: 10, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], Fee.prototype, "ajusteMesAnterior", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'fecha_vencimiento', type: 'date', nullable: true }),
    __metadata("design:type", String)
], Fee.prototype, "fechaVencimiento", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'status_pago', length: 30, default: 'pendiente' }),
    __metadata("design:type", String)
], Fee.prototype, "statusPago", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'mensaje_enviado', default: false }),
    __metadata("design:type", Boolean)
], Fee.prototype, "mensajeEnviado", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'fecha_mensaje_enviado', nullable: true }),
    __metadata("design:type", Date)
], Fee.prototype, "fechaMensajeEnviado", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'mensaje_enviado_por', nullable: true }),
    __metadata("design:type", String)
], Fee.prototype, "mensajeEnviadoPor", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'detalle_json', type: 'jsonb', default: {} }),
    __metadata("design:type", Object)
], Fee.prototype, "detalleJson", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], Fee.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], Fee.prototype, "updatedAt", void 0);
exports.Fee = Fee = __decorate([
    (0, typeorm_1.Entity)('cuotas_departamento')
], Fee);
//# sourceMappingURL=fee.entity.js.map