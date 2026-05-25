import nodemailer from 'nodemailer'
import { config } from '../config/scheduler.config'

// ── Tipos ─────────────────────────────────────────────────────
export interface DebtNotificationPayload {
  propietarioNombre:  string
  propietarioCorreo:  string
  departamento:       string
  edificio:           string
  periodoMes:         number
  periodoAnio:        number
  montoTotal:         number
  fechaVencimiento:   string | null
  diasVencido:        number   // positivo = ya venció, negativo = faltan N días
}

// ── Transporter ──────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  host:   config.email.host,
  port:   config.email.port,
  secure: config.email.secure,
  auth: {
    user: config.email.user,
    pass: config.email.pass,
  },
})

// ── Template HTML ─────────────────────────────────────────────
function buildHtml(p: DebtNotificationPayload): string {
  const MESES = [
    '', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Setiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ]

  const estadoTexto = p.diasVencido > 0
    ? `<span style="color:#ef4444;font-weight:700;">Vencida hace ${p.diasVencido} día(s)</span>`
    : p.diasVencido === 0
    ? `<span style="color:#f59e0b;font-weight:700;">Vence hoy</span>`
    : `<span style="color:#f59e0b;font-weight:700;">Vence en ${Math.abs(p.diasVencido)} día(s)</span>`

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Recordatorio de pago — ${config.appName}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table width="600" cellpadding="0" cellspacing="0"
               style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#0f1117,#1a1f2e);padding:32px;text-align:center;">
              <h1 style="color:#f5a623;margin:0;font-size:28px;letter-spacing:-0.5px;">
                ${config.appName}
              </h1>
              <p style="color:#94a3b8;margin:8px 0 0;font-size:14px;">
                Gestión inteligente de edificios
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <p style="color:#374151;font-size:16px;margin:0 0 8px;">
                Estimado/a <strong>${p.propietarioNombre}</strong>,
              </p>
              <p style="color:#6b7280;font-size:15px;margin:0 0 24px;">
                Le recordamos que tiene una cuota de mantenimiento pendiente de pago:
              </p>

              <!-- Detalle cuota -->
              <table width="100%" cellpadding="0" cellspacing="0"
                     style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:24px;">
                <tr style="background:#f1f5f9;">
                  <td colspan="2" style="padding:14px 20px;font-weight:700;color:#374151;font-size:14px;text-transform:uppercase;letter-spacing:0.05em;">
                    Detalle de la cuota
                  </td>
                </tr>
                ${[
                  ['Edificio',    p.edificio],
                  ['Departamento', `Depto ${p.departamento}`],
                  ['Período',     `${MESES[p.periodoMes]} ${p.periodoAnio}`],
                  ['Vencimiento', p.fechaVencimiento ?? 'No especificada'],
                  ['Estado',      estadoTexto],
                ].map(([label, value]) => `
                  <tr>
                    <td style="padding:12px 20px;color:#6b7280;font-size:14px;border-top:1px solid #e2e8f0;width:40%;">${label}</td>
                    <td style="padding:12px 20px;color:#374151;font-size:14px;border-top:1px solid #e2e8f0;">${value}</td>
                  </tr>
                `).join('')}
                <!-- Monto resaltado -->
                <tr style="background:#0f1117;">
                  <td style="padding:16px 20px;color:#94a3b8;font-size:15px;font-weight:600;">
                    Monto total
                  </td>
                  <td style="padding:16px 20px;color:#f5a623;font-size:22px;font-weight:800;">
                    S/. ${p.montoTotal.toFixed(2)}
                  </td>
                </tr>
              </table>

              <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0 0 24px;">
                Por favor realice el pago a la brevedad posible para evitar recargos.
                Si ya realizó el pago, ignore este mensaje.
              </p>

              <p style="color:#9ca3af;font-size:13px;margin:0;">
                Este es un mensaje automático generado por ${config.appName}.
                No responda a este correo.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;padding:20px;text-align:center;border-top:1px solid #e2e8f0;">
              <p style="color:#9ca3af;font-size:12px;margin:0;">
                ${config.appName} © ${new Date().getFullYear()} — Gestión inteligente de edificios
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

// ── Función principal de envío ────────────────────────────────
export async function sendDebtEmail(
  payload: DebtNotificationPayload,
): Promise<void> {
  const MESES = [
    '', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Setiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ]

  const asunto = payload.diasVencido > 0
    ? `⚠️ Cuota vencida — ${payload.edificio} Depto ${payload.departamento}`
    : `🔔 Recordatorio de pago — ${MESES[payload.periodoMes]} ${payload.periodoAnio}`

  await transporter.sendMail({
    from:    config.email.from,
    to:      payload.propietarioCorreo,
    subject: asunto,
    html:    buildHtml(payload),
  })
}

// Verificar conexión SMTP al arrancar
export async function verifySmtp(): Promise<void> {
  await transporter.verify()
  console.log('[Email] SMTP OK —', config.email.host)
}
