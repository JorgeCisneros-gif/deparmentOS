// src/reports/generators/pdf.generator.ts
import { Injectable } from '@nestjs/common';
// PDFKit es CommonJS, no soporta default import en TS strict.
// Usamos require que sí funciona con CommonJS.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const PDFDocument = require('pdfkit');
import { PassThrough } from 'stream';
import { MedicionHistorialItem, MedicionesAnalytics } from '../analytics/mediciones-analytics.service';
import { PagoHistorialItem, PagosAnalytics } from '../analytics/pagos-analytics.service';

// Tipo para una instancia de PDFKit. Reemplaza al namespace PDFKit.PDFDocument.
// Tipo permisivo — pdfkit no expone types limpios con require.
type PDFDoc = any;

// Estructura de un KPI para la grilla
type KpiPair = [string, string];

const MESES = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                   'Julio', 'Agosto', 'Setiembre', 'Octubre', 'Noviembre', 'Diciembre'];

interface MedicionesPdfData {
  edificio:      string;
  departamento:  string;
  servicio:      string;
  rangoPeriodo:  string;
  analytics:     MedicionesAnalytics;
  historial:     MedicionHistorialItem[];
}

interface PagosPdfData {
  edificio:    string;
  periodo:     { mes: number; anio: number };
  analytics:   PagosAnalytics;
  historial:   PagoHistorialItem[];
}

/**
 * Generador de PDFs para los reportes.
 *
 * Estilo sobrio, empresarial. Tipografía Helvetica.
 * Apto para impresión y para enviar por email al inquilino que reclama.
 */
