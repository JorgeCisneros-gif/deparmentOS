// src/receipts/receipts.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Receipt } from './receipt.entity';
import { CreateReceiptDto, UpdateReceiptDto } from './receipts.dto';
import { Service, TipoServicio } from '../services/service.entity';
import { Building } from '../buildings/building.entity';

export const INTERNET_MONTO_DEFAULT = 30.00;

@Injectable()
export class ReceiptsService {
  constructor(
    @InjectRepository(Receipt)
    private readonly repo: Repository<Receipt>,
    @InjectRepository(Service)
    private readonly serviceRepo: Repository<Service>,
    @InjectRepository(Building)
    private readonly buildingRepo: Repository<Building>,
  ) {}

  // ── Crear recibo ──────────────────────────────────────────────

  async create(dto: CreateReceiptDto): Promise<Receipt> {
    const servicio = await this.serviceRepo.findOne({ where: { id: dto.idServicio } });
    if (!servicio) throw new NotFoundException('Servicio no encontrado');

    if (servicio.tipo === TipoServicio.AGUA) {
      // Para modo ajustado no se requieren lecturas de medidor general —
      // el ajuste se calcula desde las mediciones individuales de deptos
      const esAjustado = servicio.modoCalculo === 'por_consumo_ajustado';
      if (!esAjustado && (dto.m3LecturaActual == null || dto.m3LecturaAnterior == null)) {
        throw new BadRequestException('Para AGUA se requieren m3LecturaActual y m3LecturaAnterior');
      }
      if (!dto.montoTotalFactura || dto.montoTotalFactura <= 0) {
        throw new BadRequestException('Para AGUA se requiere el monto total de la factura');
      }
    }

    if ([TipoServicio.LUZ, 'limpieza', 'mantenimiento', 'otro'].includes(servicio.tipo)) {
      if (!dto.montoTotalFactura || dto.montoTotalFactura <= 0) {
        throw new BadRequestException(`Para ${servicio.tipo.toUpperCase()} se requiere el monto total`);
      }
    }

    if (servicio.tipo === TipoServicio.INTERNET) {
      if (!dto.montoTotalFactura || dto.montoTotalFactura <= 0) {
        dto.montoTotalFactura = INTERNET_MONTO_DEFAULT;
      }
    }

    return this.repo.save(this.repo.create(dto));
  }

  // ── Listar recibos ────────────────────────────────────────────

  findAll(idServicio?: string, anio?: number, mes?: number) {
    const qb = this.repo.createQueryBuilder('r')
      .leftJoinAndSelect('r.servicio', 's')
      .orderBy('r.periodoAnio', 'DESC')
      .addOrderBy('r.periodoMes', 'DESC');
    if (idServicio) qb.andWhere('r.idServicio = :idServicio', { idServicio });
    if (anio) qb.andWhere('r.periodoAnio = :anio', { anio });
    if (mes) qb.andWhere('r.periodoMes = :mes', { mes });
    return qb.getMany();
  }

  async findOne(id: string) {
    const r = await this.repo.findOne({ where: { id }, relations: ['servicio'] });
    if (!r) throw new NotFoundException('Recibo no encontrado');
    return r;
  }

  async update(id: string, dto: UpdateReceiptDto) {
    const r = await this.findOne(id);
    if (r.servicio?.tipo === TipoServicio.INTERNET) {
      if (!dto.montoTotalFactura || dto.montoTotalFactura <= 0) {
        dto.montoTotalFactura = INTERNET_MONTO_DEFAULT;
      }
    }
    Object.assign(r, dto);
    return this.repo.save(r);
  }

  // ── VALIDACIÓN CENTRAL ────────────────────────────────────────
  //
  // Verifica recibos para los servicios habilitados en el edificio
  // según edificio.serviciosActivos (no servicios.activo).

