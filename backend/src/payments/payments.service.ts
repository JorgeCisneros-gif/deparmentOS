// src/payments/payments.service.ts
import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from './payment.entity';
import { Fee, MontoServicioItem } from '../fees/fee.entity';
import { Service } from '../services/service.entity';
import { CreatePagoAutoDto, CreatePaymentDto } from './payments.dto';
import { FeesService } from '../fees/fees.service';
import { ImageUploadService } from '../shared/image-upload.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectRepository(Payment) private readonly repo: Repository<Payment>,
    @InjectRepository(Fee)     private readonly feeRepo: Repository<Fee>,
    @InjectRepository(Service) private readonly serviceRepo: Repository<Service>,
    private readonly feesService: FeesService,
    private readonly imageUpload: ImageUploadService,
  ) {}

  // ── Registrar pago ────────────────────────────────────────────

  async create(dto: CreatePaymentDto): Promise<Payment> {
    console.log('DTO recibido:', JSON.stringify(dto, null, 2));
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

  // ── Subir comprobante ─────────────────────────────────────────

  async updateComprobanteUrl(paymentId: string, filepath: string): Promise<Payment> {
    const payment = await this.findOne(paymentId);
    this.imageUpload.deleteIfExists(payment.comprobanteUrl);
    payment.comprobanteUrl = filepath;
    return this.repo.save(payment);
  }

  // ── Resumen del período ───────────────────────────────────────

  async getPeriodSummary(idEdificio: string, mes: number, anio: number) {
    // Servicios del edificio para obtener estado activo/inactivo actual
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

      // Mediciones del período por departamento — todas (no solo agua)
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

      // Construir desglose desde montosServicios JSONB
      // Cada línea incluye el estado actual del servicio (activo/inactivo)
      const montosServicios: Record<string, MontoServicioItem> = fee.montosServicios || {};
      const desglose = Object.entries(montosServicios).map(([key, item]) => {
        // Para entradas especiales (agua_comun, ajuste) el key no es un UUID de servicio
        const svcInfo = serviciosPorId[key];
        return {
          key,
          tipo:    item.tipo,
          label:   item.nombre,
          monto:   item.monto,
          activo:  svcInfo ? svcInfo.activo : true, // agua_comun y ajuste siempre activos
        };
      }).filter(d => d.monto !== 0);

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
        pagos: pagos.map(p => ({
          id:             p.id,
          monto:          parseFloat(p.montoCancelado as any),
          montoCancelado: parseFloat(p.montoCancelado as any),
          tipoPago:       p.tipoPago,
          banco:          p.banco,
          fechaPago:      p.fechaPago,
          referencia:     p.referencia,
          comprobanteUrl: p.comprobanteUrl,
          estadoPago:     p.estadoPago,      // ← necesario para detectar pendiente_aprobacion
          aprobadoPor:    p.aprobadoPor,
        })),
        // Mapa por servicio para gráficos dinámicos en dashboard
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
        // Compatibilidad hacia atrás — primera medición de agua
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

  // ── Consultas básicas ─────────────────────────────────────────

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
// Pago enviado por propietario (queda en pendiente_aprobacion)
async createPropietario(dto: CreatePagoAutoDto, idPropietario: string): Promise<Payment> {
  const fee = await this.feesService.findOne(dto.idCuota);
  if (fee.statusPago === 'pagado') {
    throw new BadRequestException('Esta cuota ya está completamente pagada.');
  }
 
  const payment = await this.repo.save(this.repo.create({
    ...dto,
    idPropietario,
    estadoPago: 'pendiente_aprobacion',   // ← espera confirmación
  }));
 
  // No cambiamos statusPago de la cuota hasta que supervisor apruebe
  return payment;
}
 
// Supervisor aprueba un pago pendiente
async approvePayment(paymentId: string, supervisorId: string): Promise<Payment> {
  const payment = await this.findOne(paymentId);
  if (payment.estadoPago === 'aprobado') {
    throw new BadRequestException('Este pago ya fue aprobado.');
  }
 
  payment.estadoPago       = 'aprobado';
  payment.aprobadoPor      = supervisorId;
  payment.fechaAprobacion  = new Date();
  await this.repo.save(payment);
 
  // Recalcular status de la cuota
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
 
// Rechazar un pago pendiente
async rejectPayment(paymentId: string, supervisorId: string): Promise<Payment> {
  const payment = await this.findOne(paymentId);
  payment.estadoPago      = 'rechazado';
  payment.aprobadoPor     = supervisorId;
  payment.fechaAprobacion = new Date();
  return this.repo.save(payment);
}
 
// Pagos pendientes de aprobación (para el supervisor)
async getPendingApproval(): Promise<Payment[]> {
  return this.repo.find({
    where: { estadoPago: 'pendiente_aprobacion' },
    relations: ['cuota', 'cuota.departamento'],
    order: { createdAt: 'ASC' },
  });
}



}
