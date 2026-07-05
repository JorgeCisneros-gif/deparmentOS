// src/reports/generators/csv.generator.ts
import { Injectable } from '@nestjs/common';
import { MedicionHistorialItem } from '../analytics/mediciones-analytics.service';
import { PagoHistorialItem } from '../analytics/pagos-analytics.service';

const MESES = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                   'Julio', 'Agosto', 'Setiembre', 'Octubre', 'Noviembre', 'Diciembre'];

/**
 * Generador de CSVs.
 * Formato estándar UTF-8 con BOM para que Excel lo abra correctamente en español.
 * Separador: ';' (estándar en Excel español, evita conflictos con decimales).
 */
@Injectable()
export class CsvGenerator {
  private readonly SEP = ';';
  private readonly BOM = '\uFEFF';   // BOM para UTF-8 (Excel lo necesita)

  mediciones(rows: MedicionHistorialItem[]): Buffer {
    const headers = [
      'Período',
      'Año',
      'Mes',
      'Lectura anterior',
      'Lectura actual',
      'Consumo m³',
      'Variación vs promedio (%)',
      'Anomalía',
      'Tarifa S/. /m³',
      'Monto S/.',
    ];

    const lines: string[] = [];
    lines.push(headers.join(this.SEP));

    rows.forEach((r) => {
      lines.push([
        `${MESES[r.mes]} ${r.anio}`,
        r.anio.toString(),
        r.mes.toString(),
        r.lecturaAnterior.toFixed(3),
        r.lecturaActual.toFixed(3),
        r.m3Consumido.toFixed(3),
        r.variacionVsPromedio !== null ? r.variacionVsPromedio.toString() : '',
        r.esAnomalia ? 'Sí' : 'No',
        r.precioM3.toFixed(4),
        r.montoCalculado.toFixed(2),
      ].map(this.escapeCell).join(this.SEP));
    });

    return Buffer.from(this.BOM + lines.join('\r\n'), 'utf-8');
  }

  pagos(rows: PagoHistorialItem[]): Buffer {
    const headers = [
      'Fecha de pago',
      'Departamento',
      'Período cuota',
      'Método',
      'Banco',
      'Referencia',
      'Monto S/.',
      'Estado',
      'Observación',
      'Aprobado por',
    ];

    const lines: string[] = [];
    lines.push(headers.join(this.SEP));

    rows.forEach((r) => {
      lines.push([
        r.fechaPago,
        r.nrDepartamento,
        `${MESES[r.periodoMes]} ${r.periodoAnio}`,
        r.tipoPago,
        (r.banco || '').toUpperCase(),
        r.referencia || '',
        r.montoCancelado.toFixed(2),
        r.estadoPago,
        r.observacion || '',
        r.aprobadoPor || '',
      ].map(this.escapeCell).join(this.SEP));
    });

    return Buffer.from(this.BOM + lines.join('\r\n'), 'utf-8');
  }

  /**
   * Escapa una celda según RFC 4180:
   * - Si contiene separador, salto de línea o comillas → envolver en comillas
   * - Comillas internas → duplicarlas
   */
  private escapeCell = (v: any): string => {
    const s = String(v ?? '');
    const needsQuote = s.includes(this.SEP) || s.includes('\n') || s.includes('"');
    if (!needsQuote) return s;
    return `"${s.replace(/"/g, '""')}"`;
  };
}
