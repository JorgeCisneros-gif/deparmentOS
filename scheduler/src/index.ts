// src/index.ts
import 'dotenv/config'
import cron from 'node-cron'
import { testConnection } from './db/connection'
import { verifySmtp } from './channels/email.channel'
import { runDebtReminder } from './jobs/debt-reminder.job'
import { runDispatcher } from './jobs/notification-dispatcher'
import { runMeterImagesHousekeeping } from './jobs/meter-images-housekeeping.job'
import { runVouchersHousekeeping } from './jobs/vouchers-housekeeping.job'
import { config } from './config/scheduler.config'
import { startApi } from './api'

const SEP = '═'.repeat(52)

// Cron del housekeeping de meter_images.
// Default: todos los días a las 3:00 AM hora Lima.
const METER_IMAGES_HK_CRON = process.env.METER_IMAGES_HOUSEKEEPING_CRON || '0 3 * * *'

// Cron del housekeeping de comprobantes de pago.
// Default: todos los días a las 3:15 AM hora Lima (15 min después de mediciones).
const VOUCHERS_HK_CRON = process.env.VOUCHERS_HOUSEKEEPING_CRON || '15 3 * * *'


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

  try {
    startApi()
  } catch (err: any) {
    console.error('[Boot] ✗ Error al iniciar API HTTP:', err?.message)
  }

  // ── Job legacy: debt-reminder ──
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

  // ── Dispatcher v2: cada minuto ──
  cron.schedule('* * * * *', async () => {
    try { await runDispatcher() }
    catch (err: any) { console.error('[Dispatcher] Error fatal:', err?.message) }
  }, { timezone: 'America/Lima' })

  console.log('[Boot] Dispatcher v2 registrado: cada minuto')

  // ── Housekeeping de meter_images: diario ──
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
    console.warn(`[Boot] ⚠ Cron inválido para meter housekeeping: "${METER_IMAGES_HK_CRON}"`)
  }

  // ── Housekeeping de payment_vouchers: diario ──
  if (cron.validate(VOUCHERS_HK_CRON)) {
    cron.schedule(VOUCHERS_HK_CRON, async () => {
      console.log(`\n${'─'.repeat(52)}`)
      console.log(`[VouchersHousekeeping] ${new Date().toISOString()}`)
      console.log('─'.repeat(52))
      try {
        await runVouchersHousekeeping()
      } catch (err: any) {
        console.error('[VouchersHousekeeping] Error:', err?.message)
      }
    }, { timezone: 'America/Lima' })

    console.log(`[Boot] Vouchers housekeeping registrado: "${VOUCHERS_HK_CRON}" (hora Lima)`)
  } else {
    console.warn(`[Boot] ⚠ Cron inválido para vouchers housekeeping: "${VOUCHERS_HK_CRON}"`)
  }


  console.log(`[Boot] Canal activo: ${config.notification.channel}`)
  console.log(`[Boot] APP_URL: ${process.env.APP_URL || 'https://deparmentos.suite-os.app'}`)
  console.log(`[Boot] BACKEND_INTERNAL_URL: ${process.env.BACKEND_INTERNAL_URL || 'http://backend:3000'}`)
  console.log(SEP + '\n')

  if (process.env.RUN_NOW === 'true') {
    console.log('[Boot] RUN_NOW=true — ejecutando dispatcher inmediatamente...\n')
    await runDispatcher()
  }
}

bootstrap().catch((err) => {
  console.error('[Boot] Error fatal al iniciar:', err)
  process.exit(1)
})
