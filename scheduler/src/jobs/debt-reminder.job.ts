import { query } from '../db/connection'
import { config } from '../config/scheduler.config'
import { sendDebtEmail, DebtNotificationPayload } from '../channels/email.channel'
import { sendPushDebtNotification } from '../channels/push.channel'

// ── Tipos internos ────────────────────────────────────────────
interface CuotaPendiente {
  cuota_id:            string
  periodo_mes:         number
  periodo_anio:        number
  monto_total:         number
  fecha_vencimiento:   string | null
  status_pago:         string
  departamento:        string
  edificio_id:         string
  edificio:            string
  propietario_id:      string | null
  propietario_nombre:  string | null
  propietario_correo:  string | null
  propietario_tel:     string | null
}

interface LogEntry {
  cuota_id:      string
  canal:         string
  destinatario:  string
  estado:        'enviado' | 'error' | 'omitido'
  detalle:       string
}

// ── Query principal ───────────────────────────────────────────
// Busca TODAS las cuotas pendientes o vencidas que tengan propietario con correo
// La BD ya tiene toda la info que necesitamos en una sola consulta
const SQL_CUOTAS_PENDIENTES = `
  SELECT
    c.id                           AS cuota_id,
    c.periodo_mes,
    c.periodo_anio,
    c.monto_total::FLOAT           AS monto_total,
    c.fecha_vencimiento::TEXT      AS fecha_vencimiento,
    c.status_pago,
    d.nr_departamento              AS departamento,
    e.id                           AS edificio_id,
    e.nombre                       AS edificio,
    p.id                           AS propietario_id,
    p.nombre                       AS propietario_nombre,
    p.correo                       AS propietario_correo,
    p.telefono                     AS propietario_tel
  FROM   cuotas_departamento c
  JOIN   departamentos d  ON d.id = c.id_departamento
  JOIN   edificios     e  ON e.id = d.id_edificio
  LEFT JOIN propietarios p ON p.id = d.id_propietario
  WHERE  c.status_pago IN ('pendiente', 'parcial', 'vencido')
  AND    c.mensaje_enviado = true   -- solo cuotas con mensaje ya enviado al propietario
  AND    d.status = 'activo'
  AND    p.id IS NOT NULL
  AND    p.correo IS NOT NULL
  AND    p.correo <> ''
  ORDER  BY e.nombre, d.nr_departamento
`

// Revisa si ya se envió notificación hoy para esta cuota y canal
const SQL_YA_NOTIFICADO = `
  SELECT id FROM logs_notificacion
  WHERE  cuota_id    = $1
  AND    canal       = $2
  AND    DATE(enviado_at) = CURRENT_DATE
  LIMIT  1
`

// Registra el resultado del envío
const SQL_INSERT_LOG = `
  INSERT INTO logs_notificacion
    (cuota_id, canal, destinatario, estado, detalle, enviado_at)
  VALUES ($1, $2, $3, $4, $5, NOW())
`

// ── Helpers ───────────────────────────────────────────────────
function calcularDiasVencido(fechaVenc: string | null): number {
  if (!fechaVenc) return 0
  const hoy   = new Date()
  hoy.setHours(0, 0, 0, 0)
  const venc  = new Date(fechaVenc)
  venc.setHours(0, 0, 0, 0)
  return Math.round((hoy.getTime() - venc.getTime()) / (1000 * 60 * 60 * 24))
}

async function yaNotificadoHoy(cuotaId: string, canal: string): Promise<boolean> {
  const rows = await query(SQL_YA_NOTIFICADO, [cuotaId, canal])
  return rows.length > 0
}

async function registrarLog(entry: LogEntry): Promise<void> {
  await query(SQL_INSERT_LOG, [
    entry.cuota_id,
    entry.canal,
    entry.destinatario,
    entry.estado,
    entry.detalle,
  ])
}

