"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const reading_entity_1 = require("./reading.entity");
const meter_image_entity_1 = require("./meter-image.entity");
const ocr_service_1 = require("./ocr.service");
const ocr_session_cache_1 = require("./ocr-session.cache");
const receipts_service_1 = require("../receipts/receipts.service");
const departments_service_1 = require("../departments/departments.service");
const storage_gateway_service_1 = require("../storage-gateway/storage-gateway.service");
const MAX_HISTORY_MONTHS = 6;
const LOCAL_PURGE_GRACE_DAYS = 7;
const MAX_GATEWAY_ATTEMPTS = 5;
let ReadingsService = ReadingsService_1 = class ReadingsService {
    constructor(readingRepo, imageRepo, dataSource, ocrService, ocrSessionCache, receiptsService, departmentsService, storageGateway) {
        this.readingRepo = readingRepo;
        this.imageRepo = imageRepo;
        this.dataSource = dataSource;
        this.ocrService = ocrService;
        this.ocrSessionCache = ocrSessionCache;
        this.receiptsService = receiptsService;
        this.departmentsService = departmentsService;
        this.storageGateway = storageGateway;
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
    async assertNoExistingMeasurement(idRecibo, idDepartamento) {
        const existing = await this.readingRepo.findOne({
            where: { idRecibo, idDepartamento },
        });
        if (existing) {
            throw new common_1.ConflictException({
                message: 'Ya existe una medición para este departamento en este período. ' +
                    `Para corregirla, edita la medición existente.`,
                existingMeasurementId: existing.id,
                code: 'MEASUREMENT_ALREADY_EXISTS',
            });
        }
    }
    async create(dto) {
        await this.assertPeriodReady(dto.idRecibo);
        await this.assertNoExistingMeasurement(dto.idRecibo, dto.idDepartamento);
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
    async processOcrImage(fileBuffer, originalName, fileSizeKb, mimeType, idDepartamento, idRecibo, userId, originalBuffer) {
        await this.assertPeriodReady(idRecibo);
        await this.assertNoExistingMeasurement(idRecibo, idDepartamento);
        const bufferToPersist = originalBuffer && originalBuffer.length > 0
            ? originalBuffer
            : fileBuffer;
        const ocrResult = await this.ocrService.readMeterFromBuffer(fileBuffer, originalName);
        const sessionId = this.ocrSessionCache.set({
            buffer: bufferToPersist,
            originalFileName: originalName,
            mimeType,
            fileSizeKb: Math.round(bufferToPersist.length / 1024),
            ocrResult,
            idDepartamento,
            idRecibo,
            userId,
        });
        this.logger.log(`OCR procesado, sesión ${sessionId} (válida 30 min)`);
        return {
            sessionId,
            ocrResult,
            message: ocrResult.usedRed
                ? '⚠️ Dígitos negros no legibles — se usó fallback .999. Verifique manualmente.'
                : '✅ Lectura OCR exitosa. Confirme el valor antes de guardar.',
            siguientePaso: 'POST /readings/confirm-ocr',
        };
    }
    async confirmOcr(identifier, dto, userId) {
        await this.assertPeriodReady(dto.idRecibo);
        await this.assertNoExistingMeasurement(dto.idRecibo, dto.idDepartamento);
        if (identifier.sessionId) {
            return this.confirmFromSession(identifier.sessionId, dto, userId);
        }
        if (identifier.meterImageId) {
            return this.confirmFromImage(identifier.meterImageId, dto);
        }
        return this.confirmManualReading(dto);
    }
    async confirmFromSession(sessionId, dto, userId) {
        const session = this.ocrSessionCache.get(sessionId);
        if (!session) {
            throw new common_1.BadRequestException('Sesión OCR no encontrada o expirada. Vuelve a subir la foto.');
        }
        const timestamp = Date.now();
        const ext = path.extname(session.originalFileName) || '.jpg';
        const filename = `${session.idDepartamento}_${timestamp}${ext}`;
        const filepath = path.join(this.uploadDir, filename);
        let fileWritten = false;
        const expiresAt = new Date();
        expiresAt.setFullYear(expiresAt.getFullYear() + 1);
        let createdImageId;
        let createdReading;
        try {
            const result = await this.dataSource.transaction(async (manager) => {
                const meterImage = await manager.save(meter_image_entity_1.MeterImage, {
                    idDepartamento: session.idDepartamento,
                    idRecibo: session.idRecibo,
                    filename,
                    filepath,
                    fileSizeKb: session.fileSizeKb,
                    ocrRawValue: session.ocrResult.rawValue,
                    ocrConfidence: session.ocrResult.confidence,
                    ocrUsedRed: session.ocrResult.usedRed,
                    lecturaFinal: dto.lecturaFinal,
                    ocrMetadata: session.ocrResult.metadata,
                    expiresAt: expiresAt.toISOString().split('T')[0],
                    createdBy: userId,
                    storageProvider: 'local',
                });
                fs.writeFileSync(filepath, session.buffer);
                fileWritten = true;
                const reading = await manager.save(reading_entity_1.Reading, {
                    idRecibo: dto.idRecibo,
                    idDepartamento: dto.idDepartamento,
                    lecturaActual: dto.lecturaFinal,
                    lecturaAnterior: dto.lecturaAnterior,
                    montoCalculado: dto.montoCalculado,
                    observacion: dto.observacion,
                    idMeterImage: meterImage.id,
                });
                return { meterImageId: meterImage.id, reading };
            });
            createdImageId = result.meterImageId;
            createdReading = result.reading;
            this.ocrSessionCache.delete(sessionId);
            this.logger.log(`Lectura confirmada (sesión): ${createdReading.id}`);
        }
        catch (err) {
            if (fileWritten && fs.existsSync(filepath)) {
                try {
                    fs.unlinkSync(filepath);
                    this.logger.warn(`Archivo huérfano eliminado: ${filepath}`);
                }
                catch (unlinkErr) {
                    this.logger.error(`No se pudo eliminar archivo huérfano ${filepath}: ${unlinkErr.message}`);
                }
            }
            throw err;
        }
        this.tryUploadToGateway(createdImageId, session.buffer, session.mimeType)
            .catch((err) => {
            this.logger.warn(`Upload al gateway falló para meter_image ${createdImageId} ` +
                `(quedará local, reintentar en housekeeping): ${err.message}`);
        });
        return createdReading;
    }
    async confirmFromImage(meterImageId, dto) {
        const img = await this.imageRepo.findOne({ where: { id: meterImageId } });
        if (!img)
            throw new common_1.NotFoundException('Imagen de medidor no encontrada');
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
    async confirmManualReading(dto) {
        this.logger.log(`Lectura manual (sin foto) para depto ${dto.idDepartamento}`);
        return this.readingRepo.save(this.readingRepo.create({
            idRecibo: dto.idRecibo,
            idDepartamento: dto.idDepartamento,
            lecturaActual: dto.lecturaFinal,
            lecturaAnterior: dto.lecturaAnterior,
            montoCalculado: dto.montoCalculado,
            observacion: dto.observacion,
            idMeterImage: null,
        }));
    }
    async tryUploadToGateway(meterImageId, fileBuffer, mimeType) {
        if (!this.storageGateway.isEnabled()) {
            this.logger.debug('Gateway no configurado, foto queda local.');
            return;
        }
        let img = null;
        try {
            img = await this.imageRepo.findOne({ where: { id: meterImageId } });
            if (!img)
                return;
            const ctx = await this.resolveMeterImageContext(meterImageId);
            if (!ctx) {
                this.logger.warn(`No se pudo resolver contexto para meter_image ${meterImageId} ` +
                    `(sin recibo o sin depto). Queda local.`);
                return;
            }
            const ext = path.extname(img.filename) || '.jpg';
            const customFileName = `${ctx.tipoServicio}_${ctx.nrDepartamento}_` +
                `${String(ctx.periodoMes).padStart(2, '0')}-${ctx.periodoAnio}`;
            const tipoCapitalizado = ctx.tipoServicio.charAt(0).toUpperCase() + ctx.tipoServicio.slice(1);
            const subFolder = `Lecturas-${tipoCapitalizado}`;
            const result = await this.storageGateway.uploadFile({
                orgId: ctx.idGrupo,
                entityType: 'meter_reading',
                entityId: meterImageId,
                fileBuffer,
                fileName: `${customFileName}${ext}`,
                mimeType,
                subFolder,
                customFileName,
            });
            const wentToDrive = result.storageType === 'google_drive' &&
                result.status === 'stored_external';
            const now = new Date();
            const purgeableAt = new Date(now);
            purgeableAt.setDate(purgeableAt.getDate() + LOCAL_PURGE_GRACE_DAYS);
            await this.imageRepo.update(meterImageId, {
                storageProvider: wentToDrive ? 'google_drive' : 'local',
                gatewayFileId: result.fileId,
                externalUrl: result.externalUrl ?? null,
                gatewayUploadedAt: now,
                gatewayLastError: null,
                gatewayAttempts: () => 'gateway_attempts + 1',
                localPurgeableAt: wentToDrive ? purgeableAt : null,
            });
            this.logger.log(`Foto ${meterImageId} subida al gateway ` +
                `(${result.storageType}/${result.status}, fileId=${result.fileId})`);
        }
        catch (err) {
            try {
                await this.imageRepo
                    .createQueryBuilder()
                    .update(meter_image_entity_1.MeterImage)
                    .set({
                    gatewayLastError: (err.message || 'Error desconocido').slice(0, 500),
                    gatewayAttempts: () => 'gateway_attempts + 1',
                })
                    .where('id = :id', { id: meterImageId })
                    .execute();
            }
            catch (updateErr) {
                this.logger.error(`No se pudo registrar error de upload en meter_image ${meterImageId}: ${updateErr.message}`);
            }
            throw err;
        }
    }
    async resolveMeterImageContext(meterImageId) {
        const row = await this.dataSource.query(`
      SELECT
        e.id_grupo                AS "idGrupo",
        d.nr_departamento         AS "nrDepartamento",
        s.tipo                    AS "tipoServicio",
        r.periodo_mes             AS "periodoMes",
        r.periodo_anio            AS "periodoAnio"
      FROM meter_images mi
      JOIN departamentos d   ON d.id = mi.id_departamento
      JOIN edificios e       ON e.id = d.id_edificio
      JOIN recibos_servicio r ON r.id = mi.id_recibo
      JOIN servicios s        ON s.id = r.id_servicio
      WHERE mi.id = $1
      LIMIT 1
      `, [meterImageId]);
        if (!row || row.length === 0)
            return null;
        return row[0];
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
            .leftJoin('meter_images', 'mi', 'mi.id = CAST(r.id_meter_image AS uuid)')
            .where('r.id_departamento = :idDepartamento', { idDepartamento })
            .andWhere('svc.tipo = :tipo', { tipo: 'agua' })
            .andWhere('(rec.periodo_anio > :desdeAnio OR (rec.periodo_anio = :desdeAnio AND rec.periodo_mes >= :desdeMes))', { desdeAnio, desdeMes })
            .select([
            'rec.periodoAnio        AS anio',
            'rec.periodoMes         AS mes',
            'r.lecturaAnterior      AS lectura_anterior',
            'r.lecturaActual        AS lectura_actual',
            'r.m3Consumido          AS m3_consumido',
            'r.montoCalculado       AS monto_calculado',
            'rec.precioM3           AS precio_m3',
            'mi.id                  AS "meterImageId"',
            'mi.filename            AS "imagenFilename"',
            'mi.storage_provider    AS "storageProvider"',
            'mi.external_url        AS "imagenExternalUrl"',
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
        let externalUrl = img.externalUrl;
        if (img.storageProvider === 'google_drive' && !externalUrl && img.gatewayFileId) {
            try {
                const ctx = await this.resolveMeterImageContext(id);
                if (ctx) {
                    externalUrl = await this.storageGateway.getDownloadUrl(img.gatewayFileId, ctx.idGrupo);
                }
            }
            catch (err) {
                this.logger.warn(`No se pudo regenerar URL de Drive para ${id}: ${err.message}`);
            }
        }
        return {
            id: img.id,
            filename: img.filename,
            storageProvider: img.storageProvider,
            externalUrl: externalUrl ?? null,
            filepath: img.filepath,
        };
    }
    async runHousekeeping() {
        this.logger.log('🧹 Iniciando housekeeping de meter_images');
        const retried = await this.retryPendingUploads();
        const purgedLocal = await this.purgeLocalAfterDriveSuccess();
        const expiredDeleted = await this.deleteExpiredLocal();
        const summary = {
            retried: retried.attempted,
            retriedOk: retried.success,
            purgedLocal,
            expiredDeleted,
        };
        this.logger.log(`🧹 Housekeeping completado: ` +
            `retried ${summary.retried} (${summary.retriedOk} OK), ` +
            `purged ${summary.purgedLocal} locales, ` +
            `expired ${summary.expiredDeleted}.`);
        return summary;
    }
    async retryPendingUploads() {
        if (!this.storageGateway.isEnabled()) {
            return { attempted: 0, success: 0 };
        }
        const candidates = await this.imageRepo
            .createQueryBuilder('mi')
            .where('mi.storage_provider = :sp', { sp: 'local' })
            .andWhere('mi.gateway_attempts < :max', { max: MAX_GATEWAY_ATTEMPTS })
            .andWhere('mi.filepath IS NOT NULL')
            .andWhere('mi.id_recibo IS NOT NULL')
            .orderBy('mi.gateway_attempts', 'ASC')
            .addOrderBy('mi.created_at', 'ASC')
            .limit(50)
            .getMany();
        if (candidates.length === 0) {
            this.logger.log('No hay fotos pendientes de subir al gateway.');
            return { attempted: 0, success: 0 };
        }
        this.logger.log(`Encontradas ${candidates.length} fotos pendientes de subir al gateway.`);
        let success = 0;
        for (const img of candidates) {
            if (!img.filepath || !fs.existsSync(img.filepath)) {
                this.logger.warn(`Archivo local no encontrado para ${img.id} (esperado en ${img.filepath}). ` +
                    `Marcando como definitivamente fallido.`);
                await this.imageRepo.update(img.id, {
                    gatewayLastError: 'Archivo local no encontrado en disco',
                    gatewayAttempts: MAX_GATEWAY_ATTEMPTS,
                });
                continue;
            }
            try {
                const buffer = fs.readFileSync(img.filepath);
                const ext = path.extname(img.filename) || '.jpg';
                const mimeType = this.guessMimeType(ext);
                await this.tryUploadToGateway(img.id, buffer, mimeType);
                const updated = await this.imageRepo.findOne({ where: { id: img.id } });
                if (updated?.storageProvider === 'google_drive') {
                    success++;
                }
            }
            catch (err) {
                this.logger.debug(`Reintento falló para ${img.id}: ${err.message}`);
            }
        }
        return { attempted: candidates.length, success };
    }
    async purgeLocalAfterDriveSuccess() {
        const now = new Date();
        const candidates = await this.imageRepo
            .createQueryBuilder('mi')
            .where('mi.storage_provider = :sp', { sp: 'google_drive' })
            .andWhere('mi.gateway_file_id IS NOT NULL')
            .andWhere('mi.filepath IS NOT NULL')
            .andWhere('mi.local_purgeable_at IS NOT NULL')
            .andWhere('mi.local_purgeable_at < :now', { now })
            .limit(200)
            .getMany();
        if (candidates.length === 0)
            return 0;
        let deleted = 0;
        for (const img of candidates) {
            try {
                if (img.filepath && fs.existsSync(img.filepath)) {
                    fs.unlinkSync(img.filepath);
                }
                await this.imageRepo.update(img.id, { filepath: null });
                deleted++;
            }
            catch (err) {
                this.logger.warn(`No se pudo borrar local ${img.filepath} para ${img.id}: ${err.message}`);
            }
        }
        return deleted;
    }
    async deleteExpiredLocal() {
        const today = new Date().toISOString().split('T')[0];
        const expired = await this.imageRepo.find({
            where: {
                storageProvider: 'local',
                expiresAt: (0, typeorm_2.LessThan)(today),
            },
        });
        let deleted = 0;
        for (const img of expired) {
            try {
                if (img.filepath && fs.existsSync(img.filepath))
                    fs.unlinkSync(img.filepath);
                await this.imageRepo.remove(img);
                deleted++;
            }
            catch (err) {
                this.logger.warn(`No se pudo eliminar imagen ${img.filepath}: ${err.message}`);
            }
        }
        return deleted;
    }
    guessMimeType(ext) {
        const e = ext.toLowerCase().replace('.', '');
        if (e === 'png')
            return 'image/png';
        if (e === 'webp')
            return 'image/webp';
        if (e === 'jpg' || e === 'jpeg')
            return 'image/jpeg';
        return 'image/jpeg';
    }
};
exports.ReadingsService = ReadingsService;
exports.ReadingsService = ReadingsService = ReadingsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(reading_entity_1.Reading)),
    __param(1, (0, typeorm_1.InjectRepository)(meter_image_entity_1.MeterImage)),
    __param(2, (0, typeorm_1.InjectDataSource)()),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.DataSource,
        ocr_service_1.OcrService,
        ocr_session_cache_1.OcrSessionCache,
        receipts_service_1.ReceiptsService,
        departments_service_1.DepartmentsService,
        storage_gateway_service_1.StorageGatewayService])
], ReadingsService);
//# sourceMappingURL=readings.service.js.map