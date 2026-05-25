import 'dotenv/config'
import cron from 'node-cron'
import { testConnection } from './db/connection'
import { verifySmtp } from './channels/email.channel'
import { runDebtReminder } from './jobs/debt-reminder.job'
import { config } from './config/scheduler.config'
import { startApi } from './api'

const SEP = '═'.repeat(52)

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

  const expression = config.cron.expression

  if (!cron.validate(expression)) {
    console.error(`[Boot] ✗ Expresión cron inválida: "${expression}"`)
    process.exit(1)
  }

  // Arrancar API HTTP para disparos manuales y monitoreo
  try {
    startApi()
  } catch (err: any) {
    console.error('[Boot] ✗ Error al iniciar API HTTP:', err?.message)
    console.error('[Boot]   ¿Instalaste express? Ejecuta: npm install express @types/express')
  }

  console.log(`\n[Boot] Cron registrado: "${expression}"`)
  console.log(`[Boot] Canal activo   : ${config.notification.channel}\n`)
  console.log(SEP + '\n')

  cron.schedule(expression, async () => {
    console.log(`\n${'─'.repeat(52)}`)
    console.log(`[Cron] ${new Date().toISOString()} — Iniciando job de deudas`)
    console.log('─'.repeat(52))
    try {
      await runDebtReminder()
    } catch (err: any) {
      console.error('[Cron] Error fatal en el job:', err?.message || err)
    }
    console.log(`[Cron] Job finalizado — ${new Date().toISOString()}\n`)
  }, {
    timezone: 'America/Lima',
  })

  if (process.env.RUN_NOW === 'true') {
    console.log('[Boot] RUN_NOW=true — ejecutando job inmediatamente...\n')
    await runDebtReminder()
  }
}

bootstrap().catch((err) => {
  console.error('[Boot] Error fatal al iniciar:', err)
  process.exit(1)
})
