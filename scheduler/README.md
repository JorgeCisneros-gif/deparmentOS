# DepartmOS Scheduler

Proceso batch de notificaciones automáticas para DepartmOS.  
Corre **independiente del backend** — un solo cron diario, una sola consulta, un solo tipo de notificación.

## Estructura

```
src/
├── index.ts                   ← Entry point, registra el cron
├── config/
│   └── scheduler.config.ts   ← Lee variables de .env
├── db/
│   └── connection.ts         ← Pool PostgreSQL (misma BD que el backend)
├── jobs/
│   └── debt-reminder.job.ts  ← Lógica principal: busca deudas y notifica
└── channels/
    ├── email.channel.ts      ← Envío por email (SMTP / Resend)
    └── push.channel.ts       ← Placeholder para PWA (futuro)
```

## Instalación

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus valores de BD y SMTP

# 3. Ejecutar migración en BD (UNA SOLA VEZ)
psql -h localhost -U edify_user -d edify_core -f migration_scheduler.sql
```

## Configuración (.env)

| Variable | Descripción | Ejemplo |
|---|---|---|
| `DB_HOST` | Host de PostgreSQL | `localhost` |
| `DB_NAME` | Nombre de la BD | `edify_core` |
| `SCHEDULER_CRON` | Expresión cron del job | `0 9 * * *` |
| `NOTIFICATION_CHANNEL` | Canal activo | `email` |
| `SMTP_HOST` | Servidor SMTP | `smtp.gmail.com` |
| `SMTP_USER` | Usuario SMTP | `tu@gmail.com` |
| `SMTP_PASS` | Contraseña / App Password | `xxxx xxxx xxxx xxxx` |

## Ejecución

```bash
# Desarrollo (con recarga automática)
npm run dev

# Ejecutar el job AHORA mismo (para probar sin esperar el cron)
RUN_NOW=true npm run dev

# Producción
npm run build
npm start
```

## El cron explicado

```
"0 9 * * *"
 │ │ │ │ └── cualquier día de la semana
 │ │ │ └──── cualquier mes
 │ │ └────── cualquier día del mes
 │ └──────── a las 9 AM
 └────────── minuto 0
```

Otros ejemplos útiles:
- `0 8 * * 1-5` — lunes a viernes a las 8 AM
- `*/5 * * * *` — cada 5 minutos (para pruebas)
- `0 9,18 * * *` — a las 9 AM y 6 PM

## Flujo del job

```
1. Consulta BD: todas las cuotas pendientes/vencidas con propietario y correo
2. Para cada cuota:
   a. ¿Ya se notificó hoy? → SKIP (anti-duplicado por fecha)
   b. Envía email con template HTML
   c. Registra resultado en logs_notificacion
3. Imprime resumen: enviados / omitidos / errores
```

## Monitoreo

Consultar logs del día desde psql:
```sql
SELECT * FROM v_scheduler_resumen_hoy;
SELECT * FROM v_cuotas_pendientes_contacto;
```

## Email con Gmail

1. Activar verificación en 2 pasos en tu cuenta Google
2. Ir a [Contraseñas de aplicación](https://myaccount.google.com/apppasswords)
3. Crear una contraseña para "Correo" → "Otro (nombre personalizado)"
4. Usar esa contraseña de 16 caracteres en `SMTP_PASS`

## Email con Resend (recomendado)

1. Crear cuenta en [resend.com](https://resend.com) — gratis 3,000 emails/mes
2. Agregar y verificar tu dominio
3. Obtener API key
4. En `.env`: `SMTP_HOST=smtp.resend.com`, `SMTP_USER=resend`, `SMTP_PASS=re_xxxxx`
