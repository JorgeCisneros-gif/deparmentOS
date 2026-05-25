// Configuración central del scheduler
// Todos los valores se leen desde .env para que sean modificables sin recompilar

export const config = {
  appName: process.env.APP_NAME || 'DepartmOS',

  cron: {
    // Expresión cron para el job diario
    // Default: todos los días a las 9:00 AM
    expression: process.env.SCHEDULER_CRON || '0 9 * * *',
  },

  notification: {
    // Canal de envío activo: 'email' | 'push'
    channel: (process.env.NOTIFICATION_CHANNEL || 'email') as 'email' | 'push',
  },

  email: {
    host:   process.env.SMTP_HOST || 'smtp.gmail.com',
    port:   parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    user:   process.env.SMTP_USER || '',
    pass:   process.env.SMTP_PASS || '',
    from:   process.env.EMAIL_FROM || `DepartmOS <no-reply@departmos.com>`,
  },
}
