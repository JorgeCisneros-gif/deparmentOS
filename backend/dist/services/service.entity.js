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
exports.Service = exports.ModoCalculo = exports.TipoServicio = void 0;
const typeorm_1 = require("typeorm");
const building_entity_1 = require("../buildings/building.entity");
var TipoServicio;
(function (TipoServicio) {
    TipoServicio["AGUA"] = "agua";
    TipoServicio["LUZ"] = "luz";
    TipoServicio["INTERNET"] = "internet";
    TipoServicio["LIMPIEZA"] = "limpieza";
    TipoServicio["MANTENIMIENTO"] = "mantenimiento";
    TipoServicio["OTRO"] = "otro";
})(TipoServicio || (exports.TipoServicio = TipoServicio = {}));
var ModoCalculo;
(function (ModoCalculo) {
    ModoCalculo["POR_CONSUMO_M3"] = "por_consumo_m3";
    ModoCalculo["POR_CONSUMO_AJUSTADO"] = "por_consumo_ajustado";
    ModoCalculo["DIVISION_IGUALITARIA"] = "division_igualitaria";
    ModoCalculo["PORCENTAJE_ALICUOTA"] = "porcentaje_alicuota";
})(ModoCalculo || (exports.ModoCalculo = ModoCalculo = {}));
let Service = class Service {
};
exports.Service = Service;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Service.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'id_edificio' }),
    __metadata("design:type", String)
], Service.prototype, "idEdificio", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => building_entity_1.Building, (b) => b.servicios),
    (0, typeorm_1.JoinColumn)({ name: 'id_edificio' }),
    __metadata("design:type", building_entity_1.Building)
], Service.prototype, "edificio", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'nombre_servicio', length: 100 }),
    __metadata("design:type", String)
], Service.prototype, "nombreServicio", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: TipoServicio }),
    __metadata("design:type", String)
], Service.prototype, "tipo", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'modo_calculo', length: 30 }),
    __metadata("design:type", String)
], Service.prototype, "modoCalculo", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'unidad_medida', length: 10, nullable: true, default: null }),
    __metadata("design:type", String)
], Service.prototype, "unidadMedida", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'detalle_servicio', type: 'jsonb', default: {} }),
    __metadata("design:type", Object)
], Service.prototype, "detalleServicio", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], Service.prototype, "activo", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], Service.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], Service.prototype, "updatedAt", void 0);
exports.Service = Service = __decorate([
    (0, typeorm_1.Entity)('servicios')
], Service);
//# sourceMappingURL=service.entity.js.map