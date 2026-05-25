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
exports.GastoExtra = void 0;
const typeorm_1 = require("typeorm");
const building_entity_1 = require("../buildings/building.entity");
const pago_gasto_entity_1 = require("./pago-gasto.entity");
let GastoExtra = class GastoExtra {
};
exports.GastoExtra = GastoExtra;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], GastoExtra.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'id_edificio' }),
    __metadata("design:type", String)
], GastoExtra.prototype, "idEdificio", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => building_entity_1.Building),
    (0, typeorm_1.JoinColumn)({ name: 'id_edificio' }),
    __metadata("design:type", building_entity_1.Building)
], GastoExtra.prototype, "edificio", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 150 }),
    __metadata("design:type", String)
], GastoExtra.prototype, "nombre", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], GastoExtra.prototype, "descripcion", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'fecha_inicio', type: 'date' }),
    __metadata("design:type", String)
], GastoExtra.prototype, "fechaInicio", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'fecha_fin', type: 'date', nullable: true }),
    __metadata("design:type", String)
], GastoExtra.prototype, "fechaFin", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'lista_departamentos', type: 'jsonb', nullable: true }),
    __metadata("design:type", Array)
], GastoExtra.prototype, "listaDepartamentos", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['activo', 'cerrado', 'anulado'],
        default: 'activo',
    }),
    __metadata("design:type", String)
], GastoExtra.prototype, "estado", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'monto_gasto', type: 'numeric', precision: 10, scale: 2 }),
    __metadata("design:type", Number)
], GastoExtra.prototype, "montoGasto", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'monto_por_depto', type: 'numeric', precision: 10, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], GastoExtra.prototype, "montoPorDepto", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => pago_gasto_entity_1.PagoGasto, (p) => p.gastoExtra),
    __metadata("design:type", Array)
], GastoExtra.prototype, "pagos", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], GastoExtra.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], GastoExtra.prototype, "updatedAt", void 0);
exports.GastoExtra = GastoExtra = __decorate([
    (0, typeorm_1.Entity)('gastos_extras')
], GastoExtra);
//# sourceMappingURL=gasto-extra.entity.js.map