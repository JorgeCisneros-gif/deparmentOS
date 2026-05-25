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
exports.Payment = void 0;
const typeorm_1 = require("typeorm");
const fee_entity_1 = require("../fees/fee.entity");
let Payment = class Payment {
};
exports.Payment = Payment;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Payment.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'id_cuota' }),
    __metadata("design:type", String)
], Payment.prototype, "idCuota", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => fee_entity_1.Fee),
    (0, typeorm_1.JoinColumn)({ name: 'id_cuota' }),
    __metadata("design:type", fee_entity_1.Fee)
], Payment.prototype, "cuota", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'id_propietario', nullable: true }),
    __metadata("design:type", String)
], Payment.prototype, "idPropietario", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'fecha_pago', type: 'date' }),
    __metadata("design:type", String)
], Payment.prototype, "fechaPago", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'monto_cancelado', type: 'numeric', precision: 10, scale: 2 }),
    __metadata("design:type", Number)
], Payment.prototype, "montoCancelado", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'tipo_pago',
        type: 'enum',
        enum: ['efectivo', 'transferencia', 'yape', 'plin', 'otro'],
        default: 'transferencia',
    }),
    __metadata("design:type", String)
], Payment.prototype, "tipoPago", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['bcp', 'bbva', 'interbank', 'scotiabank', 'otro'],
        nullable: true,
    }),
    __metadata("design:type", String)
], Payment.prototype, "banco", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, length: 100 }),
    __metadata("design:type", String)
], Payment.prototype, "referencia", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'comprobante_url', nullable: true, type: 'text' }),
    __metadata("design:type", String)
], Payment.prototype, "comprobanteUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, type: 'text' }),
    __metadata("design:type", String)
], Payment.prototype, "observacion", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], Payment.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], Payment.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'estado_pago', length: 30, default: 'aprobado' }),
    __metadata("design:type", String)
], Payment.prototype, "estadoPago", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'aprobado_por', nullable: true }),
    __metadata("design:type", String)
], Payment.prototype, "aprobadoPor", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'fecha_aprobacion', nullable: true }),
    __metadata("design:type", Date)
], Payment.prototype, "fechaAprobacion", void 0);
exports.Payment = Payment = __decorate([
    (0, typeorm_1.Entity)('pagos')
], Payment);
//# sourceMappingURL=payment.entity.js.map