// src/jobs/vencimiento-pago.job.ts
// Notifica a propietarios con cuotas pendientes N días después del envío del mensaje.
import { query } from '../db/connection'
import { renderTemplate, fmtMonto, fmtPeriodo } from '../utils/template'
import { sendPushToPropietario } from '../channels/push.channel'

interface CuotaPendiente {
  cuota_id:           string
  periodo_mes:        number
  periodo_anio:       number
  monto_total:        number
  saldo:              number
  fecha_vencimiento:  string | null
  fecha_msg_enviado:  string | null
  status_pago:        string
  departamento:       string
  propietario_id:     string | null
  propietario_nombre: string | null
  propietario_correo: string | null
}

export interface NotifTemplate { titulo?: string; cuerpo?: string }

export async function runVencimientoPago(
  idEdificio: string,
  diasOffset: number,
  tmpl?: NotifTemplate,
): Promise<void> {
  // Fecha límite: solo notificar cuotas cuyo mensaje se envió hace >= diasOffset días
  const offsetDate = new Date()
  offsetDate.setDate(offsetDate.getDate() - diasOffset)
  const offsetStr = offsetDate.toISOString().split('T')[0]

  const cuotas = await query<CuotaPendiente>(`
    SELECT
      c.id                          AS cuota_id,
      c.periodo_mes,
      c.periodo_anio,
      c.monto_total::FLOAT          AS monto_total,
      COALESCE(
        c.monto_total - COALESCE((
          SELECT SUM(p.monto_cancelado) FROM pagos p
          WHERE p.id_cuota = c.id AND p.estado_pago = 'aprobado'
        ), 0),
        c.monto_total
      )::FLOAT                      AS saldo,
      c.fecha_vencimiento::TEXT     AS fecha_vencimiento,
      c.fecha_mensaje_enviado::TEXT AS fecha_msg_enviado,
      c.status_pago,
      d.nr_departamento             AS departamento,
      p.id                          AS propietario_id,
      p.nombre                      AS propietario_nombre,
      p.correo                      AS propietario_correo
    FROM cuotas_departamento c
    JOIN departamentos d   ON d.id = c.id_departamento
    JOIN edificios e       ON e.id = d.id_edificio
    LEFT JOIN propietarios p ON p.id = d.id_propietario
    WHERE e.id = $1
      AND c.status_pago IN ('pendiente', 'parcial', 'vencido')
      AND c.mensaje_enviado = true
      AND c.fecha_mensaje_enviado IS NOT NULL
      AND CAST(c.fecha_mensaje_enviado AS DATE) <= $2
      AND d.status = 'activo'
      AND p.id IS NOT NULL
    ORDER BY d.nr_departamento
  `, [idEdificio, offsetStr])

  console.log(`[VencPago] ${cuotas.length} cuota(s) pendientes en edificio ${idEdificio}`)

  let enviados = 0
  for (const cuota of cuotas) {
    if (!cuota.propietario_id) continue

    // Anti-duplicado: no enviar más de 1 push por día por cuota
    const yaNotif = await query(`
      SELECT id FROM logs_notificacion
      WHERE cuota_id = $1 AND canal = 'push'
        AND tipo_notificacion = 'vencimiento_pago'
        AND DATE(enviado_at) = CURRENT_DATE
      LIMIT 1
    `, [cuota.cuota_id])

    if (yaNotif.length > 0) {
      console.log(`[VencPago] OMITIDO (ya notificado hoy) — Depto ${cuota.departamento}`)
      continue
    }

    const saldo = cuota.saldo || cuota.monto_total
    const periodo = fmtPeriodo(cuota.periodo_mes, cuota.periodo_anio)
    const vars = { periodo, departamento: cuota.departamento, saldo: fmtMonto(saldo) }

    const n = await sendPushToPropietario(cuota.propietario_id, {
      title: renderTemplate(tmpl?.titulo || '💰 Pago pendiente — {periodo}', vars),
      body:  renderTemplate(tmpl?.cuerpo || 'Depto {departamento}: S/. {saldo} pendiente. Por favor regulariza tu pago.', vars),
      url:   '/mis-pagos',
      tag:   `venc-pago-${cuota.cuota_id}`,
    })

    if (n > 0) {
      await logNotificacion(cuota.cuota_id, 'vencimiento_pago', cuota.propietario_correo || '', 'enviado', `Push enviado`)
      enviados++
      console.log(`[VencPago] ✓ Push → ${cuota.propietario_nombre} (Depto ${cuota.departamento})`)
    } else {
      await logNotificacion(cuota.cuota_id, 'vencimiento_pago', cuota.propietario_correo || '', 'omitido', 'Sin suscripción push')
      console.log(`[VencPago] ⚠ Sin dispositivo → ${cuota.propietario_nombre}`)
    }
  }

  console.log(`[VencPago] Enviados: ${enviados}/${cuotas.length}`)
}

async function logNotificacion(
  cuotaId: string, tipo: string, destinatario: string, estado: string, detalle: string
) {
  await query(`
    INSERT INTO logs_notificacion (cuota_id, canal, tipo_notificacion, destinatario, estado, detalle, enviado_at)
    VALUES ($1, 'push', $2, $3, $4, $5, NOW())
    ON CONFLICT DO NOTHING
  `, [cuotaId, tipo, destinatario, estado, detalle]).catch(() => {})
}
