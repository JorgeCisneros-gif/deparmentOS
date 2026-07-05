// src/reports/analytics/mediciones-analytics.service.ts
import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

/**
 * Datos analíticos de mediciones para un departamento.
 *
 * Orientados a análisis de comportamiento (¿por qué consume más o menos
 * de lo normal?), no a totales acumulados (que no aportan al admin).
 */
export interface MedicionesAnalytics {
  // KPI 1: último consumo + comparación con promedio histórico del depto
  ultimoConsumoM3:    number | null;
  ultimoPeriodo:      { mes: number; anio: number } | null;
  variacionVsPromedio: number | null;    // % (puede ser negativo)

  // KPI 2: tendencia 6 meses (sparkline)
  tendencia: {
    valores: number[];                  // últimos 6 períodos (más antiguo primero)
    direccion: 'asc' | 'desc' | 'estable' | null;
  };

  // KPI 3: mayor variación detectada
  mayorVariacion: {
    porcentaje: number;                  // ej: +47 o -22
    periodo: { mes: number; anio: number };
  } | null;

  // KPI 4: estado actual
  estadoActual: 'normal' | 'sobre_promedio' | 'anomalo' | 'sin_datos';

  // Promedio histórico (lo usamos internamente; útil para mostrar tooltips)
  promedioHistoricoM3: number | null;
  totalPeriodos:       number;
}

/**
 * Item del historial enriquecido con la variación vs el promedio del depto.
 * Lo usamos para la columna "vs promedio" de la tabla.
 */
export interface MedicionHistorialItem {
  anio:               number;
  mes:                number;
  lecturaAnterior:    number;
  lecturaActual:      number;
  m3Consumido:        number;
  montoCalculado:     number;
  precioM3:           number;
  variacionVsPromedio: number | null;   // % redondeado
  esAnomalia:         boolean;          // true si |variacion| > 30%
  // Campos de imagen
  meterImageId:       string | null;
  imagenFilename:     string | null;
  storageProvider:    'local' | 'google_drive' | null;
  imagenExternalUrl:  string | null;
}

