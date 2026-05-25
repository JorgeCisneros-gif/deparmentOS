// src/channels/push.channel.ts (Scheduler)
import * as webpush from 'web-push'
import { query } from '../db/connection'

interface PushSubscriptionRow {
  endpoint: string; p256dh: string; auth_key: string; sub_id: string
}

let vapidConfigured = false

function ensureVapid() {
  if (vapidConfigured) return
  const pub  = process.env.VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  const subj = process.env.VAPID_SUBJECT || 'mailto:admin@departmos.com'
  if (!pub || !priv) throw new Error('VAPID keys requeridas en .env')
  webpush.setVapidDetails(subj, pub, priv)
  vapidConfigured = true
}

export interface PushDebtPayload {
  propietarioId:     string
  propietarioNombre: string
  departamento:      string
  edificio:          string
  montoTotal:        number
  diasVencido:       number
}

// Retorna cuántas notificaciones push se enviaron realmente
export async function sendPushDebtNotification(
  payload: PushDebtPayload,
): Promise<number> {
  ensureVapid()

  // Tomar SOLO la suscripción más reciente del propietario
  // ORDER BY last_seen_at DESC LIMIT 1 garantiza el dispositivo más activo
  const subs = await query<PushSubscriptionRow>(`
    SELECT ps.id AS sub_id, ps.endpoint, ps.p256dh, ps.auth_key
    FROM push_subscriptions ps
    JOIN users u ON u.id = ps.id_user
    WHERE u.id_propietario = $1
    ORDER BY ps.last_seen_at DESC NULLS LAST
    LIMIT 1
  `, [payload.propietarioId])

  if (!subs.length) {
    console.log(`[Push] Sin suscripción activa para propietario ${payload.propietarioId} (${payload.propietarioNombre})`)
    return 0
  }

  const titulo = payload.diasVencido > 0
    ? `⚠️ Cuota vencida — ${payload.edificio}`
    : `🔔 Recordatorio — ${payload.edificio}`

  const cuerpo = `Depto ${payload.departamento}: S/. ${payload.montoTotal.toFixed(2)} ${
    payload.diasVencido > 0
      ? `vencida hace ${payload.diasVencido} día(s)`
      : `pendiente de pago`
  }`

  const data = JSON.stringify({
    title: titulo,
    body:  cuerpo,
    icon:  '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    url:   '/pagos',
    tag:   `deuda-${payload.propietarioId}`,
  })

  // Log de diagnóstico
  console.log(`[Push] Suscripciones encontradas para ${payload.propietarioNombre}: ${subs.length}`)
  console.log(`[Push] VAPID Public Key: ${process.env.VAPID_PUBLIC_KEY?.substring(0, 20)}...`)
  console.log(`[Push] Payload: ${data.substring(0, 100)}...`)

  let enviados = 0

  for (const sub of subs) {
    try {
      console.log(`[Push] Enviando a endpoint: ${sub.endpoint.substring(0, 60)}...`)
      const result = await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
        data,
      )
      console.log(`[Push] FCM status: ${result.statusCode} — ${result.body || 'OK'}`)
      enviados++
      console.log(`[Push] ✓ Enviado a dispositivo de ${payload.propietarioNombre}`)
    } catch (err: any) {
      console.error(`[Push] ✗ Error detallado:`)
      console.error(`  statusCode : ${err?.statusCode}`)
      console.error(`  body       : ${err?.body}`)
      console.error(`  headers    : ${JSON.stringify(err?.headers || {})}`)
      console.error(`  message    : ${err?.message}`)
      if (err?.statusCode === 410 || err?.statusCode === 404) {
        await query('DELETE FROM push_subscriptions WHERE id = $1', [sub.sub_id]).catch(() => {})
        console.warn(`[Push] Suscripción expirada eliminada para ${payload.propietarioNombre}`)
      } else {
        throw err
      }
    }
  }

  return enviados
}
