import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { GastoExtra } from './gasto-extra.entity';
import { PagoGasto } from './pago-gasto.entity';
import { Department } from '../departments/department.entity';
import { CreateGastoDto, UpdateGastoDto, CreatePagoGastoDto } from './gastos.dto';

@Injectable()
export class GastosService {
  private readonly logger = new Logger(GastosService.name);

  constructor(
    @InjectRepository(GastoExtra)
    private readonly gastoRepo: Repository<GastoExtra>,
    @InjectRepository(PagoGasto)
    private readonly pagoRepo: Repository<PagoGasto>,
    @InjectRepository(Department)
    private readonly deptRepo: Repository<Department>,
  ) {}

  // ── GASTOS ────────────────────────────────────────────────────

  async findAll(idEdificio: string, estado?: string): Promise<any[]> {
    const qb = this.gastoRepo
      .createQueryBuilder('g')
      .leftJoin('pagos_gastos_extras', 'p', 'p.id_gasto_extra = g.id')
      .where('g.id_edificio = :idEdificio', { idEdificio })
      .select([
        'g.id                      AS id',
        'g.nombre                  AS nombre',
        'g.descripcion             AS descripcion',
        'g.fecha_inicio            AS "fechaInicio"',
        'g.fecha_fin               AS "fechaFin"',
        'g.lista_departamentos     AS "listaDepartamentos"',
        'g.estado                  AS estado',
        'g.monto_gasto             AS "montoGasto"',
        'g.monto_por_depto         AS "montoPorDepto"',
        'g.id_edificio             AS "idEdificio"',
        'g.created_at              AS "createdAt"',
        'COUNT(p.id)               AS "totalPagos"',
        'COALESCE(SUM(p.monto), 0) AS "montoCobrado"',
      ])
      .groupBy('g.id')
      .orderBy('g.created_at', 'DESC');

    if (estado) qb.andWhere('g.estado = :estado', { estado });

    const rows = await qb.getRawMany();
    return rows.map(r => ({
      ...r,
      montoGasto:    parseFloat(r.montoGasto)    || 0,
      montoPorDepto: parseFloat(r.montoPorDepto) || 0,
      montoCobrado:  parseFloat(r.montoCobrado)  || 0,
      totalPagos:    parseInt(r.totalPagos)      || 0,
    }));
  }

  async findOne(id: string): Promise<any> {
    const gasto = await this.gastoRepo.findOne({
      where: { id },
      relations: ['edificio'],
    });
    if (!gasto) throw new NotFoundException('Gasto no encontrado');

    const deptos = await this._getDeptosConEstado(gasto);

    const pagos = await this.pagoRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.departamento', 'dp')
      .where('p.id_gasto_extra = :id', { id })
      .orderBy('p.created_at', 'DESC')
      .getMany();

    const montoCobrado   = pagos.reduce((s, p) => s + parseFloat(p.monto as any), 0);
    const montoPendiente = Math.max(0, parseFloat(gasto.montoGasto as any) - montoCobrado);

    return {
      ...gasto,
      deptos,
      pagos,
      resumen: {
        totalDeptos:    deptos.length,
        deptosPagados:  deptos.filter((d: any) => d.pagado).length,
        montoCobrado:   parseFloat(montoCobrado.toFixed(2)),
        montoPendiente: parseFloat(montoPendiente.toFixed(2)),
      },
    };
  }

  async create(dto: CreateGastoDto): Promise<GastoExtra> {
    this.logger.log(`[create] dto recibido: ${JSON.stringify(dto)}`);
    // Buscar deptos activos del edificio con query builder (evita cast issues)
    const todosDeptos = await this.deptRepo
      .createQueryBuilder('d')
      .where('d.id_edificio = :idEdificio', { idEdificio: dto.idEdificio })
      .andWhere('d.status = :status', { status: 'activo' })
      .getMany();

    this.logger.log(`[create] deptos activos encontrados: ${todosDeptos.length}`);
    if (!todosDeptos.length)
      throw new BadRequestException('No hay departamentos activos en este edificio');

    const listaIds = dto.listaDepartamentos?.length
      ? dto.listaDepartamentos
      : todosDeptos.map(d => d.id);

    const nroDeptos     = listaIds.length;
    const montoTotal    = parseFloat(String(dto.montoGasto));
    const montoPorDepto = parseFloat((montoTotal / nroDeptos).toFixed(2));

    this.logger.log(`[create] listaIds: ${JSON.stringify(listaIds)}, montoPorDepto: ${montoPorDepto}`);
    const gasto = this.gastoRepo.create({
      idEdificio:         dto.idEdificio,
      nombre:             dto.nombre.trim(),
      descripcion:        dto.descripcion?.trim() || null,
      fechaInicio:        dto.fechaInicio,
      fechaFin:           dto.fechaFin || null,
      listaDepartamentos: listaIds,
      montoGasto:         montoTotal,
      montoPorDepto,
      estado:             'activo',
    });

    this.logger.log(`[create] guardando gasto en BD...`);
    const saved = await this.gastoRepo.save(gasto);
    this.logger.log(`[create] gasto guardado id=${saved.id}`);
    return saved;
  }

