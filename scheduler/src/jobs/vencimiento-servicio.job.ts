// src/jobs/vencimiento-servicio.job.ts
// Notifica cuando vence la fecha de pago de un recibo de servicio.
import { query } from '../db/connection'
import { renderTemplate, fmtMonto, fmtPeriodo } from '../utils/template'
import { NotifTemplate } from './vencimiento-pago.job'
import { sendPushToEdificioRoles } from '../channels/push.channel'

interface ReciboVencido {
  recibo_id:       string
  nombre_servicio: string
  monto_total:     number
  periodo_mes:     number
  periodo_anio:    number
}

export async function runVencimientoServicio(
  idEdificio: string,
  destinatarios: string,
  tmpl?: NotifTemplate,
): Promise<void> {
  const hoy = new Date().toISOString().split('T')[0]

  const recibos = await query<ReciboVencido>(`
    SELECT
      r.id              AS recibo_id,
      s.nombre_servicio,
      r.monto_total_factura::FLOAT AS monto_total,
      r.periodo_mes,
      r.periodo_anio
    FROM recibos_servicio r
    JOIN servicios s ON s.id = r.id_servicio
    WHERE s.id_edificio = $1
      AND CAST(r.fecha_vencimiento AS DATE) = $2
    ORDER BY s.nombre_servicio
  `, [idEdificio, hoy])

  if (recibos.length === 0) {
    console.log(`[VencServicio] Sin recibos que vencen hoy en edificio ${idEdificio}`)
    return
  }

  const roles = parseRoles(destinatarios)
  console.log(`[VencServicio] ${recibos.length} recibo(s) vence(n) hoy — notificando [${roles.join(',')}]`)

  for (const recibo of recibos) {
    const periodo = fmtPeriodo(recibo.periodo_mes, recibo.periodo_anio)

    const vars = { servicio: recibo.nombre_servicio, periodo, monto: fmtMonto(recibo.monto_total) }
    const n = await sendPushToEdificioRoles(idEdificio, roles, {
      title: renderTemplate(tmpl?.titulo || '⚠️ Vence hoy: {servicio}', vars),
      body:  renderTemplate(tmpl?.cuerpo || 'El recibo de "{servicio}" ({periodo}) por S/. {monto} vence hoy.', vars),
      url:   '/receipts',
      tag:   `venc-svc-${recibo.recibo_id}`,
    })

    await query(`
      INSERT INTO logs_notificacion (canal, tipo_notificacion, destinatario, estado, detalle, enviado_at)
      VALUES ('push', 'vencimiento_servicio', $1, $2, $3, NOW())
    `, [
      roles.join(','),
      n > 0 ? 'enviado' : 'omitido',
      `${recibo.nombre_servicio} — ${n} dispositivo(s)`,
    ]).catch(() => {})

    console.log(`[VencServicio] ✓ ${recibo.nombre_servicio} → ${n} dispositivo(s)`)
  }
}

function parseRoles(destinatarios: string): string[] {
  const map: Record<string, string> = {
    gestion: 'gestion', admin: 'administrador', administrador: 'administrador',
  }
  return destinatarios.split(',').map(d => map[d.trim()] || d.trim()).filter(Boolean)
}
