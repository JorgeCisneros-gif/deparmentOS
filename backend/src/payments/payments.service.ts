// src/payments/payments.service.ts
import {
  Injectable, NotFoundException, BadRequestException, Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, In, LessThan } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { Payment } from './payment.entity';
import { PaymentVoucher } from './payment-voucher.entity';
import { Fee, MontoServicioItem } from '../fees/fee.entity';
import { Service } from '../services/service.entity';
import { CreatePagoAutoDto, CreatePaymentDto } from './payments.dto';
import { FeesService } from '../fees/fees.service';
import { ImageUploadService } from '../shared/image-upload.service';
import { StorageGatewayService } from '../storage-gateway/storage-gateway.service';

// Configuración del housekeeping
const HK_MAX_RETRY_ATTEMPTS  = 5;
const HK_LOCAL_RETENTION_DAYS = 7;   // Días que se mantiene el archivo local después de subir
const HK_BATCH_SIZE           = 50;  // Vouchers por ejecución

const MESES_CORTO = ['','Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectRepository(Payment) private readonly repo: Repository<Payment>,
    @InjectRepository(Fee)     private readonly feeRepo: Repository<Fee>,
    @InjectRepository(Service) private readonly serviceRepo: Repository<Service>,
    @InjectRepository(PaymentVoucher) private readonly voucherRepo: Repository<PaymentVoucher>,
    private readonly feesService: FeesService,
    private readonly imageUpload: ImageUploadService,
    private readonly storageGateway: StorageGatewayService,
  ) {}

  // ── Registrar pago ────────────────────────────────────────────

  async create(dto: CreatePaymentDto): Promise<Payment> {
    const fee = await this.feesService.findOne(dto.idCuota);

    if (!fee.mensajeEnviado) {
      throw new BadRequestException(
        `Primero confirma el envío del mensaje al propietario del depto ${fee.departamento?.nrDepartamento || ''}.`,
      );
    }
    if (fee.statusPago === 'pagado') {
      throw new BadRequestException(
        `La cuota del depto ${fee.departamento?.nrDepartamento || ''} ya está completamente pagada.`,
      );
    }

    const payment = await this.repo.save(this.repo.create(dto));

    const allPayments = await this.repo.find({ where: { idCuota: dto.idCuota } });
    const totalPagado = allPayments.reduce((sum, p) => sum + parseFloat(p.montoCancelado as any), 0);
    const montoTotal  = parseFloat(fee.montoTotal as any);

    let newStatus = 'pendiente';
    if (totalPagado >= montoTotal)      newStatus = 'pagado';
    else if (totalPagado > 0)           newStatus = 'parcial';

    await this.feesService.updateStatus(dto.idCuota, newStatus);
    return payment;
  }

  // ════════════════════════════════════════════════════════════
  //  COMPROBANTES (payment_vouchers)
  // ════════════════════════════════════════════════════════════

  /**
   * Sube un comprobante para un pago.
   *
   * Flujo:
   *  1. Guarda el archivo en /uploads/comprobantes/
   *  2. Crea registro en payment_vouchers (storage_provider='local')
   *  3. Intenta subirlo al gateway → si OK, marca google_drive y programa purga
   *  4. Si gateway falla → queda como 'local', el housekeeping reintenta
   *  5. Actualiza pagos.comprobante_url al path local (para retro-compat)
   *
   * Es resiliente: si el gateway está caído, el pago se registra igual.
   */
  async uploadVoucher(params: {
    paymentId:   string;
    base64:      string;
    filename:    string;
    uploadedBy:  string;
  }): Promise<PaymentVoucher> {
    const payment = await this.findOne(params.paymentId);

    // 1) Guardar archivo en filesystem
    const localPath = this.imageUpload.saveBase64(
      params.base64,
      params.filename,
      `comprobante_${params.paymentId}`,
      { subdir: 'comprobantes' },
    );

    // Inferir mime type del nombre
    const ext = path.extname(params.filename).toLowerCase().slice(1) || 'jpg';
    const mimeType = ext === 'png' ? 'image/png'
                  : ext === 'webp' ? 'image/webp'
                  : 'image/jpeg';

    // Tamaño del archivo
    let sizeKb = 0;
    try {
      const stat = fs.statSync(localPath);
      sizeKb = Math.round(stat.size / 1024);
    } catch (e) { /* ignore */ }

    // 2) Crear voucher en estado 'local'
    const voucher = this.voucherRepo.create({
      idPago:           params.paymentId,
      filename:         path.basename(localPath),
      filepath:         localPath,
      mimeType,
      sizeKb,
      storageProvider:  'local',
      gatewayAttempts:  0,
      uploadedBy:       params.uploadedBy,
    });
    await this.voucherRepo.save(voucher);

    // 3) Intentar subir al gateway (best-effort, no rompe el flujo)
    await this.tryUploadToGateway(voucher, payment);

    // 4) Actualizar pagos.comprobante_url (legacy compat, apunta al local)
    payment.comprobanteUrl = '/' + localPath.replace(/^\.?\//, '').replace(/\\/g, '/');
    await this.repo.save(payment);

    return voucher;
  }

  /**
   * Intenta subir un voucher al gateway. Si funciona, marca el voucher como
   * 'google_drive' y programa la purga del archivo local en 7 días.
   *
   * Best-effort: si el gateway falla, no lanza error.
   * El housekeeping reintenta automáticamente.
   */
  private async tryUploadToGateway(voucher: PaymentVoucher, payment: Payment): Promise<void> {
    if (!this.storageGateway.isEnabled()) {
      this.logger.warn(`Storage Gateway no configurado, voucher ${voucher.id} queda en local`);
      return;
    }

    try {
      const ctx = await this.resolveVoucherContext(voucher.id);
      if (!ctx) throw new Error('No se pudo resolver el contexto del voucher');

      if (!voucher.filepath || !fs.existsSync(voucher.filepath)) {
        throw new Error('Archivo local no encontrado');
      }

      const buffer = fs.readFileSync(voucher.filepath);
      const subFolder = `Comprobantes-Pagos`;
      const customFileName = `pago_${ctx.nrDepartamento}_${MESES_CORTO[ctx.periodoMes]}-${ctx.periodoAnio}_${Date.now()}`;

      const uploadResult = await this.storageGateway.uploadFile({
        orgId:           ctx.idGrupo,
        entityType:      'payment_voucher',
        entityId:        voucher.id,
        subFolder,
        customFileName,
        fileBuffer:      buffer,
        fileName:        voucher.filename,
        mimeType:        voucher.mimeType || 'image/jpeg',
      });

      // Marcar como subido al Drive
      voucher.storageProvider    = 'google_drive';
      voucher.gatewayFileId      = uploadResult.fileId;
      voucher.externalUrl        = uploadResult.externalUrl || null;
      voucher.gatewayUploadedAt  = new Date();
      voucher.gatewayLastError   = null;
      voucher.gatewayAttempts   += 1;
      // Programar purga del archivo local en X días
      const purgeDate = new Date();
      purgeDate.setDate(purgeDate.getDate() + HK_LOCAL_RETENTION_DAYS);
      voucher.localPurgeableAt = purgeDate;

      await this.voucherRepo.save(voucher);
      this.logger.log(`Voucher ${voucher.id} subido al Drive: ${uploadResult.fileId}`);

    } catch (err: any) {
      voucher.gatewayAttempts += 1;
      voucher.gatewayLastError = (err.message || 'Error desconocido').slice(0, 500);
      await this.voucherRepo.save(voucher);
      this.logger.warn(`Voucher ${voucher.id} no pudo subirse al Drive (intento ${voucher.gatewayAttempts}): ${err.message}`);
    }
  }

  /**
   * Resuelve el contexto del voucher para autenticar con el gateway:
   *  - id_grupo del edificio (= orgId del Drive)
   *  - nro de departamento
   *  - mes/año del período de la cuota asociada
   */
  private async resolveVoucherContext(voucherId: string): Promise<{
    idGrupo:        string;
    nrDepartamento: string;
    periodoMes:     number;
    periodoAnio:    number;
  } | null> {
    const rows = await this.voucherRepo.query(
      `
      SELECT
        e.id_grupo            AS "idGrupo",
        d.nr_departamento     AS "nrDepartamento",
        f.periodo_mes         AS "periodoMes",
        f.periodo_anio        AS "periodoAnio"
      FROM payment_vouchers pv
      JOIN pagos p             ON p.id = pv.id_pago
      JOIN cuotas_departamento f ON f.id = p.id_cuota
      JOIN departamentos d     ON d.id = f.id_departamento
      JOIN edificios e         ON e.id = d.id_edificio
      WHERE pv.id = $1
      LIMIT 1
      `,
      [voucherId],
    );
    if (!rows || rows.length === 0) return null;
    return rows[0];
  }

  // ── Helpers públicos para el controller ─────

  /** Devuelve datos básicos del voucher para servir bytes. */
  async getVoucherById(id: string): Promise<PaymentVoucher | null> {
    return this.voucherRepo.findOne({ where: { id } });
  }

  /** Lista todos los vouchers de un pago (puede haber varios). */
  async getVouchersByPayment(paymentId: string): Promise<PaymentVoucher[]> {
    return this.voucherRepo.find({
      where: { idPago: paymentId },
      order: { createdAt: 'ASC' },
    });
  }

  /** Resuelve org id para autenticar el download desde el gateway. */
  async resolveOrgIdForVoucher(voucherId: string): Promise<{ idGrupo: string } | null> {
    return this.resolveVoucherContext(voucherId);
  }

  /** Devuelve gatewayFileId de un voucher. */
  async getGatewayFileId(voucherId: string): Promise<string | null> {
    const v = await this.voucherRepo.findOne({ where: { id: voucherId } });
    return v?.gatewayFileId ?? null;
  }

  // ════════════════════════════════════════════════════════════
  //  HOUSEKEEPING
  // ════════════════════════════════════════════════════════════

  /**
   * Mantenimiento de vouchers:
   *  Fase 1 — retryPendingUploads: sube al Drive los que quedaron en 'local'
   *  Fase 2 — purgeLocalFiles: borra archivos locales ya subidos cuya retención expiró
   *
   * Lo llama el scheduler externo vía HTTP.
   */
  async runHousekeeping(): Promise<{
    retried:        number;
    retriedOk:      number;
    purgedLocal:    number;
  }> {
    this.logger.log('[VouchersHousekeeping] Iniciando...');

    const retried = await this.retryPendingUploads();
    const purged  = await this.purgeLocalFiles();

    this.logger.log(`[VouchersHousekeeping] Retried=${retried.total} (ok=${retried.ok}) Purged=${purged}`);

    return {
      retried:     retried.total,
      retriedOk:   retried.ok,
      purgedLocal: purged,
    };
  }

  /**
   * Fase 1: intenta subir al Drive todos los vouchers con storage_provider='local'.
   *
   * Incluye:
   *  - Vouchers nuevos (attempts=0, sin error)
   *  - Vouchers con error pero attempts < MAX (reintento)
   *
   * Excluye los que excedieron MAX_RETRY_ATTEMPTS (errores permanentes).
   */
  private async retryPendingUploads(): Promise<{ total: number; ok: number }> {
    const vouchers = await this.voucherRepo
      .createQueryBuilder('v')
      .where('v.storage_provider = :p', { p: 'local' })
      .andWhere('v.filepath IS NOT NULL')
      .andWhere('v.gateway_attempts < :max', { max: HK_MAX_RETRY_ATTEMPTS })
      .orderBy('v.created_at', 'ASC')
      .limit(HK_BATCH_SIZE)
      .getMany();

    if (vouchers.length === 0) return { total: 0, ok: 0 };

    let ok = 0;
    for (const voucher of vouchers) {
      const payment = await this.repo.findOne({ where: { id: voucher.idPago } });
      if (!payment) continue;

      await this.tryUploadToGateway(voucher, payment);

      // Recargar para ver si quedó en google_drive
      const updated = await this.voucherRepo.findOne({ where: { id: voucher.id } });
      if (updated?.storageProvider === 'google_drive') ok++;
    }

    return { total: vouchers.length, ok };
  }

  /**
   * Fase 2: borra del filesystem los archivos cuya retención local expiró.
   *
   * Solo borra archivos físicos. La fila en payment_vouchers se mantiene
   * (para histórico) con filepath=NULL.
   */
  private async purgeLocalFiles(): Promise<number> {
    const now = new Date();

    const vouchers = await this.voucherRepo
      .createQueryBuilder('v')
      .where('v.storage_provider = :p', { p: 'google_drive' })
      .andWhere('v.filepath IS NOT NULL')
      .andWhere('v.local_purgeable_at IS NOT NULL')
      .andWhere('v.local_purgeable_at < :now', { now })
      .limit(HK_BATCH_SIZE)
      .getMany();

    let purged = 0;
    for (const voucher of vouchers) {
      if (!voucher.filepath) continue;
      try {
        if (fs.existsSync(voucher.filepath)) {
          fs.unlinkSync(voucher.filepath);
        }
        voucher.filepath = null;
        await this.voucherRepo.save(voucher);
        purged++;
      } catch (err: any) {
        this.logger.warn(`No se pudo purgar ${voucher.filepath}: ${err.message}`);
      }
    }

    return purged;
  }

  // ════════════════════════════════════════════════════════════
  //  Resto: idéntico al original
  // ════════════════════════════════════════════════════════════

  async getPeriodSummary(idEdificio: string, mes: number, anio: number) {
    const todosLosServicios = await this.serviceRepo.find({ where: { idEdificio } });
    const serviciosPorId: Record<string, { activo: boolean; nombre: string; tipo: string }> = {};
    for (const s of todosLosServicios) {
      serviciosPorId[s.id] = { activo: s.activo, nombre: s.nombreServicio, tipo: s.tipo };
    }

    const fees = await this.feeRepo
      .createQueryBuilder('f')
      .leftJoinAndSelect('f.departamento', 'd')
      .leftJoin('d.edificio', 'e')
      .where('e.id = :idEdificio', { idEdificio })
      .andWhere('f.periodo_mes = :mes', { mes })
      .andWhere('f.periodo_anio = :anio', { anio })
      .orderBy('d.nrDepartamento', 'ASC')
      .getMany();

    const result = await Promise.all(fees.map(async (fee) => {
      const pagos = await this.repo.find({ where: { idCuota: fee.id } });
      const totalPagado = pagos.reduce((s, p) => s + parseFloat(p.montoCancelado as any), 0);

      const medicionData = await this.feeRepo.query(
        `SELECT md.id, md.id_meter_image, md.m3_consumido, mi.filename, mi.ocr_raw_value, mi.ocr_confidence,
                rs.id_servicio, s.tipo AS servicio_tipo
         FROM mediciones_departamento md
         INNER JOIN recibos_servicio rs ON rs.id = md.id_recibo
         INNER JOIN servicios s ON s.id = rs.id_servicio
         LEFT JOIN meter_images mi ON mi.id = md.id_meter_image
         WHERE md.id_departamento = $1
           AND rs.periodo_mes = $2
           AND rs.periodo_anio = $3`,
        [fee.idDepartamento, fee.periodoMes, fee.periodoAnio],
      );

      const montosServicios: Record<string, MontoServicioItem> = fee.montosServicios || {};
      const desglose = Object.entries(montosServicios).map(([key, item]) => {
        const svcInfo = serviciosPorId[key];
        return {
          key,
          tipo:    item.tipo,
          label:   item.nombre,
          monto:   item.monto,
          activo:  svcInfo ? svcInfo.activo : true,
        };
      }).filter(d => d.monto !== 0);

      // Adjuntar el voucher principal (último) por cada pago para preview
      const pagosConVoucher = await Promise.all(pagos.map(async (p) => {
        const vouchers = await this.voucherRepo.find({
          where: { idPago: p.id },
          order: { createdAt: 'DESC' },
          take: 1,
        });
        return {
          id:             p.id,
          monto:          parseFloat(p.montoCancelado as any),
          montoCancelado: parseFloat(p.montoCancelado as any),
          tipoPago:       p.tipoPago,
          banco:          p.banco,
          fechaPago:      p.fechaPago,
          referencia:     p.referencia,
          comprobanteUrl: p.comprobanteUrl,
          estadoPago:     p.estadoPago,
          aprobadoPor:    p.aprobadoPor,
          // Nuevo: voucher principal (para abrir en el aprobador)
          voucherId:      vouchers[0]?.id || null,
        };
      }));

      return {
        feeId:              fee.id,
        depto:              fee.departamento?.nrDepartamento,
        idDepartamento:     fee.idDepartamento,
        montosServicios,
        desglose,
        montoTotal:         parseFloat(fee.montoTotal as any) || 0,
        ajuste:             parseFloat(fee.ajusteMesAnterior as any) || 0,
        statusPago:         fee.statusPago,
        mensajeEnviado:     fee.mensajeEnviado,
        fechaMensajeEnviado: fee.fechaMensajeEnviado,
        totalPagado,
        saldo: Math.max(0, (parseFloat(fee.montoTotal as any) || 0) - totalPagado),
        pagos: pagosConVoucher,
        medicionPorServicio: medicionData.reduce((acc: any, md: any) => {
          acc[md.id_servicio] = {
            idMeterImage: md.id_meter_image,
            ocrValor:     md.ocr_raw_value,
            confianza:    md.ocr_confidence,
            m3Consumido:  parseFloat(md.m3_consumido) || 0,
            tipo:         md.servicio_tipo,
          };
          return acc;
        }, {}),
        medicion: medicionData.find((md: any) => md.servicio_tipo === 'agua') ? {
          idMeterImage: medicionData.find((md: any) => md.servicio_tipo === 'agua').id_meter_image,
          ocrValor:     medicionData.find((md: any) => md.servicio_tipo === 'agua').ocr_raw_value,
          confianza:    medicionData.find((md: any) => md.servicio_tipo === 'agua').ocr_confidence,
          m3Consumido:  parseFloat(medicionData.find((md: any) => md.servicio_tipo === 'agua').m3_consumido) || 0,
        } : null,
        fechaVencimiento: fee.fechaVencimiento,
      };
    }));

    const totalDeptos      = result.length;
    const pagados          = result.filter(r => r.statusPago === 'pagado').length;
    const mensajesEnviados = result.filter(r => r.mensajeEnviado).length;
    const montoPendiente   = result.reduce((s, r) => s + r.saldo, 0);

    return {
      resumen: {
        totalDeptos,
        pagados,
        pendientes:        totalDeptos - pagados,
        mensajesEnviados,
        montoPendiente:    parseFloat(montoPendiente.toFixed(2)),
        periodoCerrado:    totalDeptos > 0 && pagados === totalDeptos,
      },
      serviciosEdificio: todosLosServicios.map(s => ({
        id: s.id, tipo: s.tipo, nombre: s.nombreServicio, activo: s.activo,
        modoCalculo: s.modoCalculo, unidadMedida: s.unidadMedida,
      })),
      departamentos: result,
    };
  }

  // ── Consultas básicas ──

  findAll(idCuota?: string, idPropietario?: string) {
    const where: any = {};
    if (idCuota)       where.idCuota = idCuota;
    if (idPropietario) where.idPropietario = idPropietario;
    return this.repo.find({ where, relations: ['cuota'], order: { createdAt: 'DESC' } });
  }

  async findOne(id: string) {
    const p = await this.repo.findOne({ where: { id }, relations: ['cuota'] });
    if (!p) throw new NotFoundException('Pago no encontrado');
    return p;
  }

  async getPendingByBuilding(idEdificio: string, mes: number, anio: number) {
    return this.repo
      .createQueryBuilder('p')
      .leftJoin('p.cuota', 'f')
      .leftJoin('f.departamento', 'd')
      .leftJoin('d.edificio', 'e')
      .where('e.id = :idEdificio', { idEdificio })
      .andWhere('f.periodoMes = :mes', { mes })
      .andWhere('f.periodoAnio = :anio', { anio })
      .andWhere("f.statusPago IN ('pendiente','parcial','vencido')")
      .select([
        'd.nrDepartamento AS depto',
        'f.id AS cuota_id',
        'f.montoTotal AS cuota_total',
        'f.mensajeEnviado AS mensaje_enviado',
        'SUM(p.montoCancelado) AS total_pagado',
      ])
      .groupBy('d.nrDepartamento, f.id, f.montoTotal, f.mensajeEnviado')
      .orderBy('d.nrDepartamento', 'ASC')
      .getRawMany();
  }

  async createPropietario(dto: CreatePagoAutoDto, idPropietario: string): Promise<Payment> {
    const fee = await this.feesService.findOne(dto.idCuota);
    if (fee.statusPago === 'pagado') {
      throw new BadRequestException('Esta cuota ya está completamente pagada.');
    }

    const payment = await this.repo.save(this.repo.create({
      ...dto,
      idPropietario,
      estadoPago: 'pendiente_aprobacion',
    }));

    return payment;
  }

  async approvePayment(paymentId: string, supervisorId: string): Promise<Payment> {
    const payment = await this.findOne(paymentId);
    if (payment.estadoPago === 'aprobado') {
      throw new BadRequestException('Este pago ya fue aprobado.');
    }

    payment.estadoPago       = 'aprobado';
    payment.aprobadoPor      = supervisorId;
    payment.fechaAprobacion  = new Date();
    await this.repo.save(payment);

    const allPayments = await this.repo.find({
      where: { idCuota: payment.idCuota, estadoPago: 'aprobado' },
    });
    const totalPagado = allPayments.reduce((s, p) => s + parseFloat(p.montoCancelado as any), 0);
    const fee         = await this.feesService.findOne(payment.idCuota);
    const montoTotal  = parseFloat(fee.montoTotal as any);

    const newStatus = totalPagado >= montoTotal ? 'pagado'
      : totalPagado > 0 ? 'parcial'
      : 'pendiente';

    await this.feesService.updateStatus(payment.idCuota, newStatus);
    return payment;
  }

  async rejectPayment(paymentId: string, supervisorId: string): Promise<Payment> {
    const payment = await this.findOne(paymentId);
    payment.estadoPago      = 'rechazado';
    payment.aprobadoPor     = supervisorId;
    payment.fechaAprobacion = new Date();
    return this.repo.save(payment);
  }

  async getPendingApproval(): Promise<any[]> {
    const pagos = await this.repo.find({
      where: { estadoPago: 'pendiente_aprobacion' },
      relations: ['cuota', 'cuota.departamento'],
      order: { createdAt: 'ASC' },
    });
    // Adjuntar voucher principal a cada pago pendiente
    return Promise.all(pagos.map(async (p) => {
      const vouchers = await this.voucherRepo.find({
        where: { idPago: p.id },
        order: { createdAt: 'DESC' },
        take: 1,
      });
      return {
        ...p,
        voucherId: vouchers[0]?.id || null,
      };
    }));
  }
}
