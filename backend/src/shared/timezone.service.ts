// src/shared/timezone.service.ts
// Servicio centralizado para manejo de fechas con soporte multi-timezone.
// En producción (AWS sa-east-1), el servidor corre en UTC-3 (America/Sao_Paulo).
// REGLA: Siempre guardar en UTC (TIMESTAMPTZ), convertir al mostrar.

import { Injectable } from '@nestjs/common';

@Injectable()
export class TimezoneService {

  /**
   * Parsea una fecha string enviada desde el frontend con offset explícito.
   * El frontend debe enviar: "2025-12-20T12:00:00-05:00"
   * Si solo llega "2025-12-20", lo trata como mediodía en la timezone del edificio.
   */
  parseToUTC(dateStr: string, buildingTimezone = 'America/Lima'): Date {
    // Si ya tiene offset (T...±HH:MM), parsear directamente
    if (dateStr.includes('T') && (dateStr.includes('+') || dateStr.match(/-\d{2}:\d{2}$/))) {
      return new Date(dateStr);
    }

    // Solo fecha "YYYY-MM-DD" → asumir mediodía en la timezone del edificio
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [y, m, d] = dateStr.split('-').map(Number);
      // Obtener el offset de la timezone del edificio para esta fecha
      const offset = this.getOffsetMinutes(buildingTimezone, new Date(y, m - 1, d));
      const offsetMs = offset * 60 * 1000;
      // Mediodía local = 12:00:00 en la timezone del edificio
      const noonLocal = Date.UTC(y, m - 1, d, 12, 0, 0);
      return new Date(noonLocal - offsetMs);
    }

    // Fallback: parsear como está
    return new Date(dateStr);
  }

  /**
   * Obtiene el offset en minutos de una timezone IANA para una fecha dada.
   * America/Lima → -300 (UTC-5)
   * America/Sao_Paulo → -180 (UTC-3)
   */
  getOffsetMinutes(timezone: string, date = new Date()): number {
    // Usar Intl para obtener el offset real (considera horario de verano)
    const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
    const tzDate  = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
    return (utcDate.getTime() - tzDate.getTime()) / 60000;
  }

  /**
   * Formatea una fecha UTC para mostrarla en la timezone del edificio.
   * Entrada: Date (UTC desde BD)
   * Salida: string en formato local del edificio
   */
  formatForDisplay(
    date: Date | string | null,
    timezone: string,
    locale: string,
    options?: Intl.DateTimeFormatOptions,
  ): string {
    if (!date) return '—';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleString(locale, {
      timeZone: timezone,
      ...options,
    });
  }

  /**
   * Calcula días de diferencia entre dos fechas en la timezone del edificio.
   * Evita errores de medianoche UTC vs medianoche local.
   */
  diffDaysInTimezone(date1: Date, date2: Date, timezone: string): number {
    const toMidnight = (d: Date) => {
      const str = d.toLocaleDateString('en-CA', { timeZone: timezone }) // 'YYYY-MM-DD'
      const [y, m, day] = str.split('-').map(Number)
      return Date.UTC(y, m - 1, day)
    }
    return Math.round((toMidnight(date1) - toMidnight(date2)) / 86400000)
  }

  /**
   * Retorna "hoy" en la timezone indicada como string YYYY-MM-DD
   */
  todayInTimezone(timezone: string): string {
    return new Date().toLocaleDateString('en-CA', { timeZone: timezone })
  }

  /**
   * Retorna el timestamp UTC actual (para guardar en BD)
   */
  nowUTC(): Date {
    return new Date()
  }
}