  async update(id: string, dto: UpdateGastoDto): Promise<GastoExtra> {
    const gasto = await this.gastoRepo.findOne({ where: { id } });
    if (!gasto) throw new NotFoundException('Gasto no encontrado');
    if (gasto.estado === 'anulado')
      throw new BadRequestException('No se puede editar un gasto anulado');

    if (dto.nombre             !== undefined) gasto.nombre             = dto.nombre.trim();
    if (dto.descripcion        !== undefined) gasto.descripcion        = dto.descripcion;
    if (dto.fechaFin           !== undefined) gasto.fechaFin           = dto.fechaFin;
    if (dto.listaDepartamentos !== undefined) gasto.listaDepartamentos = dto.listaDepartamentos;
    if (dto.montoGasto         !== undefined) gasto.montoGasto         = dto.montoGasto;
    if (dto.estado             !== undefined) gasto.estado             = dto.estado;

    // Recalcular montoPorDepto si cambió monto o lista
    if (dto.montoGasto !== undefined || dto.listaDepartamentos !== undefined) {
      const lista = gasto.listaDepartamentos || [];
      const nro   = lista.length || 1;
      gasto.montoPorDepto = parseFloat(
        (parseFloat(String(gasto.montoGasto)) / nro).toFixed(2),
      );
    }

    return this.gastoRepo.save(gasto);
  }

  async cerrar(id: string): Promise<GastoExtra> {
    const gasto = await this.gastoRepo.findOne({ where: { id } });
    if (!gasto) throw new NotFoundException('Gasto no encontrado');
    gasto.estado  = 'cerrado';
    gasto.fechaFin = gasto.fechaFin || new Date().toISOString().split('T')[0];
    return this.gastoRepo.save(gasto);
  }

  async anular(id: string): Promise<GastoExtra> {
    const gasto = await this.gastoRepo.findOne({ where: { id } });
    if (!gasto) throw new NotFoundException('Gasto no encontrado');
    gasto.estado = 'anulado';
    return this.gastoRepo.save(gasto);
  }

  // ── PAGOS ─────────────────────────────────────────────────────

  async getPagos(idGastoExtra: string): Promise<PagoGasto[]> {
    return this.pagoRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.departamento', 'dp')
      .where('p.id_gasto_extra = :idGastoExtra', { idGastoExtra })
      .orderBy('p.fecha_pago', 'DESC')
      .getMany();
  }

  async registrarPago(dto: CreatePagoGastoDto, comprobanteUrl?: string): Promise<PagoGasto> {
    const gasto = await this.gastoRepo.findOne({ where: { id: dto.idGastoExtra } });
    if (!gasto) throw new NotFoundException('Gasto no encontrado');
    if (gasto.estado === 'anulado')
      throw new BadRequestException('El gasto está anulado');

    // Verificar que el depto pertenece a la lista
    if (
      gasto.listaDepartamentos?.length &&
      !gasto.listaDepartamentos.includes(dto.idDepartamento)
    ) {
      throw new BadRequestException('El departamento no está incluido en este gasto');
    }

    const pago = this.pagoRepo.create({
      idGastoExtra:   dto.idGastoExtra,
      idDepartamento: dto.idDepartamento,
      fechaPago:      dto.fechaPago,
      monto:          dto.monto,
      tipoPago:       dto.tipoPago,
      banco:          dto.banco || null,
      referencia:     dto.referencia || null,
      observacion:    dto.observacion || null,
      comprobanteUrl: comprobanteUrl || dto.comprobanteUrl || null,
    });

    return this.pagoRepo.save(pago);
  }

  async deletePago(id: string): Promise<{ deleted: boolean }> {
    const pago = await this.pagoRepo.findOne({ where: { id } });
    if (!pago) throw new NotFoundException('Pago no encontrado');
    await this.pagoRepo.remove(pago);
    return { deleted: true };
  }

  async updatePagoComprobante(pagoId: string, comprobanteUrl: string) {
  await this.pagoRepo.update(pagoId, { comprobanteUrl });
  return this.pagoRepo.findOne({ where: { id: pagoId } });
}
  // ── Helper privado ─────────────────────────────────────────────

  private async _getDeptosConEstado(gasto: GastoExtra): Promise<any[]> {
    const listaIds = gasto.listaDepartamentos || [];
    if (!listaIds.length) return [];

    const deptos = await this.deptRepo
      .createQueryBuilder('d')
      .where('d.id IN (:...ids)', { ids: listaIds })
      .orderBy('d.nr_departamento', 'ASC')
      .getMany();

    const pagos = await this.pagoRepo
      .createQueryBuilder('p')
      .where('p.id_gasto_extra = :id', { id: gasto.id })
      .getMany();

    const montoPorDepto = parseFloat(String(gasto.montoPorDepto)) || 0;

    return deptos.map(d => {
      const pagosDepto  = pagos.filter(p => p.idDepartamento === d.id);
      const totalPagado = pagosDepto.reduce((s, p) => s + parseFloat(String(p.monto)), 0);
      const saldo       = Math.max(0, montoPorDepto - totalPagado);
      return {
        id:             d.id,
        nrDepartamento: d.nrDepartamento,
        montoPorDepto,
        totalPagado:    parseFloat(totalPagado.toFixed(2)),
        saldo:          parseFloat(saldo.toFixed(2)),
        pagado:         saldo <= 0,
        pagos:          pagosDepto,
      };
    });
  }
}
