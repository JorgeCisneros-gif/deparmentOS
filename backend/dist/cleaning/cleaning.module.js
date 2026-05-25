"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CleaningModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const cleaning_entities_1 = require("./cleaning.entities");
const cleaning_service_1 = require("./cleaning.service");
const cleaning_controller_1 = require("./cleaning.controller");
let CleaningModule = class CleaningModule {
};
exports.CleaningModule = CleaningModule;
exports.CleaningModule = CleaningModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([cleaning_entities_1.CleaningProvider, cleaning_entities_1.CleaningArea, cleaning_entities_1.CleaningRecord])],
        providers: [cleaning_service_1.CleaningService],
        controllers: [cleaning_controller_1.CleaningController],
        exports: [cleaning_service_1.CleaningService],
    })
], CleaningModule);
//# sourceMappingURL=cleaning.module.js.map