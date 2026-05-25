// src/api.ts
// Mini servidor HTTP para disparar jobs manualmente o monitorear el scheduler.
// NO es un API pública — solo uso interno/administrativo.
// Proteger con SCHEDULER_API_TOKEN en .env.

import express from 'express'
import { runDebtReminder } from './jobs/debt-reminder.job'
import { query } from './db/connection'

const app   = express()
const TOKEN = process.env.SCHEDULER_API_TOKEN || ''
const PORT  = parseInt(process.env.SCHEDULER_PORT || '3001')

app.use(express.json())

// ── Auth middleware simple ────────────────────────────────────
function authGuard(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!TOKEN) return next() // sin token configurado: acceso libre (solo dev)

  const header = req.headers.authorization || ''
  const token  = header.startsWith('Bearer ') ? header.slice(7) : ''

  if (token !== TOKEN) {
    res.status(401).json({ error: 'Token inválido' })
    return
  }
  next()
}

// ── Health check ──────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// ── Estado del scheduler ──────────────────────────────────────
app.get('/status', authGuard, async (_req, res) => {
  try {
    const [resumenHoy] = await query<any>(`
      SELECT
        COUNT(*)                                        AS total_logs_hoy,
        COUNT(*) FILTER (WHERE estado = 'enviado')     AS enviados,
        COUNT(*) FILTER (WHERE estado = 'error')       AS errores,
        COUNT(*) FILTER (WHERE estado = 'omitido')     AS omitidos,
        MAX(enviado_at)                                 AS ultimo_envio
      FROM logs_notificacion
      WHERE DATE(enviado_at) = CURRENT_DATE
    `).catch(() => [{}])

    const cuotasPendientes = await query<any>(`
      SELECT COUNT(*) AS total
      FROM cuotas_departamento
      WHERE status_pago IN ('pendiente', 'parcial', 'vencido')
    `).catch(() => [{ total: 0 }])

    res.json({
      status:           'running',
      timestamp:        new Date().toISOString(),
      hoy: {
        enviados:  parseInt(resumenHoy?.enviados  || '0'),
        errores:   parseInt(resumenHoy?.errores   || '0'),
        omitidos:  parseInt(resumenHoy?.omitidos  || '0'),
        ultimoEnvio: resumenHoy?.ultimo_envio || null,
      },
      cuotasPendientes: parseInt(cuotasPendientes[0]?.total || '0'),
    })
  } catch (err: any) {
    res.status(500).json({ error: err?.message })
  }
})

// ── Disparar job manualmente ──────────────────────────────────
// POST /run-now
// Útil para pruebas sin esperar el cron, o para re-procesar fallidos.
let jobRunning = false

app.post('/run-now', authGuard, async (_req, res) => {
  if (jobRunning) {
    res.status(409).json({ error: 'El job ya está en ejecución, espera que termine' })
    return
  }

  // Responder inmediatamente — el job corre en background
  res.json({
    message:   'Job iniciado en background',
    timestamp: new Date().toISOString(),
    statusUrl: `http://localhost:${PORT}/status`,
  })

  jobRunning = true
  console.log(`[API] Job disparado manualmente — ${new Date().toISOString()}`)

  try {
    await runDebtReminder()
    console.log('[API] Job completado correctamente')
  } catch (err: any) {
    console.error('[API] Error en job manual:', err?.message)
  } finally {
    jobRunning = false
  }
})

// ── Logs del día ──────────────────────────────────────────────
app.get('/logs', authGuard, async (_req, res) => {
  try {
    const logs = await query<any>(`
      SELECT
        ln.id,
        ln.canal,
        ln.destinatario,
        ln.estado,
        ln.detalle,
        ln.enviado_at,
        c.periodo_mes,
        c.periodo_anio,
        d.nr_departamento AS departamento,
        e.nombre          AS edificio
      FROM logs_notificacion ln
      JOIN cuotas_departamento c ON c.id = ln.cuota_id
      JOIN departamentos d       ON d.id = c.id_departamento
      JOIN edificios e           ON e.id = d.id_edificio
      WHERE DATE(ln.enviado_at) = CURRENT_DATE
      ORDER BY ln.enviado_at DESC
      LIMIT 100
    `)
    res.json({ date: new Date().toDateString(), count: logs.length, logs })
  } catch (err: any) {
    res.status(500).json({ error: err?.message })
  }
})

export function startApi(): void {
  app.listen(PORT, () => {
    console.log(`[API] Scheduler API escuchando en http://localhost:${PORT}`)
    console.log(`[API] Endpoints disponibles:`)
    console.log(`[API]   GET  /health         — estado del servidor`)
    console.log(`[API]   GET  /status         — resumen del día`)
    console.log(`[API]   POST /run-now        — disparar job manualmente`)
    console.log(`[API]   GET  /logs           — logs del día`)
    if (TOKEN) {
      console.log(`[API] Auth: Bearer token requerido`)
    } else {
      console.log(`[API] ⚠️  Sin autenticación — configurar SCHEDULER_API_TOKEN en .env`)
    }
  })
}