// ── Job principal ─────────────────────────────────────────────
export async function runDebtReminder(): Promise<void> {
  const canal   = config.notification.channel
  const resumen = { total: 0, enviados: 0, omitidos: 0, errores: 0 }

  console.log(`[Job] Canal activo: ${canal}`)

  // 1. Obtener todas las cuotas pendientes en una sola consulta
  const cuotas = await query<CuotaPendiente>(SQL_CUOTAS_PENDIENTES)
  resumen.total = cuotas.length
  console.log(`[Job] Cuotas pendientes encontradas: ${cuotas.length}`)

  if (cuotas.length === 0) {
    console.log('[Job] No hay cuotas pendientes — nada que notificar')
    return
  }

  // 2. Procesar cada cuota
  for (const cuota of cuotas) {
    const destinatario = cuota.propietario_correo!

    // ── Anti-duplicado: skip si ya se notificó hoy ──────────
    if (await yaNotificadoHoy(cuota.cuota_id, canal)) {
      console.log(`[Job] OMITIDO (ya notificado hoy) — ${cuota.edificio} Depto ${cuota.departamento}`)
      resumen.omitidos++
      continue
    }

    const diasVencido = calcularDiasVencido(cuota.fecha_vencimiento)

    const payload: DebtNotificationPayload = {
      propietarioNombre: cuota.propietario_nombre!,
      propietarioCorreo: destinatario,
      departamento:      cuota.departamento,
      edificio:          cuota.edificio,
      periodoMes:        cuota.periodo_mes,
      periodoAnio:       cuota.periodo_anio,
      montoTotal:        cuota.monto_total,
      fechaVencimiento:  cuota.fecha_vencimiento,
      diasVencido,
    }

    // ── Envío según canal ────────────────────────────────────
    try {
      if (canal === 'email') {
        await sendDebtEmail(payload)

        await registrarLog({
          cuota_id:     cuota.cuota_id,
          canal,
          destinatario,
          estado:       'enviado',
          detalle:      `Email enviado. Días vencido: ${diasVencido}`,
        })
        resumen.enviados++
        console.log(`[Job] ✓ Email → ${cuota.propietario_nombre} (${destinatario}) — Depto ${cuota.departamento}`)

      } else if (canal === 'push') {
        const pushEnviados = await sendPushDebtNotification({
          propietarioId:     cuota.propietario_id!,
          propietarioNombre: cuota.propietario_nombre!,
          departamento:      cuota.departamento,
          edificio:          cuota.edificio,
          montoTotal:        cuota.monto_total,
          diasVencido,
        })

        if (pushEnviados > 0) {
          await registrarLog({
            cuota_id:     cuota.cuota_id,
            canal,
            destinatario,
            estado:       'enviado',
            detalle:      `Push enviado a ${pushEnviados} dispositivo(s). Días vencido: ${diasVencido}`,
          })
          resumen.enviados++
          console.log(`[Job] ✓ Push → ${cuota.propietario_nombre} — Depto ${cuota.departamento} (${pushEnviados} dispositivos)`)
        } else {
          await registrarLog({
            cuota_id:     cuota.cuota_id,
            canal,
            destinatario,
            estado:       'omitido',
            detalle:      `Sin suscripción push activa para este propietario`,
          })
          resumen.omitidos++
          console.log(`[Job] ⚠ Sin dispositivo → ${cuota.propietario_nombre} — Depto ${cuota.departamento}`)
        }
      }

    } catch (err: any) {
      resumen.errores++
      const detalle = err?.message || 'Error desconocido'
      console.error(`[Job] ✗ Error → ${destinatario}: ${detalle}`)

      await registrarLog({
        cuota_id:     cuota.cuota_id,
        canal,
        destinatario,
        estado:       'error',
        detalle,
      }).catch(() => {}) // no romper el loop si falla el log
    }
  }

  // 3. Resumen final
  console.log(`
[Job] ─── Resumen del día ───────────────────────────
[Job]   Total cuotas pendientes : ${resumen.total}
[Job]   Notificaciones enviadas : ${resumen.enviados}
[Job]   Ya notificados hoy      : ${resumen.omitidos}
[Job]   Errores                 : ${resumen.errores}
[Job] ─────────────────────────────────────────────`)
}
