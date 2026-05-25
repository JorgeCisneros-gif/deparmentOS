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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var ReadingsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReadingsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const fs = require("fs");
const path = require("path");
const reading_entity_1 = require("./reading.entity");
const meter_image_entity_1 = require("./meter-image.entity");
const ocr_service_1 = require("./ocr.service");
const receipts_service_1 = require("../receipts/receipts.service");
const departments_service_1 = require("../departments/departments.service");
const MAX_HISTORY_MONTHS = 6;
let ReadingsService = ReadingsService_1 = class ReadingsService {
    constructor(readingRepo, imageRepo, ocrService, receiptsService, departmentsService) {
        this.readingRepo = readingRepo;
        this.imageRepo = imageRepo;
        this.ocrService = ocrService;
        this.receiptsService = receiptsService;
        this.departmentsService = departmentsService;
        this.logger = new common_1.Logger(ReadingsService_1.name);
        this.uploadDir = process.env.UPLOAD_DIR || './uploads/meters';
        if (!fs.existsSync(this.uploadDir)) {
            fs.mkdirSync(this.uploadDir, { recursive: true });
        }
    }
    async assertPeriodReady(idRecibo) {
        const recibo = await this.receiptsService.findOne(idRecibo);
        const periodoMes = recibo.periodoMes;
        const periodoAnio = recibo.periodoAnio;
        const idEdificio = recibo.servicio?.['idEdificio'];
        if (!idEdificio)
            return;
        const validacion = await this.receiptsService.validatePeriodReceipts(idEdificio, periodoMes, periodoAnio);
        if (!validacion.listo) {
            const faltantes = validacion.serviciosFaltantes.map((s) => s.toUpperCase()).join(', ');
            throw new common_1.BadRequestException(`No se pueden ingresar mediciones: faltan registrar los recibos de ${faltantes} ` +
                `para ${periodoMes}/${periodoAnio}. Registre primero los costos en POST /receipts.`);
        }
    }
    async create(dto) {
        await this.assertPeriodReady(dto.idRecibo);
        return this.readingRepo.save(this.readingRepo.create(dto));
    }
    async findAll(idRecibo, idDepartamento) {
        const qb = this.readingRepo
            .createQueryBuilder('r')
            .leftJoin('meter_images', 'mi', 'mi.id = CAST(r.id_meter_image AS uuid)')
            .leftJoin('r.departamento', 'd')
            .select([
            'r.id                  AS id',
            'r.id_recibo           AS "idRecibo"',
            'r.id_departamento     AS "idDepartamento"',
            'r.lectura_actual      AS "lecturaActual"',
            'r.lectura_anterior    AS "lecturaAnterior"',
            'r.m3_consumido        AS "m3Consumido"',
            'r.monto_calculado     AS "montoCalculado"',
            'r.id_meter_image      AS "idMeterImage"',
            'r.observacion         AS observacion',
            'r.created_at          AS "createdAt"',
            'd.nr_departamento     AS "nrDepartamento"',
            'mi.filename           AS "imagenFilename"',
            'mi.ocr_confidence     AS "ocrConfianza"',
        ])
            .orderBy('r.created_at', 'DESC');
        if (idRecibo)
            qb.andWhere('r.id_recibo = :idRecibo', { idRecibo });
        if (idDepartamento)
            qb.andWhere('r.id_departamento = :idDepartamento', { idDepartamento });
        return qb.getRawMany();
    }
    async findOne(id) {
        const r = await this.readingRepo.findOne({
            where: { id },
            relations: ['departamento', 'recibo'],
        });
        if (!r)
            throw new common_1.NotFoundException('Medición no encontrada');
        return r;
    }
    async update(id, dto) {
        const r = await this.findOne(id);
        Object.assign(r, dto);
        return this.readingRepo.save(r);
    }
    async processOcrImage(fileBuffer, originalName, fileSizeKb, idDepartamento, idRecibo, userId, originalBuffer) {
        await this.assertPeriodReady(idRecibo);
        const timestamp = Date.now();
        const ext = path.extname(originalName) || '.jpg';
        const bufferToSave = originalBuffer && originalBuffer.length > 0
            ? originalBuffer
            : fileBuffer;
        const filename = `${idDepartamento}_${timestamp}${ext}`;
        const filepath = path.join(this.uploadDir, filename);
        fs.writeFileSync(filepath, bufferToSave);
        const fileSizeKbFinal = Math.round(bufferToSave.length / 1024);
        let ocrFilepath = filepath;
        let tempCreated = false;
        if (originalBuffer && originalBuffer.length > 0) {
            const tempFilename = `temp_ocr_${idDepartamento}_${timestamp}${ext}`;
            ocrFilepath = path.join(this.uploadDir, tempFilename);
            fs.writeFileSync(ocrFilepath, fileBuffer);
            tempCreated = true;
        }
        const expiresAt = new Date();
        expiresAt.setFullYear(expiresAt.getFullYear() + 1);
        let ocrResult;
        try {
            ocrResult = await this.ocrService.readMeter(ocrFilepath);
        }
        catch (err) {
            if (fs.existsSync(filepath))
                fs.unlinkSync(filepath);
            if (tempCreated && fs.existsSync(ocrFilepath))
                fs.unlinkSync(ocrFilepath);
            throw err;
        }
        finally {
            if (tempCreated && fs.existsSync(ocrFilepath)) {
                fs.unlinkSync(ocrFilepath);
            }
        }
        const meterImage = await this.imageRepo.save(this.imageRepo.create({
            idDepartamento,
            idRecibo,
            filename,
            filepath,
            fileSizeKb: fileSizeKbFinal,
            ocrRawValue: ocrResult.rawValue,
            ocrConfidence: ocrResult.confidence,
            ocrUsedRed: ocrResult.usedRed,
            lecturaFinal: ocrResult.lecturaFinal,
            ocrMetadata: ocrResult.metadata,
            expiresAt: expiresAt.toISOString().split('T')[0],
            createdBy: userId,
        }));
        return {
            meterImageId: meterImage.id,
            ocrResult,
            message: ocrResult.usedRed
                ? '⚠️ Dígitos negros no legibles — se usó fallback .999. Verifique manualmente.'
                : '✅ Lectura OCR exitosa. Confirme el valor antes de guardar.',
            siguientePaso: 'POST /readings/confirm-ocr',
        };
    }
    async confirmOcr(meterImageId, dto, userId) {
        const img = await this.imageRepo.findOne({ where: { id: meterImageId } });
        if (!img)
            throw new common_1.NotFoundException('Imagen de medidor no encontrada');
        await this.assertPeriodReady(dto.idRecibo);
        img.lecturaFinal = dto.lecturaFinal;
        await this.imageRepo.save(img);
        return this.readingRepo.save(this.readingRepo.create({
            idRecibo: dto.idRecibo,
            idDepartamento: dto.idDepartamento,
            lecturaActual: dto.lecturaFinal,
            lecturaAnterior: dto.lecturaAnterior,
            montoCalculado: dto.montoCalculado,
            observacion: dto.observacion,
            idMeterImage: meterImageId,
        }));
    }
    async getConsumptionHistory(idDepartamento, isSupervisor = false) {
        const limitMeses = isSupervisor ? 24 : MAX_HISTORY_MONTHS;
        const desde = new Date();
        desde.setMonth(desde.getMonth() - limitMeses);
        const desdeAnio = desde.getFullYear();
        const desdeMes = desde.getMonth() + 1;
        const historial = await this.readingRepo
            .createQueryBuilder('r')
            .leftJoin('r.recibo', 'rec')
            .leftJoin('rec.servicio', 'svc')
            .where('r.id_departamento = :idDepartamento', { idDepartamento })
            .andWhere('svc.tipo = :tipo', { tipo: 'agua' })
            .andWhere('(rec.periodo_anio > :desdeAnio OR (rec.periodo_anio = :desdeAnio AND rec.periodo_mes >= :desdeMes))', { desdeAnio, desdeMes })
            .select([
            'rec.periodoAnio AS anio',
            'rec.periodoMes AS mes',
            'r.lecturaAnterior AS lectura_anterior',
            'r.lecturaActual AS lectura_actual',
            'r.m3Consumido AS m3_consumido',
            'r.montoCalculado AS monto_calculado',
            'rec.precioM3 AS precio_m3',
        ])
            .orderBy('rec.periodoAnio', 'DESC')
            .addOrderBy('rec.periodoMes', 'DESC')
            .limit(limitMeses)
            .getRawMany();
        return {
            mesesMostrados: limitMeses,
            nota: isSupervisor
                ? `Mostrando hasta ${limitMeses} meses de historial (vista supervisor)`
                : `Mostrando los últimos ${MAX_HISTORY_MONTHS} meses de historial`,
            historial,
        };
    }
    async getMeterImageById(id) {
        const img = await this.imageRepo.findOne({ where: { id } });
        if (!img)
            return null;
        return { id: img.id, filename: img.filename, filepath: img.filepath };
    }
    async runHousekeeping() {
        const today = new Date().toISOString().split('T')[0];
        const expired = await this.imageRepo.find({
            where: { expiresAt: (0, typeorm_2.LessThan)(today) },
        });
        let deleted = 0;
        for (const img of expired) {
            try {
                if (fs.existsSync(img.filepath))
                    fs.unlinkSync(img.filepath);
                await this.imageRepo.remove(img);
                deleted++;
            }
            catch (err) {
                this.logger.warn(`No se pudo eliminar imagen ${img.filepath}: ${err.message}`);
            }
        }
        this.logger.log(`Housekeeping: ${deleted} imágenes eliminadas`);
        return { deleted };
    }
};
exports.ReadingsService = ReadingsService;
exports.ReadingsService = ReadingsService = ReadingsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(reading_entity_1.Reading)),
    __param(1, (0, typeorm_1.InjectRepository)(meter_image_entity_1.MeterImage)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        ocr_service_1.OcrService,
        receipts_service_1.ReceiptsService,
        departments_service_1.DepartmentsService])
], ReadingsService);
//# sourceMappingURL=readings.service.js.map