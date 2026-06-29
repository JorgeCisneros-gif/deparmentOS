// src/index.ts
import 'dotenv/config'
import cron from 'node-cron'
import { testConnection } from './db/connection'
import { verifySmtp } from './channels/email.channel'
import { runDebtReminder } from './jobs/debt-reminder.job'
import { runDispatcher } from './jobs/notification-dispatcher'
import { runMeterImagesHousekeeping } from './jobs/meter-images-housekeeping.job'
import { processNextReportJob, cleanupReportJobs } from './jobs/reports-processor.job'
import { config } from './config/scheduler.config'
import { startApi } from './api'

const SEP = '═'.repeat(52)

// Cron del housekeeping de meter_images.
// Configurable via env. Default: todos los días a las 3:00 AM hora Lima.
const METER_IMAGES_HK_CRON = process.env.METER_IMAGES_HOUSEKEEPING_CRON || '0 3 * * *'

// Cron del procesador de reportes async.
// Default: cada 30 segundos (toma 1 job pending si lo hay).
const REPORTS_PROCESSOR_CRON = process.env.REPORTS_PROCESSOR_CRON || '*/30 * * * * *'

// Cron de limpieza de reportes viejos.
// Default: 4 AM hora Lima (después del housekeeping de fotos).
const REPORTS_CLEANUP_CRON = process.env.REPORTS_CLEANUP_CRON || '0 4 * * *'


async function bootstrap(): Promise<void> {
  console.log(`\n${SEP}`)
  console.log(`  ${config.appName} — Scheduler Service`)
  console.log(`  ${new Date().toISOString()}`)
  console.log(SEP)

  console.log('\n[Boot] Verificando conexiones...')
  await testConnection()

  if (config.notification.channel === 'email') {
    await verifySmtp()
  }

  // Arrancar API HTTP para disparos manuales, pruebas y monitoreo
  try {
    startApi()
  } catch (err: any) {
    console.error('[Boot] ✗ Error al iniciar API HTTP:', err?.message)
  }

  // ── Job legacy: debt-reminder con cron fijo desde .env ───────
  // Se mantiene para compatibilidad — el dispatcher v2 lo reemplaza gradualmente
  const legacyExpression = config.cron.expression
  if (cron.validate(legacyExpression)) {
    cron.schedule(legacyExpression, async () => {
      console.log(`\n${'─'.repeat(52)}`)
      console.log(`[LegacyCron] ${new Date().toISOString()} — Job legacy deudas`)
      console.log('─'.repeat(52))
      try { await runDebtReminder() }
      catch (err: any) { console.error('[LegacyCron] Error:', err?.message) }
    }, { timezone: 'America/Lima' })
    console.log(`[Boot] Cron legacy registrado: "${legacyExpression}"`)
  }

  // ── Dispatcher v2: cron cada minuto — lee notificacion_config ─
  cron.schedule('* * * * *', async () => {
    try { await runDispatcher() }
    catch (err: any) { console.error('[Dispatcher] Error fatal:', err?.message) }
  }, { timezone: 'America/Lima' })

  console.log('[Boot] Dispatcher v2 registrado: cada minuto')

  // ── Housekeeping de meter_images: diario ─────────────────────
  if (cron.validate(METER_IMAGES_HK_CRON)) {
    cron.schedule(METER_IMAGES_HK_CRON, async () => {
      console.log(`\n${'─'.repeat(52)}`)
      console.log(`[MeterImagesHousekeeping] ${new Date().toISOString()}`)
      console.log('─'.repeat(52))
      try {
        await runMeterImagesHousekeeping()
      } catch (err: any) {
        console.error('[MeterImagesHousekeeping] Error:', err?.message)
      }
    }, { timezone: 'America/Lima' })

    console.log(`[Boot] Meter images housekeeping registrado: "${METER_IMAGES_HK_CRON}" (hora Lima)`)
  } else {
    console.warn(`[Boot] ⚠ Cron inválido para housekeeping: "${METER_IMAGES_HK_CRON}"`)
  }

  // ── Procesador de cola de reportes async: cada 30s ───────────
  if (cron.validate(REPORTS_PROCESSOR_CRON)) {
    cron.schedule(REPORTS_PROCESSOR_CRON, async () => {
      try {
        await processNextReportJob()
      } catch (err: any) {
        console.error('[ReportsProcessor] Error fatal:', err?.message)
      }
    }, { timezone: 'America/Lima' })

    console.log(`[Boot] Reports processor registrado: "${REPORTS_PROCESSOR_CRON}"`)
  } else {
    console.warn(`[Boot] ⚠ Cron inválido para reports processor: "${REPORTS_PROCESSOR_CRON}"`)
  }

  // ── Limpieza diaria de reportes antiguos ─────────────────────
  if (cron.validate(REPORTS_CLEANUP_CRON)) {
    cron.schedule(REPORTS_CLEANUP_CRON, async () => {
      console.log(`\n${'─'.repeat(52)}`)
      console.log(`[ReportsCleanup] ${new Date().toISOString()}`)
      console.log('─'.repeat(52))
      try {
        await cleanupReportJobs()
      } catch (err: any) {
        console.error('[ReportsCleanup] Error:', err?.message)
      }
    }, { timezone: 'America/Lima' })

    console.log(`[Boot] Reports cleanup registrado: "${REPORTS_CLEANUP_CRON}" (hora Lima)`)
  } else {
    console.warn(`[Boot] ⚠ Cron inválido para reports cleanup: "${REPORTS_CLEANUP_CRON}"`)
  }


  console.log(`[Boot] Canal activo: ${config.notification.channel}`)
  console.log(`[Boot] APP_URL: ${process.env.APP_URL || 'https://deparmentos.suite-os.app'}`)
  console.log(`[Boot] BACKEND_INTERNAL_URL: ${process.env.BACKEND_INTERNAL_URL || 'http://backend:3000'}`)
  console.log(SEP + '\n')

  // RUN_NOW para pruebas
  if (process.env.RUN_NOW === 'true') {
    console.log('[Boot] RUN_NOW=true — ejecutando dispatcher inmediatamente...\n')
    await runDispatcher()
  }
}

bootstrap().catch((err) => {
  console.error('[Boot] Error fatal al iniciar:', err)
  process.exit(1)
})
