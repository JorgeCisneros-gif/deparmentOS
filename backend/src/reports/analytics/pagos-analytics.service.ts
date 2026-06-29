// src/reports/analytics/pagos-analytics.service.ts
import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

/**
 * KPIs de pagos para un edificio y un mes específico.
 *
 * Orientados a la salud financiera mensual:
 * "¿Se recaudó lo necesario para cubrir los servicios del mes?"
 *
 * NO incluye totales acumulados por depto (eso no aporta al admin).
 */
export interface PagosAnalytics {
  // KPI 1: recaudado vs facturado del mes
  recaudado:       number;     // sumar pagos aprobados del mes
  facturado:       number;     // sumar recibos_servicio del mes
  porcentaje:      number;     // (recaudado / facturado) * 100

  // KPI 2: resultado del mes (excedente o déficit)
  resultado:       number;     // recaudado - facturado
  tipoResultado:   'excedente' | 'deficit' | 'exacto';

  // KPI 3: método más usado
  metodoMasUsado: {
    metodo: string;            // 'yape' | 'transferencia' | ...
    cantidad: number;
    porcentaje: number;        // % sobre el total de pagos del mes
  } | null;

  // KPI 4: pagos pendientes de aprobación
  porAprobar:      number;

  // Datos adicionales para contexto
  totalPagos:      number;
  totalServicios:  number;     // cuántos recibos_servicio hay este mes
}

export interface PagoHistorialItem {
  id:              string;
  fechaPago:       string;     // ISO date
  nrDepartamento:  string;
  tipoPago:        string;
  banco:           string | null;
  referencia:      string | null;
  montoCancelado:  number;
  estadoPago:      string;
  observacion:     string | null;
  comprobanteUrl:  string | null;
  // ¿Qué cuota está pagando?
  periodoMes:      number;
  periodoAnio:     number;
  aprobadoPor:     string | null;
}