  async validatePeriodReceipts(
    idEdificio: string,
    periodoMes: number,
    periodoAnio: number,
  ): Promise<{
    listo: boolean;
    serviciosFaltantes: string[];
    detalle: Record<string, { cargado: boolean; monto?: number; precioM3?: number }>;
  }> {
    // Cargar edificio para obtener servicios habilitados
    const building = await this.buildingRepo.findOne({ where: { id: idEdificio } });
    const serviciosMap: Record<string, boolean> = building?.serviciosActivos || {};

    // serviciosActivos puede tener UUIDs (nuevo formato) o tipos (formato antiguo)
    // Normalizar: siempre trabajar con tipos de servicio
    const enabledKeys = Object.entries(serviciosMap)
      .filter(([, enabled]) => enabled)
      .map(([key]) => key);

    // Determinar si las keys son UUIDs o tipos
    const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-/.test(s);
    let tiposRequeridos: string[];

    if (enabledKeys.length > 0 && isUuid(enabledKeys[0])) {
      // Nuevo formato: keys son UUIDs → buscar los tipos correspondientes
      const serviciosEdificio = await this.serviceRepo.find({ where: { idEdificio } });
      const idToTipo: Record<string, string> = {};
      serviciosEdificio.forEach(s => { idToTipo[s.id] = s.tipo; });
      tiposRequeridos = enabledKeys
        .map(id => idToTipo[id])
        .filter(Boolean);
    } else {
      // Formato antiguo: keys son tipos directamente
      tiposRequeridos = enabledKeys;
    }

    if (!tiposRequeridos.length) {
      return { listo: true, serviciosFaltantes: [], detalle: {} };
    }

    // Recibos del período
    const recibosDelPeriodo = await this.repo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.servicio', 's')
      .where('s.id_edificio = :idEdificio', { idEdificio })
      .andWhere('r.periodo_mes = :mes', { mes: periodoMes })
      .andWhere('r.periodo_anio = :anio', { anio: periodoAnio })
      .andWhere("r.status != 'anulado'")
      .getMany();

    const recibosPorTipo: Record<string, Receipt> = {};
    for (const r of recibosDelPeriodo) {
      if (r.servicio) recibosPorTipo[r.servicio.tipo] = r;
    }

    const detalle: Record<string, { cargado: boolean; monto?: number; precioM3?: number }> = {};
    const serviciosFaltantes: string[] = [];

    for (const tipo of tiposRequeridos) {
      const recibo = recibosPorTipo[tipo];
      if (recibo) {
        detalle[tipo] = {
          cargado: true,
          monto: parseFloat(recibo.montoTotalFactura as any),
          ...(tipo === TipoServicio.AGUA && { precioM3: parseFloat(recibo.precioM3 as any) }),
        };
      } else {
        detalle[tipo] = { cargado: false };
        serviciosFaltantes.push(tipo);
      }
    }

    return {
      listo: serviciosFaltantes.length === 0,
      serviciosFaltantes,
      detalle,
    };
  }

  // ── Recalcular factor de ajuste desde mediciones reales ──────
  async recalcularFactor(reciboId: string, save = false) {
    const recibo = await this.repo.findOne({
      where: { id: reciboId },
      relations: ['servicio'],
    });
    if (!recibo) throw new NotFoundException('Recibo no encontrado');

    if (recibo.servicio.modoCalculo !== 'por_consumo_ajustado') {
      throw new BadRequestException('Este recibo no es de tipo por_consumo_ajustado');
    }

    const totalUnidades = parseFloat(recibo.totalUnidadesFactura as any);
    if (!totalUnidades || totalUnidades <= 0) {
      throw new BadRequestException('Ingresa primero el total de unidades de la factura');
    }

    // Sumar m³/kWh medidos en todos los departamentos para este período
    const medicionesData = await this.repo.query(
      `SELECT COALESCE(SUM(md.m3_consumido), 0) AS suma_m3
       FROM mediciones_departamento md
       INNER JOIN recibos_servicio rs ON rs.id = md.id_recibo
       WHERE rs.id_servicio = $1
         AND rs.periodo_mes = $2
         AND rs.periodo_anio = $3`,
      [recibo.idServicio, recibo.periodoMes, recibo.periodoAnio],
    );

    const sumaM3 = parseFloat(medicionesData[0]?.suma_m3 || 0);

    if (sumaM3 <= 0) {
      return {
        reciboId,
        totalUnidadesFactura: totalUnidades,
        sumaM3Mediciones: 0,
        factorAjuste: null,
        factorEstado: 'pendiente',
        mensaje: '⏳ Aún no hay mediciones registradas para este período',
      };
    }

    const factor = parseFloat((totalUnidades / sumaM3).toFixed(8));

    if (save) {
      (recibo as any).m3Propios    = sumaM3;
      (recibo as any).factorAjuste = factor;
      (recibo as any).factorEstado = 'calculado';
      await this.repo.save(recibo);
    }

    return {
      reciboId,
      totalUnidadesFactura: totalUnidades,
      sumaM3Mediciones:     sumaM3,
      factorAjuste:         factor,
      factorEstado:         save ? 'calculado' : 'estimado',
      mensaje: save
        ? `✅ Factor guardado: ${factor} (${totalUnidades} / ${sumaM3})`
        : `Factor calculado: ${factor} — presiona guardar para aplicarlo`,
    };
  }
}
