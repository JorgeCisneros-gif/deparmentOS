import {
  Injectable, NotFoundException, BadRequestException, ConflictException, Logger,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, LessThan, IsNull, Not, DataSource } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { Reading } from './reading.entity';
import { MeterImage } from './meter-image.entity';
import { OcrService } from './ocr.service';
import { OcrSessionCache } from './ocr-session.cache';
import { CreateReadingDto, UpdateReadingDto, ConfirmOcrReadingDto } from './readings.dto';
import { ReceiptsService } from '../receipts/receipts.service';
import { DepartmentsService } from '../departments/departments.service';
import { StorageGatewayService } from '../storage-gateway/storage-gateway.service';

// Máximo meses de historial visible para propietarios
const MAX_HISTORY_MONTHS = 6;

// Días de gracia entre subida exitosa al Drive y borrado del local
const LOCAL_PURGE_GRACE_DAYS = 7;

// Máximo de intentos antes de dejar la foto definitivamente como local
const MAX_GATEWAY_ATTEMPTS = 5;

@Injectable()
export class ReadingsService {
  private readonly logger = new Logger(ReadingsService.name);
  private readonly uploadDir: string;

  constructor(
    @InjectRepository(Reading) private readonly readingRepo: Repository<Reading>,
    @InjectRepository(MeterImage) private readonly imageRepo: Repository<MeterImage>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly ocrService: OcrService,
    private readonly ocrSessionCache: OcrSessionCache,
    private readonly receiptsService: ReceiptsService,
    private readonly departmentsService: DepartmentsService,
    private readonly storageGateway: StorageGatewayService,
  ) {
    this.uploadDir = process.env.UPLOAD_DIR || './uploads/meters';
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  // ── Validaciones ──────────────────────────────────────────────

  private async assertPeriodReady(idRecibo: string): Promise<void> {
    const recibo = await this.receiptsService.findOne(idRecibo);
    const periodoMes = recibo.periodoMes;
    const periodoAnio = recibo.periodoAnio;
    const idEdificio = recibo.servicio?.['idEdificio'];
    if (!idEdificio) return;

    const validacion = await this.receiptsService.validatePeriodReceipts(
      idEdificio, periodoMes, periodoAnio,
    );

    if (!validacion.listo) {
      const faltantes = validacion.serviciosFaltantes.map((s) => s.toUpperCase()).join(', ');
      throw new BadRequestException(
        `No se pueden ingresar mediciones: faltan registrar los recibos de ${faltantes} ` +
        `para ${periodoMes}/${periodoAnio}. Registre primero los costos en POST /receipts.`,
      );
    }
  }

  private async assertNoExistingMeasurement(
    idRecibo: string,
    idDepartamento: string,
  ): Promise<void> {
    const existing = await this.readingRepo.findOne({
      where: { idRecibo, idDepartamento },
    });
    if (existing) {
      throw new ConflictException({
        message:
          'Ya existe una medición para este departamento en este período. ' +
          `Para corregirla, edita la medición existente.`,
        existingMeasurementId: existing.id,
        code: 'MEASUREMENT_ALREADY_EXISTS',
      });
    }
  }

  // ── CRUD mediciones ───────────────────────────────────────────

  async create(dto: CreateReadingDto): Promise<Reading> {
    await this.assertPeriodReady(dto.idRecibo);
    await this.assertNoExistingMeasurement(dto.idRecibo, dto.idDepartamento);
    return this.readingRepo.save(this.readingRepo.create(dto));
  }

  async findAll(idRecibo?: string, idDepartamento?: string): Promise<any[]> {
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

    if (idRecibo)      qb.andWhere('r.id_recibo = :idRecibo',           { idRecibo });
    if (idDepartamento) qb.andWhere('r.id_departamento = :idDepartamento', { idDepartamento });

    return qb.getRawMany();
  }

  async findOne(id: string): Promise<Reading> {
    const r = await this.readingRepo.findOne({
      where: { id },
      relations: ['departamento', 'recibo'],
    });
    if (!r) throw new NotFoundException('Medición no encontrada');
    return r;
  }

  async update(id: string, dto: UpdateReadingDto): Promise<Reading> {
    const r = await this.findOne(id);
    Object.assign(r, dto);
    return this.readingRepo.save(r);
  }

  // ── OCR ───────────────────────────────────────────────────────

  async processOcrImage(
    fileBuffer: Buffer,
    originalName: string,
    fileSizeKb: number,
    mimeType: string,
    idDepartamento: string,
    idRecibo: string,
    userId: string,
    originalBuffer?: Buffer,
  ) {
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

  async confirmOcr(
    identifier: { sessionId?: string; meterImageId?: string },
    dto: ConfirmOcrReadingDto,
    userId: string,
  ): Promise<Reading> {
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

  /**
   * Confirma desde una sesión OCR.
   *
   * Estrategia (resiliencia > consistencia inmediata):
   *   1. Guarda la medición + meter_images + archivo local (transacción atómica)
   *   2. DESPUÉS de commit, intenta subir al gateway (best effort)
   *   3. Si gateway falla, la medición queda guardada con foto local.
   *      El housekeeping nocturno reintentará el upload.
   *
   * Nunca falla la creación de la medición por culpa del gateway.
   */
  private async confirmFromSession(
    sessionId: string,
    dto: ConfirmOcrReadingDto,
    userId: string,
  ): Promise<Reading> {
    const session = this.ocrSessionCache.get(sessionId);
    if (!session) {
      throw new BadRequestException(
        'Sesión OCR no encontrada o expirada. Vuelve a subir la foto.',
      );
    }

    const timestamp = Date.now();
    const ext = path.extname(session.originalFileName) || '.jpg';
    const filename = `${session.idDepartamento}_${timestamp}${ext}`;
    const filepath = path.join(this.uploadDir, filename);
    let fileWritten = false;

    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    // ─── Paso 1: Persistir local en transacción atómica ───────
    let createdImageId: string;
    let createdReading: Reading;

    try {
      const result = await this.dataSource.transaction(async (manager) => {
        const meterImage = await manager.save(MeterImage, {
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

        const reading = await manager.save(Reading, {
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
    } catch (err) {
      if (fileWritten && fs.existsSync(filepath)) {
        try {
          fs.unlinkSync(filepath);
          this.logger.warn(`Archivo huérfano eliminado: ${filepath}`);
        } catch (unlinkErr) {
          this.logger.error(`No se pudo eliminar archivo huérfano ${filepath}: ${unlinkErr.message}`);
        }
      }
      throw err;
    }

    // ─── Paso 2: Best-effort upload al gateway (FUERA de la transacción) ───
    //
    // Si esto falla, la medición YA está guardada con foto local.
    // El housekeeping nocturno reintentará.
    this.tryUploadToGateway(createdImageId, session.buffer, session.mimeType)
      .catch((err) => {
        this.logger.warn(
          `Upload al gateway falló para meter_image ${createdImageId} ` +
          `(quedará local, reintentar en housekeeping): ${err.message}`,
        );
      });

    return createdReading;
  }

  /** Legacy. */
  private async confirmFromImage(
    meterImageId: string,
    dto: ConfirmOcrReadingDto,
  ): Promise<Reading> {
    const img = await this.imageRepo.findOne({ where: { id: meterImageId } });
    if (!img) throw new NotFoundException('Imagen de medidor no encontrada');

    img.lecturaFinal = dto.lecturaFinal;
    await this.imageRepo.save(img);

    return this.readingRepo.save(
      this.readingRepo.create({
        idRecibo: dto.idRecibo,
        idDepartamento: dto.idDepartamento,
        lecturaActual: dto.lecturaFinal,
        lecturaAnterior: dto.lecturaAnterior,
        montoCalculado: dto.montoCalculado,
        observacion: dto.observacion,
        idMeterImage: meterImageId,
      }),
    );
  }

  /** Lectura manual sin foto. */
  private async confirmManualReading(dto: ConfirmOcrReadingDto): Promise<Reading> {
    this.logger.log(`Lectura manual (sin foto) para depto ${dto.idDepartamento}`);

    return this.readingRepo.save(
      this.readingRepo.create({
        idRecibo: dto.idRecibo,
        idDepartamento: dto.idDepartamento,
        lecturaActual: dto.lecturaFinal,
        lecturaAnterior: dto.lecturaAnterior,
        montoCalculado: dto.montoCalculado,
        observacion: dto.observacion,
        idMeterImage: null,
      }),
    );
  }

  // ── Upload al gateway (privado) ──────────────────────────────

  /**
   * Intenta subir una foto al gateway.
   * Resuelve el orgId (idGrupo) y el contexto (tipo de servicio, depto, período)
   * para construir un nombre de archivo descriptivo.
   *
   * No lanza excepciones — siempre actualiza la fila para reflejar el resultado.
   */
  private async tryUploadToGateway(
    meterImageId: string,
    fileBuffer: Buffer,
    mimeType: string,
  ): Promise<void> {
    if (!this.storageGateway.isEnabled()) {
      this.logger.debug('Gateway no configurado, foto queda local.');
      return;
    }

    let img: MeterImage | null = null;
    try {
      // 1. Cargar contexto completo de la foto
      img = await this.imageRepo.findOne({ where: { id: meterImageId } });
      if (!img) return;

      const ctx = await this.resolveMeterImageContext(meterImageId);
      if (!ctx) {
        this.logger.warn(
          `No se pudo resolver contexto para meter_image ${meterImageId} ` +
          `(sin recibo o sin depto). Queda local.`,
        );
        return;
      }

      // 2. Construir nombre descriptivo: {servicio}_{depto}_{mes-anio}
      // Ej: agua_201_06-2026.jpg
      const ext = path.extname(img.filename) || '.jpg';
      const customFileName =
        `${ctx.tipoServicio}_${ctx.nrDepartamento}_` +
        `${String(ctx.periodoMes).padStart(2, '0')}-${ctx.periodoAnio}`;

      // 3. Subir al gateway
      const result = await this.storageGateway.uploadFile({
        orgId: ctx.idGrupo,
        entityType: 'meter_reading',
        entityId: meterImageId,
        fileBuffer,
        fileName: `${customFileName}${ext}`,
        mimeType,
        subFolder: `Lecturas/${ctx.tipoServicio}`,
        customFileName,
      });

      // 4. Solo marcamos como 'google_drive' si efectivamente quedó en Drive.
      // Si el gateway lo guardó temporalmente (sin Drive configurado), mantenemos 'local'
      // y NO seteamos local_purgeable_at — no queremos borrar nuestra copia.
      const wentToDrive = result.storageType === 'google_drive' &&
                          result.status === 'stored_external';

      const now = new Date();
      const purgeableAt = new Date(now);
      purgeableAt.setDate(purgeableAt.getDate() + LOCAL_PURGE_GRACE_DAYS);

      await this.imageRepo.update(meterImageId, {
        storageProvider:    wentToDrive ? 'google_drive' : 'local',
        gatewayFileId:      result.fileId,
        externalUrl:        result.externalUrl ?? null,
        gatewayUploadedAt:  now,
        gatewayLastError:   null,
        gatewayAttempts:    () => 'gateway_attempts + 1' as any,
        localPurgeableAt:   wentToDrive ? purgeableAt : null,
      });

      this.logger.log(
        `Foto ${meterImageId} subida al gateway ` +
        `(${result.storageType}/${result.status}, fileId=${result.fileId})`,
      );
    } catch (err) {
      // Registrar el error en la fila para que el housekeeping lo reintente
      try {
        await this.imageRepo
          .createQueryBuilder()
          .update(MeterImage)
          .set({
            gatewayLastError: (err.message || 'Error desconocido').slice(0, 500),
            gatewayAttempts:  () => 'gateway_attempts + 1',
          })
          .where('id = :id', { id: meterImageId })
          .execute();
      } catch (updateErr) {
        this.logger.error(
          `No se pudo registrar error de upload en meter_image ${meterImageId}: ${updateErr.message}`,
        );
      }
      throw err;
    }
  }

  /**
   * Resuelve el contexto necesario para construir el nombre del archivo y
   * encontrar el orgId del grupo dueño del edificio.
   *
   *   meter_image
   *     → departamento → edificio → grupo
   *     → recibo       → servicio
   */
  private async resolveMeterImageContext(meterImageId: string): Promise<{
    idGrupo: string;
    nrDepartamento: string;
    tipoServicio: string;
    periodoMes: number;
    periodoAnio: number;
  } | null> {
    const row = await this.dataSource.query(
      `
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
      `,
      [meterImageId],
    );

    if (!row || row.length === 0) return null;
    return row[0];
  }

  // ── Historial de consumo para propietarios ────────────────────

  async getConsumptionHistory(
    idDepartamento: string,
    isSupervisor = false,
  ): Promise<{
    mesesMostrados: number;
    nota: string;
    historial: any[];
  }> {
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
      .andWhere(
        '(rec.periodo_anio > :desdeAnio OR (rec.periodo_anio = :desdeAnio AND rec.periodo_mes >= :desdeMes))',
        { desdeAnio, desdeMes },
      )
      .select([
        'rec.periodoAnio    AS anio',
        'rec.periodoMes     AS mes',
        'r.lecturaAnterior  AS lectura_anterior',
        'r.lecturaActual    AS lectura_actual',
        'r.m3Consumido      AS m3_consumido',
        'r.montoCalculado   AS monto_calculado',
        'rec.precioM3       AS precio_m3',
        'mi.filename        AS "imagenFilename"',
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

  // ── Lectura de una imagen específica (para el frontend) ──────

  /**
   * Devuelve los datos necesarios para que el frontend muestre la imagen.
   * Si está en Drive, devuelve externalUrl directamente.
   * Si está local, devuelve filename para construir la URL local.
   */
  async getMeterImageById(id: string): Promise<{
    id: string;
    filename: string;
    storageProvider: 'local' | 'google_drive';
    externalUrl: string | null;
    filepath?: string | null;
  } | null> {
    const img = await this.imageRepo.findOne({ where: { id } });
    if (!img) return null;

    // Si está marcado como Drive pero no hay URL, intentar regenerarla on-demand
    let externalUrl = img.externalUrl;
    if (img.storageProvider === 'google_drive' && !externalUrl && img.gatewayFileId) {
      try {
        const ctx = await this.resolveMeterImageContext(id);
        if (ctx) {
          externalUrl = await this.storageGateway.getDownloadUrl(
            img.gatewayFileId,
            ctx.idGrupo,
          );
        }
      } catch (err) {
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

  // ════════════════════════════════════════════════════════════════
  //  HOUSEKEEPING (lo ejecuta el scheduler diariamente)
  // ════════════════════════════════════════════════════════════════

  /**
   * Job completo del housekeeping de fotos.
   *
   * Tres pasos secuenciales:
   *  1. Reintentar uploads fallidos al gateway
   *  2. Borrar archivos locales que ya están en Drive (con gracia de 7 días)
   *  3. Expirar fotos locales antiguas (legacy, expires_at < today)
   *
   * Es idempotente y seguro de ejecutar múltiples veces.
   */
  async runHousekeeping(): Promise<{
    retried:   number;
    retriedOk: number;
    purgedLocal: number;
    expiredDeleted: number;
  }> {
    this.logger.log('🧹 Iniciando housekeeping de meter_images');

    const retried       = await this.retryFailedUploads();
    const purgedLocal   = await this.purgeLocalAfterDriveSuccess();
    const expiredDeleted = await this.deleteExpiredLocal();

    const summary = {
      retried: retried.attempted,
      retriedOk: retried.success,
      purgedLocal,
      expiredDeleted,
    };

    this.logger.log(
      `🧹 Housekeeping completado: ` +
      `retried ${summary.retried} (${summary.retriedOk} OK), ` +
      `purged ${summary.purgedLocal} locales, ` +
      `expired ${summary.expiredDeleted}.`,
    );

    return summary;
  }

  /**
   * Paso 1: reintentar uploads fallidos al gateway.
   *
   * Selecciona fotos con:
   *   - storage_provider = 'local'
   *   - gateway_last_error IS NOT NULL  (sí intentó antes y falló)
   *   - gateway_attempts < MAX_GATEWAY_ATTEMPTS
   *   - filepath sigue existiendo en disco
   */
  private async retryFailedUploads(): Promise<{ attempted: number; success: number }> {
    if (!this.storageGateway.isEnabled()) {
      return { attempted: 0, success: 0 };
    }

    const candidates = await this.imageRepo
      .createQueryBuilder('mi')
      .where('mi.storage_provider = :sp', { sp: 'local' })
      .andWhere('mi.gateway_last_error IS NOT NULL')
      .andWhere('mi.gateway_attempts < :max', { max: MAX_GATEWAY_ATTEMPTS })
      .andWhere('mi.filepath IS NOT NULL')
      .orderBy('mi.created_at', 'ASC')
      .limit(50) // máximo por ejecución para no saturar
      .getMany();

    if (candidates.length === 0) {
      return { attempted: 0, success: 0 };
    }

    this.logger.log(`Reintentando upload de ${candidates.length} fotos.`);

    let success = 0;
    for (const img of candidates) {
      if (!img.filepath || !fs.existsSync(img.filepath)) {
        // Archivo perdido: marcamos como definitivamente fallido
        await this.imageRepo.update(img.id, {
          gatewayLastError: 'Archivo local no encontrado en disco',
          gatewayAttempts:  MAX_GATEWAY_ATTEMPTS,
        });
        continue;
      }

      try {
        const buffer = fs.readFileSync(img.filepath);
        const ext = path.extname(img.filename) || '.jpg';
        const mimeType = this.guessMimeType(ext);

        await this.tryUploadToGateway(img.id, buffer, mimeType);

        // Verificamos si esta vez tuvo éxito
        const updated = await this.imageRepo.findOne({ where: { id: img.id } });
        if (updated?.storageProvider === 'google_drive') {
          success++;
        }
      } catch (err) {
        // tryUploadToGateway ya actualizó la fila con el error
        this.logger.debug(`Reintento falló para ${img.id}: ${err.message}`);
      }
    }

    return { attempted: candidates.length, success };
  }

  /**
   * Paso 2: borrar archivos locales que ya están confirmados en Drive,
   * pasada la gracia de 7 días.
   *
   * Es un proceso conservador: solo borra el archivo del disco.
   * Mantiene la fila en BD con storage_provider='google_drive' y filepath=NULL.
   */
  private async purgeLocalAfterDriveSuccess(): Promise<number> {
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

    if (candidates.length === 0) return 0;

    let deleted = 0;
    for (const img of candidates) {
      try {
        if (img.filepath && fs.existsSync(img.filepath)) {
          fs.unlinkSync(img.filepath);
        }
        await this.imageRepo.update(img.id, { filepath: null });
        deleted++;
      } catch (err) {
        this.logger.warn(
          `No se pudo borrar local ${img.filepath} para ${img.id}: ${err.message}`,
        );
      }
    }

    return deleted;
  }

  /**
   * Paso 3: expirar fotos locales antiguas (NO afecta las que están en Drive).
   *
   * Solo borra fotos con storage_provider='local' y expires_at < today.
   * Las fotos en Drive nunca expiran (las maneja el cliente).
   */
  private async deleteExpiredLocal(): Promise<number> {
    const today = new Date().toISOString().split('T')[0];

    const expired = await this.imageRepo.find({
      where: {
        storageProvider: 'local',
        expiresAt: LessThan(today) as any,
      },
    });

    let deleted = 0;
    for (const img of expired) {
      try {
        if (img.filepath && fs.existsSync(img.filepath)) fs.unlinkSync(img.filepath);
        await this.imageRepo.remove(img);
        deleted++;
      } catch (err) {
        this.logger.warn(`No se pudo eliminar imagen ${img.filepath}: ${err.message}`);
      }
    }

    return deleted;
  }

  private guessMimeType(ext: string): string {
    const e = ext.toLowerCase().replace('.', '');
    if (e === 'png')  return 'image/png';
    if (e === 'webp') return 'image/webp';
    if (e === 'jpg' || e === 'jpeg') return 'image/jpeg';
    return 'image/jpeg';
  }
}
