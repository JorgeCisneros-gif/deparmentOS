// src/index.ts
import 'dotenv/config'
import cron from 'node-cron'
import { testConnection } from './db/connection'
import { verifySmtp } from './channels/email.channel'
import { runDebtReminder } from './jobs/debt-reminder.job'
import { runDispatcher } from './jobs/notification-dispatcher'
import { runMeterImagesHousekeeping } from './jobs/meter-images-housekeeping.job'
import { config } from './config/scheduler.config'
import { startApi } from './api'

const SEP = '═'.repeat(52)

// Cron del housekeeping de meter_images.
// Configurable via env. Default: todos los días a las 3:00 AM hora Lima.
const METER_IMAGES_HK_CRON = process.env.METER_IMAGES_HOUSEKEEPING_CRON || '0 3 * * *'

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
