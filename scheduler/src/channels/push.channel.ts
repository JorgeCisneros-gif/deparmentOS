// src/channels/push.channel.ts
import * as webpush from 'web-push'
import { query } from '../db/connection'

// URL base de la app en producción
const APP_URL = process.env.APP_URL || 'https://deparmentos.suite-os.app'

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

// ── Payload genérico para cualquier notificación ──────────────
export interface PushPayload {
  title: string
  body:  string
  url?:  string   // ruta relativa: '/pagos', '/readings/new', etc.
  tag?:  string   // evita duplicados en el dispositivo
  icon?: string
}

// ── Envío a un usuario por su userId ─────────────────────────
export async function sendPushToUser(
  userId: string,
  payload: PushPayload,
): Promise<number> {
  ensureVapid()

  const subs = await query<PushSubscriptionRow>(`
    SELECT id AS sub_id, endpoint, p256dh, auth_key
    FROM push_subscriptions
    WHERE id_user = $1
    ORDER BY last_seen_at DESC NULLS LAST
    LIMIT 1
  `, [userId])

  if (!subs.length) {
    console.log(`[Push] Sin suscripción activa para usuario ${userId}`)
    return 0
  }

  return sendToSubscriptions(subs, payload)
}

// ── Envío a un propietario por su propietarioId ───────────────
export async function sendPushToPropietario(
  propietarioId: string,
  payload: PushPayload,
): Promise<number> {
  ensureVapid()

  const subs = await query<PushSubscriptionRow>(`
    SELECT ps.id AS sub_id, ps.endpoint, ps.p256dh, ps.auth_key
    FROM push_subscriptions ps
    JOIN users u ON u.id = ps.id_user
    WHERE u.id_propietario = $1
    ORDER BY ps.last_seen_at DESC NULLS LAST
    LIMIT 1
  `, [propietarioId])

  if (!subs.length) {
    console.log(`[Push] Sin suscripción activa para propietario ${propietarioId}`)
    return 0
  }

  return sendToSubscriptions(subs, payload)
}

// ── Envío a todos los usuarios de un rol en un edificio ───────
export async function sendPushToEdificioRoles(
  idEdificio: string,
  roles: string[],
  payload: PushPayload,
): Promise<number> {
  ensureVapid()

  // Obtener id_grupo del edificio
  const edificioRows = await query<{ id_grupo: string }>(
    `SELECT id_grupo FROM edificios WHERE id = $1`, [idEdificio]
  )
  if (!edificioRows.length) return 0
  const idGrupo = edificioRows[0].id_grupo

  const subs = await query<PushSubscriptionRow>(`
    SELECT ps.id AS sub_id, ps.endpoint, ps.p256dh, ps.auth_key
    FROM push_subscriptions ps
    JOIN users u ON u.id = ps.id_user
    WHERE u.id_grupo = $1
      AND u.role = ANY($2::text[])
      AND u.is_active = true
    ORDER BY ps.last_seen_at DESC NULLS LAST
  `, [idGrupo, roles])

  if (!subs.length) {
    console.log(`[Push] Sin suscripciones activas para roles ${roles.join(',')} en grupo ${idGrupo}`)
    return 0
  }

  return sendToSubscriptions(subs, payload)
}

// ── Función interna de envío ──────────────────────────────────
async function sendToSubscriptions(
  subs: PushSubscriptionRow[],
  payload: PushPayload,
): Promise<number> {
  // URL absoluta siempre — evita redirect a ngrok u otros orígenes
  const absoluteUrl = payload.url
    ? (payload.url.startsWith('http') ? payload.url : `${APP_URL}${payload.url}`)
    : APP_URL

  const data = JSON.stringify({
    title: payload.title,
    body:  payload.body,
    icon:  payload.icon || '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    url:   absoluteUrl,
    tag:   payload.tag || 'departmos-notif',
  })

  let enviados = 0

  for (const sub of subs) {
    try {
      const result = await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
        data,
      )
      console.log(`[Push] ✓ Enviado (${result.statusCode}) → ${sub.endpoint.substring(0, 60)}...`)
      enviados++
    } catch (err: any) {
      console.error(`[Push] ✗ Error: ${err?.statusCode} — ${err?.body || err?.message}`)
      if (err?.statusCode === 410 || err?.statusCode === 404) {
        await query('DELETE FROM push_subscriptions WHERE id = $1', [sub.sub_id]).catch(() => {})
        console.warn(`[Push] Suscripción expirada eliminada (${sub.sub_id})`)
      }
    }
  }

  return enviados
}

// ── Mantener compatibilidad con el job antiguo ────────────────
export interface PushDebtPayload {
  propietarioId:     string
  propietarioNombre: string
  departamento:      string
  edificio:          string
  montoTotal:        number
  diasVencido:       number
}

export async function sendPushDebtNotification(
  payload: PushDebtPayload,
): Promise<number> {
  const titulo = payload.diasVencido > 0
    ? `⚠️ Cuota vencida — ${payload.edificio}`
    : `🔔 Recordatorio — ${payload.edificio}`

  const cuerpo = `Depto ${payload.departamento}: S/. ${payload.montoTotal.toFixed(2)} ${
    payload.diasVencido > 0
      ? `vencida hace ${payload.diasVencido} día(s)`
      : `pendiente de pago`
  }`

  return sendPushToPropietario(payload.propietarioId, {
    title: titulo,
    body:  cuerpo,
    url:   '/mis-pagos',
    tag:   `deuda-${payload.propietarioId}`,
  })
}
