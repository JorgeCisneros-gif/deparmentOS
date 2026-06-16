// src/jobs/recoleccion-medicion.job.ts
// Recuerda a gestión/admin que deben registrar las mediciones del mes.
import { query } from '../db/connection'
import { renderTemplate } from '../utils/template'
import { NotifTemplate } from './vencimiento-pago.job'
import { sendPushToEdificioRoles } from '../channels/push.channel'

export async function runRecoleccionMedicion(
  idEdificio: string,
  destinatarios: string, // 'gestion' | 'admin' | 'gestion,admin'
  tmpl?: NotifTemplate,
): Promise<void> {
  const roles = parseRoles(destinatarios)

  console.log(`[RecMedicion] Notificando roles [${roles.join(',')}] en edificio ${idEdificio}`)

  const n = await sendPushToEdificioRoles(idEdificio, roles, {
    title: renderTemplate(tmpl?.titulo || '📊 Recordatorio: Registro de mediciones', {}),
    body:  renderTemplate(tmpl?.cuerpo || 'Hoy es el día de registrar las lecturas de los medidores. Ingresa a Nueva Medición.', {}),
    url:   '/readings/new',
    tag:   `recoleccion-${idEdificio}-${new Date().toDateString()}`,
  })

  console.log(`[RecMedicion] ✓ Push enviado a ${n} dispositivo(s)`)

  await query(`
    INSERT INTO logs_notificacion (canal, tipo_notificacion, destinatario, estado, detalle, enviado_at)
    VALUES ('push', 'recoleccion_medicion', $1, $2, $3, NOW())
  `, [
    roles.join(','),
    n > 0 ? 'enviado' : 'omitido',
    n > 0 ? `Push enviado a ${n} dispositivo(s)` : 'Sin suscripciones activas',
  ]).catch(() => {})
}

function parseRoles(destinatarios: string): string[] {
  const map: Record<string, string> = {
    gestion: 'gestion',
    admin:   'administrador',
    administrador: 'administrador',
  }
  return destinatarios.split(',')
    .map(d => map[d.trim()] || d.trim())
    .filter(Boolean)
}
