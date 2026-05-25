// src/mail/mail.service.ts
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

export interface SendMailDto {
  to:       string;
  subject:  string;
  html:     string;
  text?:    string;
}

export interface SmtpConfig {
  host:     string;
  port:     number;
  secure:   boolean;   // true = SSL/TLS (puerto 465), false = STARTTLS (587)
  user:     string;
  pass:     string;
  fromName: string;
  fromEmail: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  // Leer configuración desde .env en tiempo de ejecución
  // Esto permite cambiarla sin recompilar
  getConfig(): SmtpConfig {
    return {
      host:      process.env.SMTP_HOST      || 'smtp.gmail.com',
      port:      parseInt(process.env.SMTP_PORT || '587'),
      secure:    process.env.SMTP_SECURE    === 'true',
      user:      process.env.SMTP_USER      || '',
      pass:      process.env.SMTP_PASS      || '',
      fromName:  process.env.SMTP_FROM_NAME || 'Edify Sistema',
      fromEmail: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || '',
    };
  }

  private createTransporter(cfg: SmtpConfig) {
    return nodemailer.createTransport({
      host:   cfg.host,
      port:   cfg.port,
      secure: cfg.secure,
      auth: {
        user: cfg.user,
        pass: cfg.pass,
      },
      tls: { rejectUnauthorized: false },
    });
  }

  async send(dto: SendMailDto): Promise<void> {
    const cfg = this.getConfig();

    if (!cfg.user || !cfg.pass) {
      throw new BadRequestException(
        'SMTP no configurado. Agrega SMTP_USER y SMTP_PASS en el archivo .env',
      );
    }

    const transporter = this.createTransporter(cfg);

    try {
      const info = await transporter.sendMail({
        from:    `"${cfg.fromName}" <${cfg.fromEmail}>`,
        to:      dto.to,
        subject: dto.subject,
        html:    dto.html,
        text:    dto.text || dto.html.replace(/<[^>]+>/g, ''),
      });
      this.logger.log(`Email enviado a ${dto.to} — messageId: ${info.messageId}`);
    } catch (err) {
      this.logger.error(`Error enviando email a ${dto.to}: ${err.message}`);
      throw new BadRequestException(`Error enviando email: ${err.message}`);
    }
  }

  // Verificar conexión SMTP
  async testConnection(cfg?: Partial<SmtpConfig>): Promise<{ ok: boolean; message: string }> {
    const config = { ...this.getConfig(), ...cfg };
    if (!config.user || !config.pass) {
      return { ok: false, message: 'Faltan credenciales SMTP' };
    }
    try {
      const transporter = this.createTransporter(config as SmtpConfig);
      await transporter.verify();
      return { ok: true, message: 'Conexión SMTP exitosa ✓' };
    } catch (err) {
      return { ok: false, message: `Error: ${err.message}` };
    }
  }

  // Plantilla HTML para reset de contraseña
  buildResetPasswordEmail(opts: {
    nombre:    string;
    resetUrl:  string;
    expiraEn:  string;   // "2 horas"
  }): string {
    return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f1117; margin: 0; padding: 20px; }
  .container { max-width: 480px; margin: 0 auto; background: #1a1f2e; border-radius: 12px; border: 1px solid #2a2f3e; overflow: hidden; }
  .header { background: #f5a623; padding: 24px; text-align: center; }
  .header h1 { color: #0f1117; margin: 0; font-size: 1.4rem; font-weight: 800; }
  .body { padding: 32px; }
  .body p { color: #a0aec0; line-height: 1.6; margin: 0 0 16px; }
  .body strong { color: #e2e8f0; }
  .btn { display: block; background: #f5a623; color: #0f1117; text-decoration: none; text-align: center; padding: 14px 24px; border-radius: 8px; font-weight: 700; font-size: 1rem; margin: 24px 0; }
  .expiry { background: rgba(245,166,35,0.08); border: 1px solid rgba(245,166,35,0.2); border-radius: 8px; padding: 12px 16px; color: #f5a623; font-size: 0.85rem; text-align: center; }
  .footer { padding: 20px 32px; border-top: 1px solid #2a2f3e; color: #4a5568; font-size: 0.8rem; text-align: center; }
</style>
</head>
<body>
<div class="container">
  <div class="header"><h1>🏢 edify</h1></div>
  <div class="body">
    <p>Hola <strong>${opts.nombre}</strong>,</p>
    <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta en Edify.</p>
    <a href="${opts.resetUrl}" class="btn">Restablecer contraseña</a>
    <div class="expiry">⏱ Este enlace expira en <strong>${opts.expiraEn}</strong></div>
    <p style="margin-top:20px; font-size:0.85rem;">Si no solicitaste este cambio, puedes ignorar este correo. Tu contraseña no cambiará.</p>
  </div>
  <div class="footer">Edify · Sistema de gestión de edificios</div>
</div>
</body>
</html>`;
  }
}
