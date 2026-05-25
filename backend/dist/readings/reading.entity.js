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
exports.Reading = void 0;
const typeorm_1 = require("typeorm");
const receipt_entity_1 = require("../receipts/receipt.entity");
const department_entity_1 = require("../departments/department.entity");
let Reading = class Reading {
};
exports.Reading = Reading;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Reading.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'id_recibo' }),
    __metadata("design:type", String)
], Reading.prototype, "idRecibo", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => receipt_entity_1.Receipt),
    (0, typeorm_1.JoinColumn)({ name: 'id_recibo' }),
    __metadata("design:type", receipt_entity_1.Receipt)
], Reading.prototype, "recibo", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'id_departamento' }),
    __metadata("design:type", String)
], Reading.prototype, "idDepartamento", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => department_entity_1.Department),
    (0, typeorm_1.JoinColumn)({ name: 'id_departamento' }),
    __metadata("design:type", department_entity_1.Department)
], Reading.prototype, "departamento", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'lectura_actual', type: 'numeric', precision: 10, scale: 3 }),
    __metadata("design:type", Number)
], Reading.prototype, "lecturaActual", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'lectura_anterior', type: 'numeric', precision: 10, scale: 3 }),
    __metadata("design:type", Number)
], Reading.prototype, "lecturaAnterior", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'm3_consumido', type: 'numeric', precision: 10, scale: 3, nullable: true, insert: false, update: false }),
    __metadata("design:type", Number)
], Reading.prototype, "m3Consumido", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'monto_calculado', type: 'numeric', precision: 10, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], Reading.prototype, "montoCalculado", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'es_zona_comun', default: false }),
    __metadata("design:type", Boolean)
], Reading.prototype, "esZonaComun", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, type: 'text' }),
    __metadata("design:type", String)
], Reading.prototype, "observacion", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'id_meter_image', nullable: true }),
    __metadata("design:type", String)
], Reading.prototype, "idMeterImage", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], Reading.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], Reading.prototype, "updatedAt", void 0);
exports.Reading = Reading = __decorate([
    (0, typeorm_1.Entity)('mediciones_departamento')
], Reading);
//# sourceMappingURL=reading.entity.js.map