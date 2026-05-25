// src/alicuotas/alicuotas.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Alicuota } from './alicuota.entity';
import { Department } from '../departments/department.entity';

export interface AlicuotaLineDto {
  idDepartamento: string;
  porcentaje:     number;
}

@Injectable()
export class AlicuotasService {
  constructor(
    @InjectRepository(Alicuota)    private readonly repo:  Repository<Alicuota>,
    @InjectRepository(Department)  private readonly dRepo: Repository<Department>,
  ) {}

  // ── Obtener alícuotas de un servicio en un período ─────────────
  // Incluye TODOS los deptos del edificio aunque no tengan alícuota aún,
  // pre-llenando con el último valor registrado como referencia.
  async getForPeriod(idServicio: string, idEdificio: string, mes: number, anio: number) {
    const deptos = await this.dRepo.find({
      where: { idEdificio, status: 'activo' },
      order: { nrDepartamento: 'ASC' },
    });

    // Obtener nombres de propietarios via query directa
    const propietariosData = deptos.length > 0
      ? await this.dRepo.query(
          `SELECT d.id AS depto_id, p.nombre
           FROM departamentos d
           LEFT JOIN propietarios p ON p.id = d.id_propietario
           WHERE d.id = ANY($1)`,
          [deptos.map(d => d.id)],
        )
      : [];
    const propMap: Record<string, string> = {};
    propietariosData.forEach((r: any) => { propMap[r.depto_id] = r.nombre; });

    // Alícuotas del período actual
    const current = await this.repo.find({
      where: { idServicio, periodoMes: mes, periodoAnio: anio },
    });
    const currentMap: Record<string, number> = {};
    current.forEach(a => { currentMap[a.idDepartamento] = parseFloat(a.porcentaje as any); });

    // Última alícuota conocida por depto (para usar como default)
    const lastKnown = await this.repo
      .createQueryBuilder('a')
      .where('a.id_servicio = :idServicio', { idServicio })
      .andWhere('(a.periodo_anio < :anio OR (a.periodo_anio = :anio AND a.periodo_mes < :mes))', { anio, mes })
      .orderBy('a.periodo_anio', 'DESC')
      .addOrderBy('a.periodo_mes', 'DESC')
      .getMany();

    const lastMap: Record<string, number> = {};
    lastKnown.forEach(a => {
      if (!lastMap[a.idDepartamento]) {
        lastMap[a.idDepartamento] = parseFloat(a.porcentaje as any);
      }
    });

    const suma = Object.values(currentMap).reduce((s, v) => s + v, 0);

    return {
      periodoMes:  mes,
      periodoAnio: anio,
      sumaPorcentajes: parseFloat(suma.toFixed(4)),
      completo: Math.abs(suma - 100) < 0.01,
      departamentos: deptos.map(d => ({
        id:              d.id,
        nrDepartamento:  d.nrDepartamento,
        piso:            d.piso,
      propietario:     propMap[d.id] || null,
        porcentaje:      currentMap[d.id] ?? null,           // null = no ingresado aún
        ultimoValor:     lastMap[d.id]    ?? null,           // referencia del período anterior
      })),
    };
  }

  // ── Guardar alícuotas de un período (upsert) ───────────────────
  async saveForPeriod(
    idServicio: string,
    mes: number,
    anio: number,
    lineas: AlicuotaLineDto[],
  ): Promise<{ message: string; suma: number; completo: boolean }> {
    if (!lineas.length) throw new BadRequestException('No se enviaron alícuotas');

    const total = lineas.reduce((s, l) => s + (l.porcentaje || 0), 0);
    if (lineas.some(l => l.porcentaje < 0 || l.porcentaje > 100)) {
      throw new BadRequestException('Cada porcentaje debe estar entre 0 y 100');
    }

    // Upsert cada línea
    for (const linea of lineas) {
      await this.repo
        .createQueryBuilder()
        .insert()
        .into(Alicuota)
        .values({
          idDepartamento: linea.idDepartamento,
          idServicio,
          porcentaje:  linea.porcentaje,
          periodoMes:  mes,
          periodoAnio: anio,
        })
        .orUpdate(['porcentaje'], ['id_departamento', 'id_servicio', 'periodo_mes', 'periodo_anio'])
        .execute();
    }

    const suma = parseFloat(total.toFixed(4));
    const completo = Math.abs(suma - 100) < 0.01;

    return {
      message:  completo ? '✅ Alícuotas guardadas y suman 100%' : `⚠ Alícuotas guardadas. Suma actual: ${suma}%`,
      suma,
      completo,
    };
  }

  // ── Obtener alícuota de un depto en un período (para fees) ─────
  async getPorcentaje(idDepartamento: string, idServicio: string, mes: number, anio: number): Promise<number> {
    const a = await this.repo.findOne({
      where: { idDepartamento, idServicio, periodoMes: mes, periodoAnio: anio },
    });
    return a ? parseFloat(a.porcentaje as any) : 0;
  }
}
