// src/api.ts
import express from 'express'
import { runDebtReminder } from './jobs/debt-reminder.job'
import { runDispatcher } from './jobs/notification-dispatcher'
import { runVencimientoPago } from './jobs/vencimiento-pago.job'
import { runGastosGenerales } from './jobs/gastos-generales.job'
import { runRecoleccionMedicion } from './jobs/recoleccion-medicion.job'
import { runVencimientoServicio } from './jobs/vencimiento-servicio.job'
import { sendPushToPropietario, sendPushToEdificioRoles } from './channels/push.channel'
import { query } from './db/connection'

const app   = express()
const TOKEN = process.env.SCHEDULER_API_TOKEN || ''
const PORT  = parseInt(process.env.SCHEDULER_PORT || '3001')

app.use(express.json())

// ── Auth middleware ───────────────────────────────────────────
function authGuard(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!TOKEN) return next()
  const header = req.headers.authorization || ''
  const token  = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (token !== TOKEN) { res.status(401).json({ error: 'Token inválido' }); return }
  next()
}

// ── Health ────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(),
    appUrl: process.env.APP_URL || 'https://deparmentos.suite-os.app' })
})

// ── Status del día ────────────────────────────────────────────
app.get('/status', authGuard, async (_req, res) => {
  try {
    const [resumen] = await query<any>(`
      SELECT
        COUNT(*)                                       AS total,
        COUNT(*) FILTER (WHERE estado = 'enviado')    AS enviados,
        COUNT(*) FILTER (WHERE estado = 'error')      AS errores,
        COUNT(*) FILTER (WHERE estado = 'omitido')    AS omitidos,
        MAX(enviado_at)                                AS ultimo_envio
      FROM logs_notificacion
      WHERE DATE(enviado_at) = CURRENT_DATE
    `).catch(() => [{}])

    const configs = await query<any>(`
      SELECT nc.id, nt.codigo, nt.nombre, nc.cron_expresion, nc.activo, e.nombre AS edificio
      FROM notificacion_config nc
      JOIN notificacion_tipo nt ON nt.id = nc.id_tipo
      JOIN edificios e ON e.id = nc.id_edificio
      ORDER BY e.nombre, nt.orden
    `).catch(() => [])

    res.json({
      status: 'running', timestamp: new Date().toISOString(),
      appUrl: process.env.APP_URL || 'https://deparmentos.suite-os.app',
      hoy: {
        enviados: parseInt(resumen?.enviados || '0'),
        errores:  parseInt(resumen?.errores  || '0'),
        omitidos: parseInt(resumen?.omitidos || '0'),
        ultimoEnvio: resumen?.ultimo_envio || null,
      },
      configs: configs.map((c: any) => ({
        edificio: c.edificio, tipo: c.codigo, cron: c.cron_expresion, activo: c.activo,
      })),
    })
  } catch (err: any) { res.status(500).json({ error: err?.message }) }
})

// ── Dispatcher manual ─────────────────────────────────────────
let jobRunning = false

app.post('/run-now', authGuard, async (_req, res) => {
  if (jobRunning) {
    res.status(409).json({ error: 'Job en ejecución, espera que termine' }); return
  }
  res.json({ message: 'Dispatcher iniciado en background', timestamp: new Date().toISOString() })
  jobRunning = true
  console.log(`[API] Dispatcher disparado manualmente`)
  try { await runDispatcher() }
  catch (err: any) { console.error('[API] Error dispatcher:', err?.message) }
  finally { jobRunning = false }
})

// ── TEST: enviar notificación de prueba por tipo ──────────────
// POST /test/vencimiento-pago   { idEdificio, diasOffset? }
// POST /test/gastos-generales   { idEdificio, diasOffset? }
// POST /test/recoleccion        { idEdificio, destinatarios? }
// POST /test/vencimiento-svc    { idEdificio, destinatarios? }
// POST /test/push-directo       { userId, title, body, url? }

app.post('/test/vencimiento-pago', authGuard, async (req, res) => {
  const { idEdificio, diasOffset = 0 } = req.body
  if (!idEdificio) { res.status(400).json({ error: 'idEdificio requerido' }); return }
  try {
    console.log(`[API/Test] vencimiento_pago → edificio ${idEdificio}, offset ${diasOffset}`)
    await runVencimientoPago(idEdificio, diasOffset)
    res.json({ ok: true, tipo: 'vencimiento_pago', idEdificio })
  } catch (err: any) { res.status(500).json({ error: err?.message }) }
})

