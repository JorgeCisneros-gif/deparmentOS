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
exports.Alicuota = void 0;
const typeorm_1 = require("typeorm");
const department_entity_1 = require("../departments/department.entity");
const service_entity_1 = require("../services/service.entity");
let Alicuota = class Alicuota {
};
exports.Alicuota = Alicuota;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Alicuota.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'id_departamento' }),
    __metadata("design:type", String)
], Alicuota.prototype, "idDepartamento", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => department_entity_1.Department),
    (0, typeorm_1.JoinColumn)({ name: 'id_departamento' }),
    __metadata("design:type", department_entity_1.Department)
], Alicuota.prototype, "departamento", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'id_servicio' }),
    __metadata("design:type", String)
], Alicuota.prototype, "idServicio", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => service_entity_1.Service),
    (0, typeorm_1.JoinColumn)({ name: 'id_servicio' }),
    __metadata("design:type", service_entity_1.Service)
], Alicuota.prototype, "servicio", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 7, scale: 4 }),
    __metadata("design:type", Number)
], Alicuota.prototype, "porcentaje", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'periodo_mes', type: 'smallint' }),
    __metadata("design:type", Number)
], Alicuota.prototype, "periodoMes", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'periodo_anio', type: 'smallint' }),
    __metadata("design:type", Number)
], Alicuota.prototype, "periodoAnio", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], Alicuota.prototype, "createdAt", void 0);
exports.Alicuota = Alicuota = __decorate([
    (0, typeorm_1.Entity)('alicuotas_departamento'),
    (0, typeorm_1.Unique)(['idDepartamento', 'idServicio', 'periodoMes', 'periodoAnio'])
], Alicuota);
//# sourceMappingURL=alicuota.entity.js.map