@Injectable()
export class MedicionesAnalyticsService {
  // Umbral para marcar un período como anómalo (|variación| > 30%)
  private readonly UMBRAL_ANOMALIA = 30;

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /**
   * Devuelve los KPIs y el historial enriquecido para un departamento.
   *
   * El cálculo se hace en SQL para eficiencia (todas las stats en un solo query).
   */
  async getAnalyticsAndHistory(
    idDepartamento: string,
    tipoServicio: string = 'agua',
    maxMeses: number = 12,
  ): Promise<{
    analytics: MedicionesAnalytics;
    historial: MedicionHistorialItem[];
  }> {
    const desde = new Date();
    desde.setMonth(desde.getMonth() - maxMeses);
    const desdeAnio = desde.getFullYear();
    const desdeMes  = desde.getMonth() + 1;

    // Query única que trae todo el historial enriquecido
    const rows = await this.dataSource.query(
      `
      SELECT
        rec.periodo_anio              AS anio,
        rec.periodo_mes               AS mes,
        r.lectura_anterior            AS "lecturaAnterior",
        r.lectura_actual              AS "lecturaActual",
        r.m3_consumido                AS "m3Consumido",
        r.monto_calculado             AS "montoCalculado",
        rec.precio_m3                 AS "precioM3",
        mi.id                         AS "meterImageId",
        mi.filename                   AS "imagenFilename",
        mi.storage_provider           AS "storageProvider",
        mi.external_url               AS "imagenExternalUrl"
      FROM mediciones_departamento r
      LEFT JOIN recibos_servicio rec ON rec.id = r.id_recibo
      LEFT JOIN servicios svc        ON svc.id = rec.id_servicio
      LEFT JOIN meter_images mi      ON mi.id = r.id_meter_image::uuid
      WHERE r.id_departamento = $1
        AND svc.tipo = $2
        AND (rec.periodo_anio > $3
             OR (rec.periodo_anio = $3 AND rec.periodo_mes >= $4))
      ORDER BY rec.periodo_anio DESC, rec.periodo_mes DESC
      LIMIT $5
      `,
      [idDepartamento, tipoServicio, desdeAnio, desdeMes, maxMeses],
    );

    const totalPeriodos = rows.length;

    if (totalPeriodos === 0) {
      return {
        analytics: this.emptyAnalytics(),
        historial: [],
      };
    }

    // Promedio histórico (solo períodos con consumo > 0 para evitar sesgo)
    const consumosValidos = rows
      .map((r: any) => parseFloat(r.m3Consumido))
      .filter((v: number) => !isNaN(v) && v > 0);

    const promedio = consumosValidos.length > 0
      ? consumosValidos.reduce((s: number, v: number) => s + v, 0) / consumosValidos.length
      : null;

    // Enriquecemos cada fila con su variación
    const historial: MedicionHistorialItem[] = rows.map((r: any) => {
      const m3 = parseFloat(r.m3Consumido) || 0;
      let variacion: number | null = null;
      if (promedio !== null && promedio > 0) {
        variacion = Math.round(((m3 - promedio) / promedio) * 100);
      }
      return {
        anio:               parseInt(r.anio),
        mes:                parseInt(r.mes),
        lecturaAnterior:    parseFloat(r.lecturaAnterior) || 0,
        lecturaActual:      parseFloat(r.lecturaActual) || 0,
        m3Consumido:        m3,
        montoCalculado:     parseFloat(r.montoCalculado) || 0,
        precioM3:           parseFloat(r.precioM3) || 0,
        variacionVsPromedio: variacion,
        esAnomalia:         variacion !== null && Math.abs(variacion) > this.UMBRAL_ANOMALIA,
        meterImageId:       r.meterImageId,
        imagenFilename:     r.imagenFilename,
        storageProvider:    r.storageProvider,
        imagenExternalUrl:  r.imagenExternalUrl,
      };
    });

    // KPI 1: último consumo
    const ultimo = historial[0];

    // KPI 2: tendencia 6 meses (más antiguo primero)
    const ultimos6 = historial.slice(0, 6).reverse();
    const valoresTendencia = ultimos6.map((h) => h.m3Consumido);
    const direccion = this.calcularDireccionTendencia(valoresTendencia);

    // KPI 3: mayor variación absoluta
    const conVariacion = historial.filter((h) => h.variacionVsPromedio !== null);
    let mayorVariacion: MedicionesAnalytics['mayorVariacion'] = null;
    if (conVariacion.length > 0) {
      const max = conVariacion.reduce((m, h) =>
        Math.abs(h.variacionVsPromedio!) > Math.abs(m.variacionVsPromedio!) ? h : m,
      conVariacion[0]);
      mayorVariacion = {
        porcentaje: max.variacionVsPromedio!,
        periodo: { mes: max.mes, anio: max.anio },
      };
    }

    // KPI 4: estado actual
    const estado = this.calcularEstadoActual(ultimo?.variacionVsPromedio ?? null);

    const analytics: MedicionesAnalytics = {
      ultimoConsumoM3:    ultimo?.m3Consumido ?? null,
      ultimoPeriodo:      ultimo ? { mes: ultimo.mes, anio: ultimo.anio } : null,
      variacionVsPromedio: ultimo?.variacionVsPromedio ?? null,
      tendencia: {
        valores: valoresTendencia.map((v) => Math.round(v * 1000) / 1000),
        direccion,
      },
      mayorVariacion,
      estadoActual: estado,
      promedioHistoricoM3: promedio !== null ? Math.round(promedio * 1000) / 1000 : null,
      totalPeriodos,
    };

    return { analytics, historial };
  }

  // ── Helpers ──

  private calcularDireccionTendencia(
    valores: number[],
  ): 'asc' | 'desc' | 'estable' | null {
    if (valores.length < 3) return null;
    // Comparamos promedio de la primera mitad vs la segunda mitad
    const mid = Math.floor(valores.length / 2);
    const primera = valores.slice(0, mid);
    const segunda = valores.slice(mid);
    const avg1 = primera.reduce((s, v) => s + v, 0) / primera.length;
    const avg2 = segunda.reduce((s, v) => s + v, 0) / segunda.length;
    if (avg1 === 0) return 'estable';
    const cambio = ((avg2 - avg1) / avg1) * 100;
    if (cambio > 10)  return 'asc';
    if (cambio < -10) return 'desc';
    return 'estable';
  }

  private calcularEstadoActual(
    variacion: number | null,
  ): MedicionesAnalytics['estadoActual'] {
    if (variacion === null) return 'sin_datos';
    const abs = Math.abs(variacion);
    if (abs <= 20) return 'normal';
    if (abs <= this.UMBRAL_ANOMALIA) return 'sobre_promedio';
    return 'anomalo';
  }

  private emptyAnalytics(): MedicionesAnalytics {
    return {
      ultimoConsumoM3:     null,
      ultimoPeriodo:       null,
      variacionVsPromedio: null,
      tendencia:           { valores: [], direccion: null },
      mayorVariacion:      null,
      estadoActual:        'sin_datos',
      promedioHistoricoM3: null,
      totalPeriodos:       0,
    };
  }
}
