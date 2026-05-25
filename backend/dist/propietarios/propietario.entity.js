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
exports.Propietario = void 0;
const typeorm_1 = require("typeorm");
let Propietario = class Propietario {
};
exports.Propietario = Propietario;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Propietario.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 150 }),
    __metadata("design:type", String)
], Propietario.prototype, "nombre", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, length: 20 }),
    __metadata("design:type", String)
], Propietario.prototype, "telefono", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, length: 100 }),
    __metadata("design:type", String)
], Propietario.prototype, "correo", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['bcp', 'bbva', 'interbank', 'scotiabank', 'otro'],
        nullable: true,
    }),
    __metadata("design:type", String)
], Propietario.prototype, "banco", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'tipo_pago',
        type: 'enum',
        enum: ['efectivo', 'transferencia', 'yape', 'plin', 'otro'],
        nullable: true,
        default: 'transferencia',
    }),
    __metadata("design:type", String)
], Propietario.prototype, "tipoPago", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['activo', 'inactivo'],
        default: 'activo',
    }),
    __metadata("design:type", String)
], Propietario.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, type: 'text' }),
    __metadata("design:type", String)
], Propietario.prototype, "observacion", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], Propietario.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], Propietario.prototype, "updatedAt", void 0);
exports.Propietario = Propietario = __decorate([
    (0, typeorm_1.Entity)('propietarios')
], Propietario);
//# sourceMappingURL=propietario.entity.js.map