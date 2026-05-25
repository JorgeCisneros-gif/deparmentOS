"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReceiptsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const receipt_entity_1 = require("./receipt.entity");
const receipts_service_1 = require("./receipts.service");
const receipts_controller_1 = require("./receipts.controller");
const service_entity_1 = require("../services/service.entity");
const building_entity_1 = require("../buildings/building.entity");
let ReceiptsModule = class ReceiptsModule {
};
exports.ReceiptsModule = ReceiptsModule;
exports.ReceiptsModule = ReceiptsModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([receipt_entity_1.Receipt, service_entity_1.Service, building_entity_1.Building])],
        providers: [receipts_service_1.ReceiptsService],
        controllers: [receipts_controller_1.ReceiptsController],
        exports: [receipts_service_1.ReceiptsService],
    })
], ReceiptsModule);
//# sourceMappingURL=receipts.module.js.map