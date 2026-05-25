"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var ImageUploadService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImageUploadService = void 0;
const common_1 = require("@nestjs/common");
const fs = require("fs");
const path = require("path");
const DEFAULT_ALLOWED = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const BASE_UPLOAD_DIR = process.env.UPLOAD_BASE_DIR || './uploads';
let ImageUploadService = ImageUploadService_1 = class ImageUploadService {
    constructor() {
        this.logger = new common_1.Logger(ImageUploadService_1.name);
    }
    async parseMultipart(req, opts) {
        const maxBytes = (opts?.maxSizeMb ?? 10) * 1024 * 1024;
        const allowed = opts?.allowedMimes ?? DEFAULT_ALLOWED;
        const fields = {};
        let fileBuffer = null;
        let originalName = 'imagen.jpg';
        let mimeType = 'image/jpeg';
        try {
            const parts = req.parts();
            for await (const part of parts) {
                if (part.file) {
                    fileBuffer = await part.toBuffer();
                    originalName = part.filename || 'imagen.jpg';
                    mimeType = part.mimetype || 'image/jpeg';
                }
                else {
                    fields[part.fieldname] = part.value?.trim() || '';
                }
            }
        }
        catch (err) {
            throw new common_1.BadRequestException(`Error procesando formulario: ${err.message}`);
        }
        if (!fileBuffer || fileBuffer.length === 0) {
            throw new common_1.BadRequestException('Se requiere una imagen');
        }
        if (fileBuffer.length > maxBytes) {
            throw new common_1.BadRequestException(`Imagen demasiado grande. Máximo ${opts?.maxSizeMb ?? 10}MB`);
        }
        if (!allowed.includes(mimeType.toLowerCase())) {
            throw new common_1.BadRequestException(`Tipo no permitido: ${mimeType}. Use: ${allowed.join(', ')}`);
        }
        const fileSizeKb = Math.round(fileBuffer.length / 1024);
        return {
            fields,
            image: {
                buffer: fileBuffer,
                filename: originalName,
                mimeType,
                fileSizeKb,
                filepath: '',
            },
        };
    }
    saveBuffer(buffer, originalName, prefix, opts) {
        const subdir = opts?.subdir ?? 'misc';
        const dir = path.join(BASE_UPLOAD_DIR, subdir);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        const ext = path.extname(originalName) || '.jpg';
        const safeName = `${prefix}_${Date.now()}${ext}`;
        const filepath = path.join(dir, safeName);
        fs.writeFileSync(filepath, buffer);
        this.logger.log(`Imagen guardada: ${filepath}`);
        return filepath;
    }
    saveBase64(base64, originalName, prefix, opts) {
        const data = base64.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(data, 'base64');
        return this.saveBuffer(buffer, originalName, prefix, opts);
    }
    deleteIfExists(filepath) {
        if (filepath && fs.existsSync(filepath)) {
            fs.unlinkSync(filepath);
            this.logger.log(`Imagen eliminada: ${filepath}`);
        }
    }
};
exports.ImageUploadService = ImageUploadService;
exports.ImageUploadService = ImageUploadService = ImageUploadService_1 = __decorate([
    (0, common_1.Injectable)()
], ImageUploadService);
//# sourceMappingURL=image-upload.service.js.map