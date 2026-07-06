"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReadingsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const reading_entity_1 = require("./reading.entity");
const meter_image_entity_1 = require("./meter-image.entity");
const readings_service_1 = require("./readings.service");
const readings_controller_1 = require("./readings.controller");
const ocr_service_1 = require("./ocr.service");
const ocr_session_cache_1 = require("./ocr-session.cache");
const receipts_module_1 = require("../receipts/receipts.module");
const departments_module_1 = require("../departments/departments.module");
let ReadingsModule = class ReadingsModule {
};
exports.ReadingsModule = ReadingsModule;
exports.ReadingsModule = ReadingsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([reading_entity_1.Reading, meter_image_entity_1.MeterImage]),
            receipts_module_1.ReceiptsModule,
            departments_module_1.DepartmentsModule,
        ],
        providers: [readings_service_1.ReadingsService, ocr_service_1.OcrService, ocr_session_cache_1.OcrSessionCache],
        controllers: [readings_controller_1.ReadingsController],
        exports: [readings_service_1.ReadingsService],
    })
], ReadingsModule);
//# sourceMappingURL=readings.module.js.map