@Injectable()
export class PagosAnalyticsService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /**
   * Devuelve KPIs e historial de pagos para un edificio en un mes.
   */
  async getAnalyticsAndHistory(
    idEdificio:  string,
    mes:         number,
    anio:        number,
    filtros: {
      metodo?:  string;
      banco?:   string;
      estado?:  string;
    } = {},
  ): Promise<{
    analytics: PagosAnalytics;
    historial: PagoHistorialItem[];
  }> {
    const [recaudadoRow] = await this.dataSource.query(
      `
      SELECT COALESCE(SUM(p.monto_cancelado), 0) AS recaudado
      FROM pagos p
      JOIN cuotas_departamento c ON c.id = p.id_cuota
      JOIN departamentos d        ON d.id = c.id_departamento
      WHERE d.id_edificio = $1
        AND c.periodo_mes = $2
        AND c.periodo_anio = $3
        AND p.estado_pago = 'aprobado'
      `,
      [idEdificio, mes, anio],
    );

    const [facturadoRow] = await this.dataSource.query(
      `
      SELECT 
        COALESCE(SUM(monto_total_factura), 0) AS facturado,
        COUNT(*) AS total_servicios
      FROM recibos_servicio
      WHERE id_servicio IN (
        SELECT id FROM servicios WHERE id_edificio = $1
      )
        AND periodo_mes = $2
        AND periodo_anio = $3
      `,
      [idEdificio, mes, anio],
    );

    const [porAprobarRow] = await this.dataSource.query(
      `
      SELECT COUNT(*) AS por_aprobar
      FROM pagos p
      JOIN cuotas_departamento c ON c.id = p.id_cuota
      JOIN departamentos d        ON d.id = c.id_departamento
      WHERE d.id_edificio = $1
        AND c.periodo_mes = $2
        AND c.periodo_anio = $3
        AND p.estado_pago = 'pendiente_aprobacion'
      `,
      [idEdificio, mes, anio],
    );

    const metodosRows = await this.dataSource.query(
      `
      SELECT p.tipo_pago AS metodo, COUNT(*) AS cantidad
      FROM pagos p
      JOIN cuotas_departamento c ON c.id = p.id_cuota
      JOIN departamentos d        ON d.id = c.id_departamento
      WHERE d.id_edificio = $1
        AND c.periodo_mes = $2
        AND c.periodo_anio = $3
        AND p.estado_pago = 'aprobado'
      GROUP BY p.tipo_pago
      ORDER BY cantidad DESC
      LIMIT 1
      `,
      [idEdificio, mes, anio],
    );

    const [totalPagosRow] = await this.dataSource.query(
      `
      SELECT COUNT(*) AS total
      FROM pagos p
      JOIN cuotas_departamento c ON c.id = p.id_cuota
      JOIN departamentos d        ON d.id = c.id_departamento
      WHERE d.id_edificio = $1
        AND c.periodo_mes = $2
        AND c.periodo_anio = $3
        AND p.estado_pago = 'aprobado'
      `,
      [idEdificio, mes, anio],
    );

    const recaudado     = parseFloat(recaudadoRow.recaudado) || 0;
    const facturado     = parseFloat(facturadoRow.facturado) || 0;
    const totalPagos    = parseInt(totalPagosRow.total) || 0;
    const totalServicios = parseInt(facturadoRow.total_servicios) || 0;
    const porAprobar    = parseInt(porAprobarRow.por_aprobar) || 0;

    let metodoMasUsado: PagosAnalytics['metodoMasUsado'] = null;
    if (metodosRows.length > 0 && totalPagos > 0) {
      const cantidad = parseInt(metodosRows[0].cantidad);
      metodoMasUsado = {
        metodo: metodosRows[0].metodo,
        cantidad,
        porcentaje: Math.round((cantidad / totalPagos) * 100),
      };
    }

    const resultado = recaudado - facturado;
    let tipoResultado: PagosAnalytics['tipoResultado'] = 'exacto';
    if (resultado > 0.01)      tipoResultado = 'excedente';
    else if (resultado < -0.01) tipoResultado = 'deficit';

    const analytics: PagosAnalytics = {
      recaudado:     Math.round(recaudado * 100) / 100,
      facturado:     Math.round(facturado * 100) / 100,
      porcentaje:    facturado > 0 ? Math.round((recaudado / facturado) * 100) : 0,
      resultado:     Math.round(resultado * 100) / 100,
      tipoResultado,
      metodoMasUsado,
      porAprobar,
      totalPagos,
      totalServicios,
    };

    // Historial con filtros
    const where: string[] = [
      'd.id_edificio = $1',
      'c.periodo_mes = $2',
      'c.periodo_anio = $3',
    ];
    const args: any[] = [idEdificio, mes, anio];
    let i = 4;
    if (filtros.metodo) { where.push(`p.tipo_pago = $${i++}`); args.push(filtros.metodo); }
    if (filtros.banco)  { where.push(`p.banco = $${i++}`);     args.push(filtros.banco); }
    if (filtros.estado) { where.push(`p.estado_pago = $${i++}`); args.push(filtros.estado); }

    const rows = await this.dataSource.query(
      `
      SELECT
        p.id,
        p.fecha_pago        AS "fechaPago",
        d.nr_departamento   AS "nrDepartamento",
        p.tipo_pago         AS "tipoPago",
        p.banco,
        p.referencia,
        p.monto_cancelado   AS "montoCancelado",
        p.estado_pago       AS "estadoPago",
        p.observacion,
        p.comprobante_url   AS "comprobanteUrl",
        c.periodo_mes       AS "periodoMes",
        c.periodo_anio      AS "periodoAnio",
        p.aprobado_por      AS "aprobadoPor"
      FROM pagos p
      JOIN cuotas_departamento c ON c.id = p.id_cuota
      JOIN departamentos d        ON d.id = c.id_departamento
      WHERE ${where.join(' AND ')}
      ORDER BY p.fecha_pago DESC, p.created_at DESC
      `,
      args,
    );

    const historial: PagoHistorialItem[] = rows.map((r: any) => ({
      id:              r.id,
      fechaPago:       r.fechaPago,
      nrDepartamento:  r.nrDepartamento,
      tipoPago:        r.tipoPago,
      banco:           r.banco,
      referencia:      r.referencia,
      montoCancelado:  parseFloat(r.montoCancelado) || 0,
      estadoPago:      r.estadoPago,
      observacion:     r.observacion,
      comprobanteUrl:  r.comprobanteUrl,
      periodoMes:      parseInt(r.periodoMes),
      periodoAnio:     parseInt(r.periodoAnio),
      aprobadoPor:     r.aprobadoPor,
    }));

    return { analytics, historial };
  }
}
