"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlicuotasModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const alicuota_entity_1 = require("./alicuota.entity");
const department_entity_1 = require("../departments/department.entity");
const alicuotas_service_1 = require("./alicuotas.service");
const alicuotas_controller_1 = require("./alicuotas.controller");
let AlicuotasModule = class AlicuotasModule {
};
exports.AlicuotasModule = AlicuotasModule;
exports.AlicuotasModule = AlicuotasModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([alicuota_entity_1.Alicuota, department_entity_1.Department])],
        providers: [alicuotas_service_1.AlicuotasService],
        controllers: [alicuotas_controller_1.AlicuotasController],
        exports: [alicuotas_service_1.AlicuotasService],
    })
], AlicuotasModule);
//# sourceMappingURL=alicuotas.module.js.map