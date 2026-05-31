// src/fees/fees.service.ts
import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Alicuota } from '../alicuotas/alicuota.entity';
import { Fee, MontoServicioItem } from './fee.entity';
import { Department } from '../departments/department.entity';
import { Service, ModoCalculo, TipoServicio } from '../services/service.entity';
import { DepartmentsService } from '../departments/departments.service';
import { ReceiptsService } from '../receipts/receipts.service';
import { ReadingsService } from '../readings/readings.service';

export class CalculateFeesDto {
  idEdificio:       string;
  periodoMes:       number;
  periodoAnio:      number;
  fechaVencimiento?: string;
}

@Injectable()
export class FeesService {
  private readonly logger = new Logger(FeesService.name);

  constructor(
    @InjectRepository(Fee)        private readonly repo: Repository<Fee>,
    @InjectRepository(Service)    private readonly serviceRepo: Repository<Service>,
    @InjectRepository(Department) private readonly deptRepo: Repository<Department>,
    @InjectRepository(Alicuota)    private readonly alicuotaRepo: Repository<Alicuota>,
    private readonly departmentsService: DepartmentsService,
    private readonly receiptsService:   ReceiptsService,
    private readonly readingsService:   ReadingsService,
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // CALCULAR CUOTAS DEL PERÍODO
  // ═══════════════════════════════════════════════════════════════

  async calculatePeriod(dto: CalculateFeesDto): Promise<Fee[]> {
    const { idEdificio, periodoMes, periodoAnio, fechaVencimiento } = dto;

    // 1. Departamentos activos
    const deptos      = await this.departmentsService.findAll(idEdificio);
    const activeDeptos = deptos.filter(d => d.status === 'activo');
    if (!activeDeptos.length) {
      throw new BadRequestException('No hay departamentos activos en este edificio');
    }
    const nroDeptos = activeDeptos.length;

    // 2. Servicios activos del edificio
    const servicios = await this.serviceRepo.find({
      where: { idEdificio, activo: true },
      order: { tipo: 'ASC' },
    });

    // 3. Recibos del período indexados por idServicio
    const allReceipts = await this.receiptsService.findAll(undefined, periodoAnio, periodoMes);
    const receiptBySvcId: Record<string, any> = {};
    for (const r of allReceipts) {
      if (servicios.find(s => s.id === r.idServicio)) {
        receiptBySvcId[r.idServicio] = r;
      }
    }

    // 4. Pre-calcular agua común (necesita todos los consumos)
    const svcAgua    = servicios.find(s => s.tipo === TipoServicio.AGUA);
    const reciboAgua = svcAgua ? receiptBySvcId[svcAgua.id] : null;
    let aguaComunPorDepto = 0;

    // Para modo ajustado NO existe agua común — el factor de ajuste
    // ya absorbe la diferencia entre medidor del edificio y suma de deptos.
    // Solo calculamos agua común para por_consumo_m3 (diferencia real entre
    // medidor general y suma de consumos individuales).
    if (svcAgua && reciboAgua && svcAgua.modoCalculo === ModoCalculo.POR_CONSUMO_M3) {
      aguaComunPorDepto = await this.calcularAguaComun(
        reciboAgua, activeDeptos, nroDeptos,
      );
    }

    // 5. Calcular cuota por departamento
    const fees: Fee[] = [];

    for (const depto of activeDeptos) {
      // Construir mapa JSONB dinámico { idServicio: MontoServicioItem }
      const montosServicios: Record<string, MontoServicioItem> = {};
      let montoTotal = 0;

      for (const svc of servicios) {
        const recibo = receiptBySvcId[svc.id];
        if (!recibo) continue;

        const monto = await this.calcularMontoServicio(
          svc, recibo, depto, activeDeptos, nroDeptos,
        );

        if (monto > 0 || svc.tipo === TipoServicio.AGUA) {
          montosServicios[svc.id] = {
            nombre:      svc.nombreServicio,
            tipo:        svc.tipo,
            modoCalculo: svc.modoCalculo,
            monto:       parseFloat(monto.toFixed(2)),
            idServicio:  svc.id,
          };
          montoTotal += monto;
        }
      }

      // Agua común: entrada especial (no tiene idServicio propio)
      if (aguaComunPorDepto > 0) {
        montosServicios['agua_comun'] = {
          nombre:      'Agua áreas comunes',
          tipo:        'agua_comun',
          modoCalculo: 'division_igualitaria',
          monto:       parseFloat(aguaComunPorDepto.toFixed(2)),
        };
        montoTotal += aguaComunPorDepto;
      }

      // Ajuste mes anterior
      const existing = await this.repo.findOne({
        where: { idDepartamento: depto.id, periodoMes, periodoAnio },
      });
      const ajuste = existing ? parseFloat(existing.ajusteMesAnterior as any) || 0 : 0;
      montoTotal += ajuste;

      const feeData = {
        idDepartamento:   depto.id,
        periodoMes,
        periodoAnio,
        montosServicios,
        montoTotal:       parseFloat(montoTotal.toFixed(2)),
        ajusteMesAnterior: ajuste,
        fechaVencimiento,
        detalleJson: {
          calculado_en: new Date().toISOString(),
          nro_deptos:   nroDeptos,
          servicios_incluidos: Object.keys(montosServicios).length,
        },
      };

      if (existing) {
        Object.assign(existing, feeData);
        fees.push(await this.repo.save(existing));
      } else {
        fees.push(await this.repo.save(this.repo.create(feeData)));
      }
    }

    this.logger.log(
      `Cuotas calculadas: ${fees.length} deptos · ${periodoMes}/${periodoAnio}`,
    );
    return fees;
  }

  // ═══════════════════════════════════════════════════════════════
  // CALCULADORES POR modoCalculo
  // ═══════════════════════════════════════════════════════════════

  private async calcularMontoServicio(
    svc: Service, recibo: any, depto: any,
    activeDeptos: any[], nroDeptos: number,
  ): Promise<number> {
    const montoTotal = parseFloat(recibo.montoTotalFactura) || 0;

    switch (svc.modoCalculo) {
      case ModoCalculo.POR_CONSUMO_M3: {
        const readings = await this.readingsService.findAll(recibo.id, depto.id);
        return readings.length > 0
          ? parseFloat(readings[0].montoCalculado as any) || 0
          : 0;
      }
      case ModoCalculo.DIVISION_IGUALITARIA:
        return parseFloat((montoTotal / nroDeptos).toFixed(2));

      case ModoCalculo.PORCENTAJE_ALICUOTA: {
        // Buscar alícuota en la tabla alicuotas_departamento para este período
        const alicuotaData = await this.alicuotaRepo.findOne({
          where: {
            idDepartamento: depto.id,
            idServicio:     svc.id,
            periodoMes:     recibo.periodoMes,
            periodoAnio:    recibo.periodoAnio,
          },
        });
        const porcentaje = alicuotaData ? parseFloat(alicuotaData.porcentaje as any) : 0;
        if (porcentaje <= 0) {
          this.logger.warn(
            `Sin alícuota para depto ${depto.nrDepartamento} · servicio ${svc.nombreServicio} · ${recibo.periodoMes}/${recibo.periodoAnio}`,
          );
          return 0;
        }
        return parseFloat((montoTotal * porcentaje / 100).toFixed(2));
      }
       case 'por_consumo_ajustado': {
        // Obtener medición del departamento
        const readings = await this.readingsService.findAll(recibo.id, depto.id);
        if (!readings.length) return 0;

        const m3 = parseFloat(readings[0].m3Consumido as any) || 0;
        if (m3 <= 0) return 0;

        // Para modo ajustado, precioM3 es null en BD (no tiene lecturas del medidor general).
        // El precio real se obtiene de: montoTotalFactura / totalUnidadesFactura
        const totalUnidades = parseFloat((recibo as any).totalUnidadesFactura as any) || 0;
        const montoFactura  = parseFloat(recibo.montoTotalFactura as any) || 0;
        const precioReal    = totalUnidades > 0 ? montoFactura / totalUnidades : 0;

        if (precioReal <= 0) {
          this.logger.warn(
            `precioReal=0 para recibo ${recibo.id} — ¿falta totalUnidadesFactura?`,
          );
          return 0;
        }

        const factor       = parseFloat((recibo as any).factorAjuste as any) || 1;
        const factorEstado = (recibo as any).factorEstado || 'pendiente';

        // Si factor está pendiente (no calculado aún), advertir pero usarlo igual
        // Factor default es 1.0 si no fue guardado nunca
        if (factorEstado === 'pendiente' && factor === 1) {
          this.logger.warn(
            `Factor de ajuste pendiente para recibo ${recibo.id} — usando factor 1.0 (sin ajuste)`,
          );
        }

        // monto = m3 × (montoFactura / totalUnidades) × factorAjuste
        // Siempre usar el factor guardado, sea cual sea el factorEstado
        return parseFloat((m3 * precioReal * factor).toFixed(2));
      }
 
      default:
        this.logger.warn(`modoCalculo desconocido: ${svc.modoCalculo}`);
        return 0;
    }
  }

  private async calcularAguaComun(
    recibo: any, activeDeptos: any[], nroDeptos: number,
  ): Promise<number> {
    const montoTotalRecibo = parseFloat(recibo.montoTotalFactura) || 0;
    let sumaConsumos = 0;

    for (const d of activeDeptos) {
      const readings = await this.readingsService.findAll(recibo.id, d.id);
      if (readings.length > 0) {
        sumaConsumos += parseFloat(readings[0].montoCalculado as any) || 0;
      }
    }

    const diferencia = montoTotalRecibo - sumaConsumos;
    const comunTotal = Math.max(0, parseFloat(diferencia.toFixed(2)));
    return comunTotal > 0 ? parseFloat((comunTotal / nroDeptos).toFixed(2)) : 0;
  }

  // ═══════════════════════════════════════════════════════════════
  // CONSULTAS
  // ═══════════════════════════════════════════════════════════════

  findAll(idDepartamento?: string, anio?: number, mes?: number, status?: string) {
    const qb = this.repo.createQueryBuilder('f')
      .leftJoinAndSelect('f.departamento', 'd')
      .orderBy('f.periodoAnio', 'DESC')
      .addOrderBy('f.periodoMes', 'DESC')
      .addOrderBy('d.nrDepartamento', 'ASC');

    if (idDepartamento) qb.andWhere('f.idDepartamento = :idDepartamento', { idDepartamento });
    if (anio)   qb.andWhere('f.periodoAnio = :anio', { anio });
    if (mes)    qb.andWhere('f.periodoMes = :mes', { mes });
    if (status) qb.andWhere('f.statusPago = :status', { status });
    return qb.getMany();
  }

  async findOne(id: string) {
    const f = await this.repo.findOne({ where: { id }, relations: ['departamento'] });
    if (!f) throw new NotFoundException('Cuota no encontrada');
    return f;
  }

  async getPendingSummary(idEdificio: string, mes: number, anio: number) {
    return this.repo
      .createQueryBuilder('f')
      .leftJoin('f.departamento', 'd')
      .leftJoin('d.edificio', 'e')
      .where('e.id = :idEdificio', { idEdificio })
      .andWhere('f.periodoMes = :mes', { mes })
      .andWhere('f.periodoAnio = :anio', { anio })
      .andWhere("f.statusPago IN ('pendiente', 'vencido', 'parcial')")
      .select([
        'd.nrDepartamento AS depto',
        'f.montoTotal AS total',
        'f.statusPago AS status',
        'f.fechaVencimiento AS vencimiento',
      ])
      .orderBy('d.nrDepartamento', 'ASC')
      .getRawMany();
  }

  async updateStatus(id: string, status: string) {
    const f = await this.findOne(id);
    f.statusPago = status;
    return this.repo.save(f);
  }

  // ── Fecha de vencimiento del período ──────────────────────────

  async getPeriodVencimiento(idEdificio: string, mes: number, anio: number): Promise<{ fechaVencimiento: string | null; totalCuotas: number }> {
    const row = await this.repo
      .createQueryBuilder('f')
      .innerJoin('f.departamento', 'd')
      .innerJoin('d.edificio', 'e')
      .where('e.id = :idEdificio', { idEdificio })
      .andWhere('f.periodoMes = :mes', { mes })
      .andWhere('f.periodoAnio = :anio', { anio })
      .select(['f.fechaVencimiento', 'f.id'])
      .orderBy('f.createdAt', 'ASC')
      .getOne();

    const count = await this.repo
      .createQueryBuilder('f')
      .innerJoin('f.departamento', 'd')
      .innerJoin('d.edificio', 'e')
      .where('e.id = :idEdificio', { idEdificio })
      .andWhere('f.periodoMes = :mes', { mes })
      .andWhere('f.periodoAnio = :anio', { anio })
      .getCount();

    return {
      fechaVencimiento: row?.fechaVencimiento?.toString()?.split('T')[0] ?? null,
      totalCuotas: count,
    };
  }

  async updatePeriodVencimiento(
    idEdificio: string, mes: number, anio: number, fechaVencimiento: string,
  ): Promise<{ updated: number }> {
    const deptos = await this.deptRepo.find({ where: { idEdificio } as any });
    if (!deptos.length) return { updated: 0 };
    const deptIds = deptos.map(d => d.id);

    const result = await this.repo
      .createQueryBuilder()
      .update()
      .set({ fechaVencimiento })
      .where('idDepartamento IN (:...deptIds)', { deptIds })
      .andWhere('periodoMes = :mes', { mes })
      .andWhere('periodoAnio = :anio', { anio })
      .execute();

    return { updated: result.affected || 0 };
  }
}
