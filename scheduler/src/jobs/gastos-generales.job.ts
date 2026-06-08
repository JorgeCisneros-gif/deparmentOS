// src/jobs/gastos-generales.job.ts
// Notifica a propietarios del edificio cuando hay gastos generales recientes.
import { query } from '../db/connection'
import { sendPushToPropietario } from '../channels/push.channel'

interface GastoExtra {
  gasto_id:    string
  descripcion: string
  monto_gasto: number
  created_at:  string
}

interface Propietario {
  propietario_id: string
  nombre:         string
  correo:         string
  departamento:   string
}

export async function runGastosGenerales(
  idEdificio: string,
  diasOffset: number,
): Promise<void> {
  // Gastos creados hace >= diasOffset días (aún recientes)
  const offsetDate = new Date()
  offsetDate.setDate(offsetDate.getDate() - diasOffset)

  const gastos = await query<GastoExtra>(`
    SELECT id AS gasto_id, descripcion, monto_gasto::FLOAT, created_at::TEXT
    FROM gastos_extra
    WHERE id_edificio = $1
      AND created_at <= $2
      AND status != 'anulado'
    ORDER BY created_at DESC
    LIMIT 10
  `, [idEdificio, offsetDate.toISOString()])

  if (gastos.length === 0) {
    console.log(`[GastosGen] Sin gastos recientes en edificio ${idEdificio}`)
    return
  }

  // Propietarios activos del edificio
  const propietarios = await query<Propietario>(`
    SELECT p.id AS propietario_id, p.nombre, p.correo, d.nr_departamento AS departamento
    FROM propietarios p
    JOIN departamentos d ON d.id_propietario = p.id
    JOIN edificios e     ON e.id = d.id_edificio
    WHERE e.id = $1 AND d.status = 'activo'
    ORDER BY d.nr_departamento
  `, [idEdificio])

  console.log(`[GastosGen] ${gastos.length} gasto(s), ${propietarios.length} propietario(s)`)

  // Por cada gasto, notificar propietarios que no fueron notificados hoy
  for (const gasto of gastos) {
    for (const prop of propietarios) {
      const yaNotif = await query(`
        SELECT id FROM logs_notificacion
        WHERE gasto_id = $1
          AND tipo_notificacion = 'gastos_generales'
          AND destinatario = $2
          AND DATE(enviado_at) = CURRENT_DATE
        LIMIT 1
      `, [gasto.gasto_id, prop.correo])

      if (yaNotif.length > 0) continue

      const n = await sendPushToPropietario(prop.propietario_id, {
        title: '🏢 Gasto general registrado',
        body:  `"${gasto.descripcion}" por S/. ${gasto.monto_gasto.toFixed(2)}. Revisa tu estado de cuenta.`,
        url:   '/mis-pagos',
        tag:   `gasto-${gasto.gasto_id}-${prop.propietario_id}`,
      })

      await logGasto(gasto.gasto_id, prop.correo, n > 0 ? 'enviado' : 'omitido', n > 0 ? 'Push enviado' : 'Sin suscripción')
      if (n > 0) console.log(`[GastosGen] ✓ Push → ${prop.nombre} (Depto ${prop.departamento})`)
    }
  }
}

async function logGasto(gastoId: string, destinatario: string, estado: string, detalle: string) {
  await query(`
    INSERT INTO logs_notificacion (gasto_id, canal, tipo_notificacion, destinatario, estado, detalle, enviado_at)
    VALUES ($1, 'push', 'gastos_generales', $2, $3, $4, NOW())
  `, [gastoId, destinatario, estado, detalle]).catch(() => {})
}
