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
exports.Receipt = void 0;
const typeorm_1 = require("typeorm");
const service_entity_1 = require("../services/service.entity");
let Receipt = class Receipt {
};
exports.Receipt = Receipt;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Receipt.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'id_servicio' }),
    __metadata("design:type", String)
], Receipt.prototype, "idServicio", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => service_entity_1.Service),
    (0, typeorm_1.JoinColumn)({ name: 'id_servicio' }),
    __metadata("design:type", service_entity_1.Service)
], Receipt.prototype, "servicio", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'nro_recibo', nullable: true, length: 60 }),
    __metadata("design:type", String)
], Receipt.prototype, "nroRecibo", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'periodo_mes', type: 'smallint' }),
    __metadata("design:type", Number)
], Receipt.prototype, "periodoMes", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'periodo_anio', type: 'smallint' }),
    __metadata("design:type", Number)
], Receipt.prototype, "periodoAnio", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'fecha_emision', type: 'date', nullable: true }),
    __metadata("design:type", String)
], Receipt.prototype, "fechaEmision", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'fecha_vencimiento', type: 'date', nullable: true }),
    __metadata("design:type", String)
], Receipt.prototype, "fechaVencimiento", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'monto_total_factura', type: 'numeric', precision: 10, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], Receipt.prototype, "montoTotalFactura", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'm3_lectura_actual', type: 'numeric', precision: 10, scale: 3, nullable: true }),
    __metadata("design:type", Number)
], Receipt.prototype, "m3LecturaActual", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'm3_lectura_anterior', type: 'numeric', precision: 10, scale: 3, nullable: true }),
    __metadata("design:type", Number)
], Receipt.prototype, "m3LecturaAnterior", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'm3_consumo_total', type: 'numeric', precision: 10, scale: 3, nullable: true, insert: false, update: false }),
    __metadata("design:type", Number)
], Receipt.prototype, "m3ConsumoTotal", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'precio_m3', type: 'numeric', precision: 10, scale: 6, nullable: true, insert: false, update: false }),
    __metadata("design:type", Number)
], Receipt.prototype, "precioM3", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'total_unidades_factura', type: 'numeric', precision: 12, scale: 4, nullable: true }),
    __metadata("design:type", Number)
], Receipt.prototype, "totalUnidadesFactura", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'm3_propios', type: 'numeric', precision: 12, scale: 4, nullable: true }),
    __metadata("design:type", Number)
], Receipt.prototype, "m3Propios", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'factor_ajuste', type: 'numeric', precision: 12, scale: 8, default: 1.0, nullable: true }),
    __metadata("design:type", Number)
], Receipt.prototype, "factorAjuste", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'factor_estado', length: 15, default: 'pendiente', nullable: true }),
    __metadata("design:type", String)
], Receipt.prototype, "factorEstado", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, length: 150 }),
    __metadata("design:type", String)
], Receipt.prototype, "proveedor", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, type: 'text' }),
    __metadata("design:type", String)
], Receipt.prototype, "observacion", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'detalle_json', type: 'jsonb', default: {} }),
    __metadata("design:type", Object)
], Receipt.prototype, "detalleJson", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], Receipt.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], Receipt.prototype, "updatedAt", void 0);
exports.Receipt = Receipt = __decorate([
    (0, typeorm_1.Entity)('recibos_servicio')
], Receipt);
//# sourceMappingURL=receipt.entity.js.map