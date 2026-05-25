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
exports.MeterImage = void 0;
const typeorm_1 = require("typeorm");
let MeterImage = class MeterImage {
};
exports.MeterImage = MeterImage;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], MeterImage.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'id_departamento' }),
    __metadata("design:type", String)
], MeterImage.prototype, "idDepartamento", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'id_recibo', nullable: true }),
    __metadata("design:type", String)
], MeterImage.prototype, "idRecibo", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 255 }),
    __metadata("design:type", String)
], MeterImage.prototype, "filename", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], MeterImage.prototype, "filepath", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'file_size_kb', nullable: true }),
    __metadata("design:type", Number)
], MeterImage.prototype, "fileSizeKb", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'ocr_raw_value', nullable: true, length: 20 }),
    __metadata("design:type", String)
], MeterImage.prototype, "ocrRawValue", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'ocr_confidence', type: 'numeric', precision: 5, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], MeterImage.prototype, "ocrConfidence", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'ocr_used_red', default: false }),
    __metadata("design:type", Boolean)
], MeterImage.prototype, "ocrUsedRed", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'lectura_final', type: 'numeric', precision: 10, scale: 3, nullable: true }),
    __metadata("design:type", Number)
], MeterImage.prototype, "lecturaFinal", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'ocr_metadata', type: 'jsonb', default: {} }),
    __metadata("design:type", Object)
], MeterImage.prototype, "ocrMetadata", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'expires_at', type: 'date' }),
    __metadata("design:type", String)
], MeterImage.prototype, "expiresAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'created_by', nullable: true }),
    __metadata("design:type", String)
], MeterImage.prototype, "createdBy", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], MeterImage.prototype, "createdAt", void 0);
exports.MeterImage = MeterImage = __decorate([
    (0, typeorm_1.Entity)('meter_images')
], MeterImage);
//# sourceMappingURL=meter-image.entity.js.map