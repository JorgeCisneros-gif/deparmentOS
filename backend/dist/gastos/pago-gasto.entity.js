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
exports.PagoGasto = void 0;
const typeorm_1 = require("typeorm");
const gasto_extra_entity_1 = require("./gasto-extra.entity");
const department_entity_1 = require("../departments/department.entity");
let PagoGasto = class PagoGasto {
};
exports.PagoGasto = PagoGasto;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], PagoGasto.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'id_gasto_extra' }),
    __metadata("design:type", String)
], PagoGasto.prototype, "idGastoExtra", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => gasto_extra_entity_1.GastoExtra, (g) => g.pagos),
    (0, typeorm_1.JoinColumn)({ name: 'id_gasto_extra' }),
    __metadata("design:type", gasto_extra_entity_1.GastoExtra)
], PagoGasto.prototype, "gastoExtra", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'id_departamento' }),
    __metadata("design:type", String)
], PagoGasto.prototype, "idDepartamento", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => department_entity_1.Department),
    (0, typeorm_1.JoinColumn)({ name: 'id_departamento' }),
    __metadata("design:type", department_entity_1.Department)
], PagoGasto.prototype, "departamento", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'fecha_pago', type: 'date' }),
    __metadata("design:type", String)
], PagoGasto.prototype, "fechaPago", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'numeric', precision: 10, scale: 2 }),
    __metadata("design:type", Number)
], PagoGasto.prototype, "monto", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'tipo_pago',
        type: 'enum',
        enum: ['efectivo', 'transferencia', 'yape', 'plin', 'otro'],
        default: 'transferencia',
    }),
    __metadata("design:type", String)
], PagoGasto.prototype, "tipoPago", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['bcp', 'bbva', 'interbank', 'scotiabank', 'otro'],
        nullable: true,
    }),
    __metadata("design:type", String)
], PagoGasto.prototype, "banco", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, length: 100 }),
    __metadata("design:type", String)
], PagoGasto.prototype, "referencia", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'comprobante_url', nullable: true, type: 'text' }),
    __metadata("design:type", String)
], PagoGasto.prototype, "comprobanteUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, type: 'text' }),
    __metadata("design:type", String)
], PagoGasto.prototype, "observacion", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], PagoGasto.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], PagoGasto.prototype, "updatedAt", void 0);
exports.PagoGasto = PagoGasto = __decorate([
    (0, typeorm_1.Entity)('pagos_gastos_extras')
], PagoGasto);
//# sourceMappingURL=pago-gasto.entity.js.map