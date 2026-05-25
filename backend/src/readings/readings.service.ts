import {
  Injectable, NotFoundException, BadRequestException, Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { Reading } from './reading.entity';
import { MeterImage } from './meter-image.entity';
import { OcrService } from './ocr.service';
import { CreateReadingDto, UpdateReadingDto, ConfirmOcrReadingDto } from './readings.dto';
import { ReceiptsService } from '../receipts/receipts.service';
import { DepartmentsService } from '../departments/departments.service';

// Máximo meses de historial visible para propietarios
const MAX_HISTORY_MONTHS = 6;

@Injectable()
export class ReadingsService {
  private readonly logger = new Logger(ReadingsService.name);
  private readonly uploadDir: string;

  constructor(
    @InjectRepository(Reading) private readonly readingRepo: Repository<Reading>,
    @InjectRepository(MeterImage) private readonly imageRepo: Repository<MeterImage>,
    private readonly ocrService: OcrService,
    private readonly receiptsService: ReceiptsService,
    private readonly departmentsService: DepartmentsService,
  ) {
    this.uploadDir = process.env.UPLOAD_DIR || './uploads/meters';
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  // ── Validación del período ────────────────────────────────────

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

  // ── CRUD mediciones ───────────────────────────────────────────

  async create(dto: CreateReadingDto): Promise<Reading> {
    await this.assertPeriodReady(dto.idRecibo);
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

  // src/readings/readings.service.ts
// ── REEMPLAZAR solo el método processOcrImage ─────────────────
// Los demás métodos quedan igual.

async processOcrImage(
  fileBuffer: Buffer,     // imagen procesada (recortada/rotada) → solo para OCR
  originalName: string,
  fileSizeKb: number,
  idDepartamento: string,
  idRecibo: string,
  userId: string,
  originalBuffer?: Buffer, // imagen original → se guarda en BD (opcional)
) {
  await this.assertPeriodReady(idRecibo);

  const timestamp = Date.now();
  const ext       = path.extname(originalName) || '.jpg';

  // ── Imagen que se GUARDA en BD: original si la hay, si no la procesada ──
  const bufferToSave = originalBuffer && originalBuffer.length > 0
    ? originalBuffer
    : fileBuffer;

  const filename = `${idDepartamento}_${timestamp}${ext}`;
  const filepath = path.join(this.uploadDir, filename);
  fs.writeFileSync(filepath, bufferToSave);

  const fileSizeKbFinal = Math.round(bufferToSave.length / 1024);

  // ── Imagen TEMPORAL para OCR: la procesada (recortada/rotada) ──
  // Si es la misma que la que guardamos, no necesitamos un fichero extra
  let ocrFilepath = filepath;
  let tempCreated = false;

  if (originalBuffer && originalBuffer.length > 0) {
    // Crear fichero temporal con la imagen procesada para OCR
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
  } catch (err) {
    // Limpiar ambos archivos si falla el OCR
    if (fs.existsSync(filepath))    fs.unlinkSync(filepath);
    if (tempCreated && fs.existsSync(ocrFilepath)) fs.unlinkSync(ocrFilepath);
    throw err;
  } finally {
    // Siempre eliminar el temporal de OCR si lo creamos
    if (tempCreated && fs.existsSync(ocrFilepath)) {
      fs.unlinkSync(ocrFilepath);
    }
  }

  const meterImage = await this.imageRepo.save(
    this.imageRepo.create({
      idDepartamento,
      idRecibo,
      filename,
      filepath,
      fileSizeKb: fileSizeKbFinal,
      ocrRawValue:   ocrResult.rawValue,
      ocrConfidence: ocrResult.confidence,
      ocrUsedRed:    ocrResult.usedRed,
      lecturaFinal:  ocrResult.lecturaFinal,
      ocrMetadata:   ocrResult.metadata,
      expiresAt:     expiresAt.toISOString().split('T')[0],
      createdBy:     userId,
    }),
  );

  return {
    meterImageId: meterImage.id,
    ocrResult,
    message: ocrResult.usedRed
      ? '⚠️ Dígitos negros no legibles — se usó fallback .999. Verifique manualmente.'
      : '✅ Lectura OCR exitosa. Confirme el valor antes de guardar.',
    siguientePaso: 'POST /readings/confirm-ocr',
  };
}


  async confirmOcr(meterImageId: string, dto: ConfirmOcrReadingDto, userId: string): Promise<Reading> {
    const img = await this.imageRepo.findOne({ where: { id: meterImageId } });
    if (!img) throw new NotFoundException('Imagen de medidor no encontrada');

    await this.assertPeriodReady(dto.idRecibo);

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

  // ── Historial de consumo para propietarios ────────────────────
  //
  // Housekeeping: solo se muestran los últimos MAX_HISTORY_MONTHS meses
  // (6 por defecto) independientemente de que existan datos más antiguos.
  // Esto es coherente con el retention de 1 año de imágenes —
  // los datos de medición se mantienen en BD, pero el propietario
  // solo tiene visibilidad de los 6 meses más recientes.

  async getConsumptionHistory(
    idDepartamento: string,
    isSupervisor = false,
  ): Promise<{
    mesesMostrados: number;
    nota: string;
    historial: any[];
  }> {
    const limitMeses = isSupervisor ? 24 : MAX_HISTORY_MONTHS;

    // Calcular fecha límite (N meses atrás desde hoy)
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
      .andWhere(
        // Filtrar por período >= fecha límite
        '(rec.periodo_anio > :desdeAnio OR (rec.periodo_anio = :desdeAnio AND rec.periodo_mes >= :desdeMes))',
        { desdeAnio, desdeMes },
      )
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

  // ── Housekeeping imágenes ─────────────────────────────────────
async getMeterImageById(id: string): Promise<{ id: string; filename: string; filepath: string } | null> {
  const img = await this.imageRepo.findOne({ where: { id } });
  if (!img) return null;
  return { id: img.id, filename: img.filename, filepath: img.filepath };
}
  async runHousekeeping(): Promise<{ deleted: number }> {
    const today = new Date().toISOString().split('T')[0];
    const expired = await this.imageRepo.find({
      where: { expiresAt: LessThan(today) as any },
    });

    let deleted = 0;
    for (const img of expired) {
      try {
        if (fs.existsSync(img.filepath)) fs.unlinkSync(img.filepath);
        await this.imageRepo.remove(img);
        deleted++;
      } catch (err) {
        this.logger.warn(`No se pudo eliminar imagen ${img.filepath}: ${err.message}`);
      }
    }
    this.logger.log(`Housekeeping: ${deleted} imágenes eliminadas`);
    return { deleted };
  }
}
