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
exports.Department = void 0;
const typeorm_1 = require("typeorm");
const building_entity_1 = require("../buildings/building.entity");
let Department = class Department {
};
exports.Department = Department;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Department.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'id_edificio' }),
    __metadata("design:type", String)
], Department.prototype, "idEdificio", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => building_entity_1.Building, (b) => b.departamentos),
    (0, typeorm_1.JoinColumn)({ name: 'id_edificio' }),
    __metadata("design:type", building_entity_1.Building)
], Department.prototype, "edificio", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'id_propietario', nullable: true }),
    __metadata("design:type", String)
], Department.prototype, "idPropietario", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'nr_departamento', length: 10 }),
    __metadata("design:type", String)
], Department.prototype, "nrDepartamento", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'smallint' }),
    __metadata("design:type", Number)
], Department.prototype, "piso", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['activo', 'inactivo'],
        default: 'activo',
    }),
    __metadata("design:type", String)
], Department.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], Department.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], Department.prototype, "updatedAt", void 0);
exports.Department = Department = __decorate([
    (0, typeorm_1.Entity)('departamentos')
], Department);
//# sourceMappingURL=department.entity.js.map