@Injectable()
export class PdfGenerator {
  /**
   * Genera un PDF con el historial de mediciones de un depto.
   * Devuelve un Buffer listo para enviar como Content-Type: application/pdf.
   */
  async mediciones(data: MedicionesPdfData): Promise<Buffer> {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
      info: {
        Title:    `Historial de mediciones — Depto ${data.departamento}`,
        Author:   'DepartmentOS',
        Subject:  'Reporte de mediciones',
      },
    });

    const stream = new PassThrough();
    const chunks: Buffer[] = [];
    stream.on('data', (c: Buffer) => chunks.push(c));
    doc.pipe(stream);

    // ─── Header ──
    doc.fontSize(18).font('Helvetica-Bold').text('Historial de mediciones', { align: 'left' });
    doc.fontSize(9).font('Helvetica').fillColor('#666')
      .text(`${data.edificio} · Depto ${data.departamento} · ${data.servicio} · ${data.rangoPeriodo}`,
        { align: 'left' });
    doc.moveDown(0.5);

    doc.fillColor('#999').fontSize(8)
      .text(`Generado: ${new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' })}`,
        { align: 'right' });
    doc.moveDown(1);
    doc.fillColor('#000');

    // ─── KPIs ──
    const { analytics } = data;
    const kpis: KpiPair[] = [
      ['Último consumo', analytics.ultimoConsumoM3 !== null
        ? `${analytics.ultimoConsumoM3.toFixed(3)} m³`
        : '—'],
      ['Promedio histórico', analytics.promedioHistoricoM3 !== null
        ? `${analytics.promedioHistoricoM3.toFixed(3)} m³`
        : '—'],
      ['Mayor variación', analytics.mayorVariacion
        ? `${analytics.mayorVariacion.porcentaje > 0 ? '+' : ''}${analytics.mayorVariacion.porcentaje}% (${MESES[analytics.mayorVariacion.periodo.mes]} ${analytics.mayorVariacion.periodo.anio})`
        : '—'],
      ['Estado actual', this.estadoActualLabel(analytics.estadoActual)],
    ];

    this.drawKpiGrid(doc, kpis);
    doc.moveDown(1.5);

    // ─── Tabla de mediciones ──
    this.drawMedicionesTable(doc, data.historial);

    doc.moveDown(2);

    // ─── Footer ──
    this.drawFooter(doc);

    doc.end();

    return new Promise((resolve, reject) => {
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  }

  /**
   * Genera un PDF con el historial de pagos de un edificio en un mes.
   */
  async pagos(data: PagosPdfData): Promise<Buffer> {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
      info: {
        Title:   `Historial de pagos — ${MESES[data.periodo.mes]} ${data.periodo.anio}`,
        Author:  'DepartmentOS',
        Subject: 'Reporte de pagos',
      },
    });

    const stream = new PassThrough();
    const chunks: Buffer[] = [];
    stream.on('data', (c: Buffer) => chunks.push(c));
    doc.pipe(stream);

    // ─── Header ──
    doc.fontSize(18).font('Helvetica-Bold').text('Historial de pagos', { align: 'left' });
    doc.fontSize(9).font('Helvetica').fillColor('#666')
      .text(`${data.edificio} · ${MESES[data.periodo.mes]} ${data.periodo.anio}`,
        { align: 'left' });
    doc.moveDown(0.5);
    doc.fillColor('#999').fontSize(8)
      .text(`Generado: ${new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' })}`,
        { align: 'right' });
    doc.moveDown(1);
    doc.fillColor('#000');

    // ─── KPIs ──
    const { analytics } = data;
    const kpis: KpiPair[] = [
      ['Recaudado', `S/. ${analytics.recaudado.toFixed(2)}`],
      ['Facturado', `S/. ${analytics.facturado.toFixed(2)}`],
      ['Resultado',
        analytics.tipoResultado === 'excedente'
          ? `+ S/. ${analytics.resultado.toFixed(2)} (excedente)`
          : analytics.tipoResultado === 'deficit'
            ? `- S/. ${Math.abs(analytics.resultado).toFixed(2)} (déficit)`
            : 'S/. 0.00'],
      ['Por aprobar', `${analytics.porAprobar} pagos`],
    ];
    this.drawKpiGrid(doc, kpis);
    doc.moveDown(1.5);

    // ─── Tabla pagos ──
    this.drawPagosTable(doc, data.historial);

    doc.moveDown(2);
    this.drawFooter(doc);

    doc.end();

    return new Promise((resolve, reject) => {
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  }

  // ─── Helpers de dibujo ──

  private drawKpiGrid(doc: PDFDoc, kpis: KpiPair[]): void {
    const startX = 50;
    const startY = doc.y;
    const cellW  = (doc.page.width - 100) / kpis.length;
    const cellH  = 50;

    kpis.forEach((kpi, i) => {
      const x = startX + i * cellW;
      doc.rect(x, startY, cellW - 5, cellH).strokeColor('#e0e0e0').lineWidth(0.5).stroke();
      doc.fontSize(7).fillColor('#888').font('Helvetica')
        .text(kpi[0].toUpperCase(), x + 8, startY + 8, { width: cellW - 16 });
      doc.fontSize(12).fillColor('#000').font('Helvetica-Bold')
        .text(kpi[1], x + 8, startY + 22, { width: cellW - 16 });
    });

    doc.y = startY + cellH;
    doc.fillColor('#000');
  }

  private drawMedicionesTable(doc: PDFDoc, rows: MedicionHistorialItem[]): void {
    const startY = doc.y;
    const cols = [
      { label: 'Período',    w: 90  },
      { label: 'L. ant.',    w: 70, align: 'right' as const },
      { label: 'L. act.',    w: 70, align: 'right' as const },
      { label: 'Consumo',    w: 70, align: 'right' as const },
      { label: 'Variación',  w: 60, align: 'right' as const },
      { label: 'Tarifa',     w: 70, align: 'right' as const },
      { label: 'Monto',      w: 65, align: 'right' as const },
    ];

    let x = 50;
    doc.rect(50, startY, doc.page.width - 100, 20).fillColor('#f5f5f5').fill();
    cols.forEach((c) => {
      doc.fontSize(8).fillColor('#444').font('Helvetica-Bold')
        .text(c.label.toUpperCase(), x + 4, startY + 6, {
          width: c.w - 8,
          align: c.align || 'left',
        });
      x += c.w;
    });
    doc.fillColor('#000');

    let y = startY + 20;
    rows.forEach((r, idx) => {
      if (y > doc.page.height - 80) {
        doc.addPage();
        y = 50;
      }

      if (idx % 2 === 1) {
        doc.rect(50, y, doc.page.width - 100, 18).fillColor('#fafafa').fill();
      }

      x = 50;
      const values = [
        `${MESES[r.mes].slice(0, 3)} ${r.anio}`,
        r.lecturaAnterior.toFixed(3),
        r.lecturaActual.toFixed(3),
        `${r.m3Consumido.toFixed(3)} m³`,
        r.variacionVsPromedio !== null
          ? `${r.variacionVsPromedio > 0 ? '+' : ''}${r.variacionVsPromedio}%`
          : '—',
        `S/. ${r.precioM3.toFixed(4)}`,
        `S/. ${r.montoCalculado.toFixed(2)}`,
      ];

      cols.forEach((c, i) => {
        const isVariacion = i === 4;
        let color = '#000';
        if (isVariacion && r.variacionVsPromedio !== null) {
          if (r.variacionVsPromedio > 30)       color = '#a32d2d';
          else if (r.variacionVsPromedio < -30) color = '#3b6d11';
        }
        doc.fontSize(8).fillColor(color).font('Helvetica')
          .text(values[i], x + 4, y + 5, {
            width: c.w - 8,
            align: c.align || 'left',
          });
        x += c.w;
      });

      y += 18;
    });

    doc.y = y;
    doc.fillColor('#000');
  }

  private drawPagosTable(doc: PDFDoc, rows: PagoHistorialItem[]): void {
    const startY = doc.y;
    const cols = [
      { label: 'Fecha',      w: 55  },
      { label: 'Depto',      w: 40  },
      { label: 'Método',     w: 70  },
      { label: 'Banco',      w: 60  },
      { label: 'Referencia', w: 90  },
      { label: 'Monto',      w: 60, align: 'right' as const },
      { label: 'Estado',     w: 80  },
    ];

    let x = 50;
    doc.rect(50, startY, doc.page.width - 100, 20).fillColor('#f5f5f5').fill();
    cols.forEach((c) => {
      doc.fontSize(8).fillColor('#444').font('Helvetica-Bold')
        .text(c.label.toUpperCase(), x + 4, startY + 6, {
          width: c.w - 8,
          align: c.align || 'left',
        });
      x += c.w;
    });
    doc.fillColor('#000');

    let y = startY + 20;
    rows.forEach((r, idx) => {
      if (y > doc.page.height - 80) {
        doc.addPage();
        y = 50;
      }

      if (idx % 2 === 1) {
        doc.rect(50, y, doc.page.width - 100, 18).fillColor('#fafafa').fill();
      }

      x = 50;
      const fecha = new Date(r.fechaPago);
      const values = [
        fecha.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' }),
        r.nrDepartamento,
        r.tipoPago,
        (r.banco || '').toUpperCase(),
        r.referencia || '—',
        `S/. ${r.montoCancelado.toFixed(2)}`,
        this.estadoPagoLabel(r.estadoPago),
      ];

      cols.forEach((c, i) => {
        doc.fontSize(8).fillColor('#000').font('Helvetica')
          .text(values[i], x + 4, y + 5, {
            width: c.w - 8,
            align: c.align || 'left',
          });
        x += c.w;
      });

      y += 18;
    });

    doc.y = y;
    doc.fillColor('#000');
  }

  private drawFooter(doc: PDFDoc): void {
    const y = doc.page.height - 40;
    doc.fontSize(7).fillColor('#aaa').font('Helvetica')
      .text('Reporte generado por DepartmentOS · Suite-OS', 50, y, {
        width: doc.page.width - 100,
        align: 'center',
      });
  }

  private estadoActualLabel(estado: string): string {
    switch (estado) {
      case 'normal':           return 'Normal';
      case 'sobre_promedio':   return 'Sobre el promedio';
      case 'anomalo':          return 'Anómalo';
      default:                 return 'Sin datos';
    }
  }

  private estadoPagoLabel(estado: string): string {
    switch (estado) {
      case 'aprobado':                return 'Aprobado';
      case 'pendiente_aprobacion':   return 'Pendiente';
      case 'rechazado':               return 'Rechazado';
      default:                        return estado;
    }
  }
}