app.post('/test/gastos-generales', authGuard, async (req, res) => {
  const { idEdificio, diasOffset = 0 } = req.body
  if (!idEdificio) { res.status(400).json({ error: 'idEdificio requerido' }); return }
  try {
    console.log(`[API/Test] gastos_generales → edificio ${idEdificio}, offset ${diasOffset}`)
    await runGastosGenerales(idEdificio, diasOffset)
    res.json({ ok: true, tipo: 'gastos_generales', idEdificio })
  } catch (err: any) { res.status(500).json({ error: err?.message }) }
})

app.post('/test/recoleccion', authGuard, async (req, res) => {
  const { idEdificio, destinatarios = 'gestion,admin' } = req.body
  if (!idEdificio) { res.status(400).json({ error: 'idEdificio requerido' }); return }
  try {
    console.log(`[API/Test] recoleccion_medicion → edificio ${idEdificio}`)
    await runRecoleccionMedicion(idEdificio, destinatarios)
    res.json({ ok: true, tipo: 'recoleccion_medicion', idEdificio })
  } catch (err: any) { res.status(500).json({ error: err?.message }) }
})

app.post('/test/vencimiento-svc', authGuard, async (req, res) => {
  const { idEdificio, destinatarios = 'gestion,admin' } = req.body
  if (!idEdificio) { res.status(400).json({ error: 'idEdificio requerido' }); return }
  try {
    console.log(`[API/Test] vencimiento_servicio → edificio ${idEdificio}`)
    await runVencimientoServicio(idEdificio, destinatarios)
    res.json({ ok: true, tipo: 'vencimiento_servicio', idEdificio })
  } catch (err: any) { res.status(500).json({ error: err?.message }) }
})

// POST /test/push-directo — envía push inmediato a un usuario o propietario
// Body: { userId?, propietarioId?, title, body, url? }
app.post('/test/push-directo', authGuard, async (req, res) => {
  const { userId, propietarioId, title, body, url } = req.body
  if (!title || !body) { res.status(400).json({ error: 'title y body requeridos' }); return }
  if (!userId && !propietarioId) { res.status(400).json({ error: 'userId o propietarioId requerido' }); return }

  try {
    const { sendPushToUser } = await import('./channels/push.channel')
    let n = 0
    if (userId) {
      n = await sendPushToUser(userId, { title, body, url: url || '/' })
    } else {
      n = await sendPushToPropietario(propietarioId, { title, body, url: url || '/' })
    }
    res.json({ ok: true, enviados: n, message: n > 0 ? 'Push enviado' : 'Sin suscripciones activas' })
  } catch (err: any) { res.status(500).json({ error: err?.message }) }
})

// ── Logs del día ──────────────────────────────────────────────
app.get('/logs', authGuard, async (_req, res) => {
  try {
    const logs = await query<any>(`
      SELECT
        ln.id, ln.canal, ln.tipo_notificacion, ln.destinatario,
        ln.estado, ln.detalle, ln.enviado_at,
        c.periodo_mes, c.periodo_anio,
        d.nr_departamento AS departamento, e.nombre AS edificio
      FROM logs_notificacion ln
      LEFT JOIN cuotas_departamento c ON c.id = ln.cuota_id
      LEFT JOIN departamentos d       ON d.id = c.id_departamento
      LEFT JOIN edificios e           ON e.id = d.id_edificio
      WHERE DATE(ln.enviado_at) = CURRENT_DATE
      ORDER BY ln.enviado_at DESC
      LIMIT 100
    `)
    res.json({ date: new Date().toDateString(), count: logs.length, logs })
  } catch (err: any) { res.status(500).json({ error: err?.message }) }
})

export function startApi(): void {
  app.listen(PORT, () => {
    console.log(`[API] Scheduler API en http://localhost:${PORT}`)
    console.log(`[API]   GET  /health`)
    console.log(`[API]   GET  /status`)
    console.log(`[API]   GET  /logs`)
    console.log(`[API]   POST /run-now`)
    console.log(`[API]   POST /test/vencimiento-pago  { idEdificio, diasOffset? }`)
    console.log(`[API]   POST /test/gastos-generales  { idEdificio, diasOffset? }`)
    console.log(`[API]   POST /test/recoleccion        { idEdificio, destinatarios? }`)
    console.log(`[API]   POST /test/vencimiento-svc    { idEdificio, destinatarios? }`)
    console.log(`[API]   POST /test/push-directo       { userId|propietarioId, title, body, url? }`)
    if (TOKEN) console.log(`[API] Auth: Bearer token requerido`)
  })
}
