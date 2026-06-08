// src/jobs/notification-dispatcher.ts
// Lee notificacion_config de BD, evalúa cron expressions y despacha jobs.
// Se ejecuta cada minuto desde index.ts.

import { query } from '../db/connection'
import { runVencimientoPago } from './vencimiento-pago.job'
import { runGastosGenerales } from './gastos-generales.job'
import { runRecoleccionMedicion } from './recoleccion-medicion.job'
import { runVencimientoServicio } from './vencimiento-servicio.job'

interface NotificacionConfigRow {
  config_id:      string
  id_edificio:    string
  edificio_nombre: string
  id_grupo:       string
  tipo_codigo:    string
  tipo_nombre:    string
  destinatarios:  string
  cron_expresion: string
  dias_offset:    number
}

// Lee todas las configs activas con su tipo
const SQL_CONFIGS_ACTIVAS = `
  SELECT
    nc.id           AS config_id,
    nc.id_edificio,
    e.nombre        AS edificio_nombre,
    e.id_grupo,
    nt.codigo       AS tipo_codigo,
    nt.nombre       AS tipo_nombre,
    nt.destinatarios,
    nc.cron_expresion,
    nc.dias_offset
  FROM notificacion_config nc
  JOIN notificacion_tipo nt ON nt.id = nc.id_tipo
  JOIN edificios e          ON e.id  = nc.id_edificio
  WHERE nc.activo = true
    AND nt.activo = true
  ORDER BY e.nombre, nt.orden
`

// Evalúa si una cron expression debe ejecutarse en este momento
export function matchesCron(cron: string, now: Date): boolean {
  try {
    const parts = cron.trim().split(/\s+/)
    if (parts.length !== 5) return false

    const [cronMin, cronHour, cronDay, cronMonth, cronDow] = parts

    const matches = (field: string, value: number): boolean => {
      if (field === '*') return true
      if (field.includes(',')) return field.split(',').map(Number).includes(value)
      if (field.includes('-')) {
        const [s, e] = field.split('-').map(Number)
        return value >= s && value <= e
      }
      if (field.includes('/')) {
        const [, step] = field.split('/').map(Number)
        return value % step === 0
      }
      return parseInt(field) === value
    }

    return (
      matches(cronMin,   now.getMinutes())     &&
      matches(cronHour,  now.getHours())        &&
      matches(cronDay,   now.getDate())         &&
      matches(cronMonth, now.getMonth() + 1)   &&
      matches(cronDow,   now.getDay())
    )
  } catch {
    return false
  }
}

export async function runDispatcher(): Promise<void> {
  const now = new Date()
  const horaStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`

  let configs: NotificacionConfigRow[]
  try {
    configs = await query<NotificacionConfigRow>(SQL_CONFIGS_ACTIVAS)
  } catch (err: any) {
    console.error('[Dispatcher] Error leyendo configs:', err.message)
    return
  }

  if (configs.length === 0) {
    console.log(`[Dispatcher] ${horaStr} — Sin configuraciones activas`)
    return
  }

  // Filtrar solo las que deben ejecutarse ahora
  const aEjecutar = configs.filter(c => matchesCron(c.cron_expresion, now))

  if (aEjecutar.length === 0) {
    console.log(`[Dispatcher] ${horaStr} — Ninguna config coincide con la hora actual`)
    return
  }

  console.log(`[Dispatcher] ${horaStr} — ${aEjecutar.length} config(s) a ejecutar`)

  for (const config of aEjecutar) {
    console.log(`\n[Dispatcher] → ${config.tipo_codigo} | ${config.edificio_nombre}`)
    try {
      switch (config.tipo_codigo) {
        case 'vencimiento_pago':
          await runVencimientoPago(config.id_edificio, config.dias_offset)
          break
        case 'gastos_generales':
          await runGastosGenerales(config.id_edificio, config.dias_offset)
          break
        case 'recoleccion_medicion':
          await runRecoleccionMedicion(config.id_edificio, config.destinatarios)
          break
        case 'vencimiento_servicio':
          await runVencimientoServicio(config.id_edificio, config.destinatarios)
          break
        default:
          console.warn(`[Dispatcher] Código desconocido: ${config.tipo_codigo}`)
      }
    } catch (err: any) {
      console.error(`[Dispatcher] Error en ${config.tipo_codigo} / ${config.edificio_nombre}:`, err.message)
    }
  }
}
