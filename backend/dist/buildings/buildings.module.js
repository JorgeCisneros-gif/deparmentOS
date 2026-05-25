"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BuildingsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const building_entity_1 = require("./building.entity");
const buildings_service_1 = require("./buildings.service");
const buildings_controller_1 = require("./buildings.controller");
let BuildingsModule = class BuildingsModule {
};
exports.BuildingsModule = BuildingsModule;
exports.BuildingsModule = BuildingsModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([building_entity_1.Building])],
        providers: [buildings_service_1.BuildingsService],
        controllers: [buildings_controller_1.BuildingsController],
        exports: [buildings_service_1.BuildingsService],
    })
], BuildingsModule);
//# sourceMappingURL=buildings.module.js.map