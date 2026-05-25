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
exports.CleaningRecord = exports.CleaningArea = exports.CleaningProvider = void 0;
const typeorm_1 = require("typeorm");
let CleaningProvider = class CleaningProvider {
};
exports.CleaningProvider = CleaningProvider;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], CleaningProvider.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'id_edificio' }),
    __metadata("design:type", String)
], CleaningProvider.prototype, "idEdificio", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 150 }),
    __metadata("design:type", String)
], CleaningProvider.prototype, "nombre", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, length: 20 }),
    __metadata("design:type", String)
], CleaningProvider.prototype, "telefono", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['bcp', 'bbva', 'interbank', 'scotiabank', 'otro'],
        nullable: true,
    }),
    __metadata("design:type", String)
], CleaningProvider.prototype, "banco", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'tipo_cuenta',
        type: 'enum',
        enum: ['ahorros', 'corriente', 'yape', 'plin', 'efectivo'],
        default: 'ahorros',
    }),
    __metadata("design:type", String)
], CleaningProvider.prototype, "tipoCuenta", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'nro_cuenta', nullable: true, length: 30 }),
    __metadata("design:type", String)
], CleaningProvider.prototype, "nroCuenta", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'costo_por_dia', type: 'numeric', precision: 10, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], CleaningProvider.prototype, "costoPorDia", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], CleaningProvider.prototype, "activo", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], CleaningProvider.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], CleaningProvider.prototype, "updatedAt", void 0);
exports.CleaningProvider = CleaningProvider = __decorate([
    (0, typeorm_1.Entity)('proveedores_limpieza')
], CleaningProvider);
let CleaningArea = class CleaningArea {
};
exports.CleaningArea = CleaningArea;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], CleaningArea.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'id_edificio' }),
    __metadata("design:type", String)
], CleaningArea.prototype, "idEdificio", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 100 }),
    __metadata("design:type", String)
], CleaningArea.prototype, "nombre", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, type: 'text' }),
    __metadata("design:type", String)
], CleaningArea.prototype, "descripcion", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'costo_extra', type: 'numeric', precision: 10, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], CleaningArea.prototype, "costoExtra", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], CleaningArea.prototype, "activo", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'smallint', default: 1 }),
    __metadata("design:type", Number)
], CleaningArea.prototype, "orden", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], CleaningArea.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], CleaningArea.prototype, "updatedAt", void 0);
exports.CleaningArea = CleaningArea = __decorate([
    (0, typeorm_1.Entity)('ambientes_limpieza')
], CleaningArea);
let CleaningRecord = class CleaningRecord {
};
exports.CleaningRecord = CleaningRecord;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], CleaningRecord.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'id_edificio' }),
    __metadata("design:type", String)
], CleaningRecord.prototype, "idEdificio", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'id_proveedor' }),
    __metadata("design:type", String)
], CleaningRecord.prototype, "idProveedor", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => CleaningProvider),
    (0, typeorm_1.JoinColumn)({ name: 'id_proveedor' }),
    __metadata("design:type", CleaningProvider)
], CleaningRecord.prototype, "proveedor", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'periodo_mes', type: 'smallint' }),
    __metadata("design:type", Number)
], CleaningRecord.prototype, "periodoMes", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'periodo_anio', type: 'smallint' }),
    __metadata("design:type", Number)
], CleaningRecord.prototype, "periodoAnio", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'dias_trabajados', type: 'smallint', default: 0 }),
    __metadata("design:type", Number)
], CleaningRecord.prototype, "diasTrabajados", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'ambientes_ids', type: 'uuid', array: true, default: [] }),
    __metadata("design:type", Array)
], CleaningRecord.prototype, "ambientesIds", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'detalle_dias', type: 'jsonb', default: [] }),
    __metadata("design:type", Array)
], CleaningRecord.prototype, "detalleDias", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'costo_base', type: 'numeric', precision: 10, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], CleaningRecord.prototype, "costoBase", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'costo_ambientes', type: 'numeric', precision: 10, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], CleaningRecord.prototype, "costoAmbientes", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'monto_total', type: 'numeric', precision: 10, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], CleaningRecord.prototype, "montoTotal", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'pago_proveedor_status', default: 'pendiente' }),
    __metadata("design:type", String)
], CleaningRecord.prototype, "pagoProveedorStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'pago_proveedor_fecha', type: 'date', nullable: true }),
    __metadata("design:type", String)
], CleaningRecord.prototype, "pagoProveedorFecha", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'pago_proveedor_ref', nullable: true, length: 100 }),
    __metadata("design:type", String)
], CleaningRecord.prototype, "pagoProveedorRef", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'mensaje_enviado', default: false }),
    __metadata("design:type", Boolean)
], CleaningRecord.prototype, "mensajeEnviado", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'fecha_mensaje_enviado', nullable: true }),
    __metadata("design:type", Date)
], CleaningRecord.prototype, "fechaMensajeEnviado", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'mensaje_enviado_por', nullable: true }),
    __metadata("design:type", String)
], CleaningRecord.prototype, "mensajeEnviadoPor", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, type: 'text' }),
    __metadata("design:type", String)
], CleaningRecord.prototype, "observaciones", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], CleaningRecord.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], CleaningRecord.prototype, "updatedAt", void 0);
exports.CleaningRecord = CleaningRecord = __decorate([
    (0, typeorm_1.Entity)('registros_limpieza')
], CleaningRecord);
//# sourceMappingURL=cleaning.entities.js.map