import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CleaningProvider, CleaningArea, CleaningRecord,
} from './cleaning.entities';
import {
  CreateProviderDto, UpdateProviderDto,
  CreateAreaDto, UpdateAreaDto,
  CreateCleaningRecordDto, UpdateCleaningRecordDto,
  ConfirmProviderPaymentDto,
} from './cleaning.dto';

const MESES = [
  '', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Setiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

@Injectable()
export class CleaningService {
  constructor(
    @InjectRepository(CleaningProvider) private readonly providerRepo: Repository<CleaningProvider>,
    @InjectRepository(CleaningArea)     private readonly areaRepo: Repository<CleaningArea>,
    @InjectRepository(CleaningRecord)   private readonly recordRepo: Repository<CleaningRecord>,
  ) {}

  // ── PROVEEDORES ───────────────────────────────────────────────

  createProvider(dto: CreateProviderDto) {
    return this.providerRepo.save(this.providerRepo.create(dto));
  }

  findProviders(idEdificio: string) {
    return this.providerRepo.find({
      where: { idEdificio, activo: true },
      order: { nombre: 'ASC' },
    });
  }

  async findProvider(id: string) {
    const p = await this.providerRepo.findOne({ where: { id } });
    if (!p) throw new NotFoundException('Proveedor no encontrado');
    return p;
  }

  async updateProvider(id: string, dto: UpdateProviderDto) {
    const p = await this.findProvider(id);
    Object.assign(p, dto);
    return this.providerRepo.save(p);
  }

  async deactivateProvider(id: string) {
    const p = await this.findProvider(id);
    p.activo = false;
    return this.providerRepo.save(p);
  }

  // ── AMBIENTES ─────────────────────────────────────────────────

  createArea(dto: CreateAreaDto) {
    return this.areaRepo.save(this.areaRepo.create(dto));
  }

  findAreas(idEdificio: string) {
    return this.areaRepo.find({
      where: { idEdificio, activo: true },
      order: { orden: 'ASC' },
    });
  }

  async findArea(id: string) {
    const a = await this.areaRepo.findOne({ where: { id } });
    if (!a) throw new NotFoundException('Ambiente no encontrado');
    return a;
  }

  async updateArea(id: string, dto: UpdateAreaDto) {
    const a = await this.findArea(id);
    Object.assign(a, dto);
    return this.areaRepo.save(a);
  }

  // ── REGISTROS MENSUALES ───────────────────────────────────────

  async createRecord(dto: CreateCleaningRecordDto): Promise<CleaningRecord> {
    // Verificar que no exista ya un registro para ese período/edificio
    const existing = await this.recordRepo.findOne({
      where: {
        idEdificio: dto.idEdificio,
        periodoMes: dto.periodoMes,
        periodoAnio: dto.periodoAnio,
      },
    });
    if (existing) {
      throw new BadRequestException(
        `Ya existe un registro de limpieza para ${MESES[dto.periodoMes]} ${dto.periodoAnio}. Use PATCH /cleaning/records/${existing.id} para actualizarlo.`,
      );
    }

    const proveedor = await this.findProvider(dto.idProveedor);

    // Calcular costos automáticamente
    const costoBase = parseFloat(proveedor.costoPorDia as any) * dto.diasTrabajados;

    // Sumar costos extra de los ambientes seleccionados
    let costoAmbientes = 0;
    if (dto.ambientesIds?.length) {
      const ambientes = await this.areaRepo
        .createQueryBuilder('a')
        .where('a.id IN (:...ids)', { ids: dto.ambientesIds })
        .getMany();
      costoAmbientes = ambientes.reduce(
        (sum, a) => sum + parseFloat(a.costoExtra as any), 0,
      );
    }

    const montoTotal = costoBase + costoAmbientes;

    return this.recordRepo.save(
      this.recordRepo.create({
        ...dto,
        costoBase,
        costoAmbientes,
        montoTotal,
        detalleDias: dto.detalleDias || [],
        ambientesIds: dto.ambientesIds || [],
      }),
    );
  }

  findRecords(idEdificio: string, anio?: number, mes?: number) {
    const qb = this.recordRepo.createQueryBuilder('r')
      .leftJoinAndSelect('r.proveedor', 'p')
      .where('r.id_edificio = :idEdificio', { idEdificio })
      .orderBy('r.periodoAnio', 'DESC')
      .addOrderBy('r.periodoMes', 'DESC');

    if (anio) qb.andWhere('r.periodo_anio = :anio', { anio });
    if (mes) qb.andWhere('r.periodo_mes = :mes', { mes });
    return qb.getMany();
  }

  async findRecord(id: string) {
    const r = await this.recordRepo.findOne({
      where: { id },
      relations: ['proveedor'],
    });
    if (!r) throw new NotFoundException('Registro de limpieza no encontrado');
    return r;
  }

  async updateRecord(id: string, dto: UpdateCleaningRecordDto): Promise<CleaningRecord> {
    const record = await this.findRecord(id);
    const proveedor = await this.findProvider(record.idProveedor);

    // Recalcular costos si cambiaron días o ambientes
    const diasTrabajados = dto.diasTrabajados ?? record.diasTrabajados;
    const costoBase = parseFloat(proveedor.costoPorDia as any) * diasTrabajados;

    const ambientesIds = dto.ambientesIds ?? record.ambientesIds ?? [];
    let costoAmbientes = 0;
    if (ambientesIds.length) {
      const ambientes = await this.areaRepo
        .createQueryBuilder('a')
        .where('a.id IN (:...ids)', { ids: ambientesIds })
        .getMany();
      costoAmbientes = ambientes.reduce(
        (sum, a) => sum + parseFloat(a.costoExtra as any), 0,
      );
    }

    Object.assign(record, {
      ...dto,
      costoBase,
      costoAmbientes,
      montoTotal: costoBase + costoAmbientes,
    });

    return this.recordRepo.save(record);
  }

  // ── PAGO AL PROVEEDOR ─────────────────────────────────────────

  async confirmProviderPayment(id: string, dto: ConfirmProviderPaymentDto) {
    const record = await this.findRecord(id);
    record.pagoProveedorStatus = 'pagado';
    record.pagoProveedorFecha = dto.fecha;
    record.pagoProveedorRef = dto.referencia;
    return this.recordRepo.save(record);
  }

  // ── MENSAJE DE COBRO A PROPIETARIOS ──────────────────────────
  // Diferente al mensaje de agua/luz/internet:
  // - Se cobra por cuenta del proveedor (no del edificio)
  // - Incluye datos bancarios del proveedor
  // - Detalla los días trabajados y ambientes

  async generateCleaningMessage(
    recordId: string,
    idEdificio: string,
  ): Promise<{
    mensajeTexto: string;
    desglose: object;
    datosPago: object;
    cuotaPorDepto: number;
  }> {
    const record = await this.findRecord(recordId);
    const proveedor = record.proveedor;
    const mes = MESES[record.periodoMes];

    // Obtener ambientes del registro
    let nombreAmbientes: string[] = [];
    if (record.ambientesIds?.length) {
      const ambientes = await this.areaRepo
        .createQueryBuilder('a')
        .where('a.id IN (:...ids)', { ids: record.ambientesIds })
        .orderBy('a.orden', 'ASC')
        .getMany();
      nombreAmbientes = ambientes.map((a) => a.nombre);
    }

    // Obtener nro de deptos activos del edificio para dividir
    const result = await this.recordRepo.query(
      `SELECT COUNT(*) as total FROM departamentos WHERE id_edificio = $1 AND status = 'activo'`,
      [idEdificio],
    );
    const nroDeptos = parseInt(result[0]?.total || '1');
    const cuotaPorDepto = parseFloat(
      (record.montoTotal / nroDeptos).toFixed(2),
    );

    // Armar datos de pago del proveedor
    const datosPago: Record<string, string> = {
      nombre: proveedor.nombre,
      telefono: proveedor.telefono || 'N/A',
    };
    if (proveedor.banco) datosPago.banco = proveedor.banco.toUpperCase();
    if (proveedor.tipoCuenta) datosPago.tipoCuenta = proveedor.tipoCuenta;
    if (proveedor.nroCuenta) datosPago.nroCuenta = proveedor.nroCuenta;

    // Texto del mensaje
    const ambientesStr = nombreAmbientes.length
      ? nombreAmbientes.join(' y ')
      : 'edificio';

    const mensajeTexto = [
      `🧹 *Cuota de Limpieza — ${mes} ${record.periodoAnio}*`,
      ``,
      `Estimado/a vecino/a, le informamos el cobro mensual de limpieza:`,
      ``,
      `📋 *Detalle:*`,
      `• Días trabajados: ${record.diasTrabajados}`,
      `• Ambientes: ${ambientesStr}`,
      `• Costo por día: S/. ${parseFloat(proveedor.costoPorDia as any).toFixed(2)}`,
      ...(record.costoAmbientes > 0
        ? [`• Costo adicional ambientes: S/. ${parseFloat(record.costoAmbientes as any).toFixed(2)}`]
        : []),
      `• Total mes: S/. ${parseFloat(record.montoTotal as any).toFixed(2)}`,
      `• Deptos: ${nroDeptos}`,
      ``,
      `💰 *Su cuota: S/. ${cuotaPorDepto.toFixed(2)}*`,
      ``,
      `👤 *Realizar pago directamente a:*`,
      `   ${proveedor.nombre}`,
      ...(proveedor.banco
        ? [`   ${proveedor.banco.toUpperCase()} — ${proveedor.tipoCuenta}: ${proveedor.nroCuenta || 'N/A'}`]
        : []),
      ...(proveedor.telefono
        ? [`   Yape/Plin: ${proveedor.telefono}`]
        : []),
      ``,
      `Por favor envíe el comprobante al confirmar. ¡Gracias! 🙏`,
    ].join('\n');

    return {
      mensajeTexto,
      desglose: {
        diasTrabajados: record.diasTrabajados,
        costoPorDia: parseFloat(proveedor.costoPorDia as any),
        costoBase: parseFloat(record.costoBase as any),
        costoAmbientes: parseFloat(record.costoAmbientes as any),
        montoTotal: parseFloat(record.montoTotal as any),
        nroDeptos,
        cuotaPorDepto,
        ambientes: nombreAmbientes,
      },
      datosPago,
      cuotaPorDepto,
    };
  }

  async confirmCleaningMessageSent(recordId: string, supervisorId: string) {
    const record = await this.findRecord(recordId);
    if (record.mensajeEnviado) {
      return { mensaje: 'El mensaje ya había sido confirmado.', record };
    }
    record.mensajeEnviado = true;
    record.fechaMensajeEnviado = new Date();
    record.mensajeEnviadoPor = supervisorId;
    await this.recordRepo.save(record);
    return {
      mensaje: '✅ Mensaje de limpieza confirmado como enviado.',
      record,
    };
  }
}
