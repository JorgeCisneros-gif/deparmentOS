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
exports.Building = void 0;
const typeorm_1 = require("typeorm");
const department_entity_1 = require("../departments/department.entity");
const service_entity_1 = require("../services/service.entity");
const pais_entity_1 = require("../paises/pais.entity");
let Building = class Building {
};
exports.Building = Building;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Building.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 150 }),
    __metadata("design:type", String)
], Building.prototype, "nombre", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], Building.prototype, "direccion", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'nro_depas', default: 0 }),
    __metadata("design:type", Number)
], Building.prototype, "nroDepas", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'cuenta_bbva', nullable: true, length: 30 }),
    __metadata("design:type", String)
], Building.prototype, "cuentaBbva", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'cuenta_bcp', nullable: true, length: 30 }),
    __metadata("design:type", String)
], Building.prototype, "cuentaBcp", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'servicios_activos',
        type: 'jsonb',
        default: { agua: true, luz: true, internet: true },
    }),
    __metadata("design:type", Object)
], Building.prototype, "serviciosActivos", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 60, default: 'America/Lima' }),
    __metadata("design:type", String)
], Building.prototype, "timezone", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'pais_id', nullable: true }),
    __metadata("design:type", Number)
], Building.prototype, "paisId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => pais_entity_1.Pais, { nullable: true, eager: true }),
    (0, typeorm_1.JoinColumn)({ name: 'pais_id' }),
    __metadata("design:type", pais_entity_1.Pais)
], Building.prototype, "pais", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 10, default: 'PEN' }),
    __metadata("design:type", String)
], Building.prototype, "moneda", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 10, default: 'es-PE' }),
    __metadata("design:type", String)
], Building.prototype, "locale", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => department_entity_1.Department, (d) => d.edificio),
    __metadata("design:type", Array)
], Building.prototype, "departamentos", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => service_entity_1.Service, (s) => s.edificio),
    __metadata("design:type", Array)
], Building.prototype, "servicios", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], Building.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], Building.prototype, "updatedAt", void 0);
exports.Building = Building = __decorate([
    (0, typeorm_1.Entity)('edificios')
], Building);
//# sourceMappingURL=building.entity.js.map