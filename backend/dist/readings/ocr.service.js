"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var OcrService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OcrService = void 0;
const common_1 = require("@nestjs/common");
const fs = require("fs");
const FormData = require("form-data");
const axios_1 = require("axios");
let OcrService = OcrService_1 = class OcrService {
    constructor() {
        this.logger = new common_1.Logger(OcrService_1.name);
    }
    get ocrEndpoint() {
        const endpoint = process.env.OCR_ENDPOINT ?? 'http://localhost:8000/ocr';
        this.logger.debug(`OCR_ENDPOINT resuelto: ${endpoint}`);
        return endpoint;
    }
    async readMeter(imagePath) {
        if (!fs.existsSync(imagePath)) {
            throw new common_1.BadRequestException(`Imagen no encontrada: ${imagePath}`);
        }
        const endpoint = this.ocrEndpoint;
        this.logger.log(`Enviando imagen al servicio OCR: ${endpoint}`);
        const form = new FormData();
        form.append('file', fs.createReadStream(imagePath));
        let rawResponse;
        try {
            const response = await axios_1.default.post(endpoint, form, {
                headers: {
                    ...form.getHeaders(),
                },
                timeout: 30000,
            });
            rawResponse = response.data;
            this.logger.debug(`Respuesta OCR: ${JSON.stringify(rawResponse)}`);
        }
        catch (error) {
            const axiosError = error;
            if (axiosError.code === 'ECONNREFUSED') {
                this.logger.error(`Conexión rechazada en ${endpoint}`);
                throw new common_1.BadRequestException(`No se pudo conectar al servicio OCR en ${endpoint}. ` +
                    `Verifica que el contenedor esté corriendo: docker compose up -d`);
            }
            if (axiosError.response) {
                this.logger.error(`OCR respondió ${axiosError.response.status}: ${JSON.stringify(axiosError.response.data)}`);
                throw new common_1.BadRequestException(`Error del servicio OCR: ${JSON.stringify(axiosError.response.data)}`);
            }
            this.logger.error(`Error inesperado: ${axiosError.message}`);
            throw new common_1.BadRequestException(`Error al procesar imagen: ${axiosError.message}`);
        }
        if (!rawResponse.success) {
            throw new common_1.BadRequestException(`OCR falló: ${rawResponse.message}`);
        }
        const digitsOnly = rawResponse.digits_only ?? '';
        const lecturaFinal = this.parseReading(digitsOnly);
        this.logger.log(`OCR OK — raw="${rawResponse.text}" | digits="${digitsOnly}" | ` +
            `lectura=${lecturaFinal} | confianza=${rawResponse.confidence}%`);
        return {
            rawValue: digitsOnly,
            lecturaFinal,
            confidence: rawResponse.confidence ?? 0,
            usedRed: lecturaFinal.toString().endsWith('.999'),
            metadata: rawResponse,
        };
    }
    parseReading(digits) {
        if (!digits || digits.trim() === '') {
            this.logger.warn('OCR no detectó dígitos — fallback 0.999');
            return 0.999;
        }
        const num = parseFloat(digits);
        if (isNaN(num)) {
            this.logger.warn(`Dígitos no parseables: "${digits}" — fallback .999`);
            const partial = parseInt(digits.replace(/\D/g, ''), 10);
            return isNaN(partial) ? 0.999 : parseFloat(`${partial}.999`);
        }
        return num;
    }
};
exports.OcrService = OcrService;
exports.OcrService = OcrService = OcrService_1 = __decorate([
    (0, common_1.Injectable)()
], OcrService);
//# sourceMappingURL=ocr.service.js.map