// src/users/password-reset.service.ts
import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PasswordResetToken } from './password-reset.entity';
import { User } from './user.entity';
import { MailService } from '../mail/mail.service';

// Configura en .env:
// RESET_NOTIFICATION=email    → envía por correo
// RESET_NOTIFICATION=whatsapp → genera link wa.me (no envía automáticamente)
// RESET_NOTIFICATION=both     → ambos
// FRONTEND_URL=http://localhost:5173  → URL base del frontend

const EXPIRY_HOURS = 2;

@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);

  constructor(
    @InjectRepository(PasswordResetToken)
    private readonly tokenRepo: Repository<PasswordResetToken>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly mailSvc: MailService,
  ) {}

  // ── Solicitar reset ───────────────────────────────────────────

  async requestReset(email: string): Promise<{
    message:      string;
    method:       string;
    whatsappUrl?: string;   // solo si method incluye whatsapp
    resetUrl?:    string;   // solo en desarrollo
  }> {
    const user = await this.userRepo.findOne({ where: { email, isActive: true } });

    // Siempre responder igual para no revelar si el email existe
    const genericMsg = 'Si el correo está registrado, recibirás las instrucciones para restablecer tu contraseña.';

    if (!user) {
      this.logger.warn(`Reset solicitado para email no encontrado: ${email}`);
      return { message: genericMsg, method: 'none' };
    }

    // Invalidar tokens anteriores
    await this.tokenRepo.update({ userId: user.id, used: false }, { used: true });

    // Generar token seguro
    const token     = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + EXPIRY_HOURS);

    await this.tokenRepo.save(this.tokenRepo.create({ userId: user.id, token, expiresAt }));

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetUrl    = `${frontendUrl}/reset-password?token=${token}`;
    const method      = process.env.RESET_NOTIFICATION || 'email';

    const result: any = { message: genericMsg, method };

    // ── Email ─────────────────────────────────────────────────
    if (method === 'email' || method === 'both') {
      try {
        await this.mailSvc.send({
          to:      email,
          subject: '🔑 Restablecer contraseña — Edify',
          html:    this.mailSvc.buildResetPasswordEmail({
            nombre:   user.email.split('@')[0],
            resetUrl,
            expiraEn: `${EXPIRY_HOURS} horas`,
          }),
        });
        this.logger.log(`Email de reset enviado a ${email}`);
      } catch (err) {
        this.logger.error(`Error enviando email de reset: ${err.message}`);
        // En desarrollo, devolver la URL directamente
        if (process.env.NODE_ENV !== 'production') {
          result.resetUrl = resetUrl;
          result.message  = `Email no pudo enviarse (SMTP no configurado). URL de reset (solo desarrollo): ${resetUrl}`;
        }
      }
    }

    // ── WhatsApp (solo genera el link — no envía automáticamente) ──
    if (method === 'whatsapp' || method === 'both') {
      const mensaje = encodeURIComponent(
        `🔑 *Edify* — Restablece tu contraseña:\n${resetUrl}\n\n⏱ Expira en ${EXPIRY_HOURS} horas.`,
      );
      // Buscar teléfono del propietario vinculado
      let telefono = '';
      if (user.idPropietario) {
        const propData = await this.userRepo.query(
          `SELECT telefono FROM propietarios WHERE id = $1 LIMIT 1`,
          [user.idPropietario],
        );
        telefono = propData[0]?.telefono?.replace(/\D/g, '') || '';
      }
      result.whatsappUrl = telefono
        ? `https://wa.me/${telefono}?text=${mensaje}`
        : `https://wa.me/?text=${mensaje}`;
    }

    // En desarrollo siempre incluir la URL para testing
    if (process.env.NODE_ENV !== 'production' && !result.resetUrl) {
      result.resetUrl = resetUrl;
    }

    return result;
  }

  // ── Validar token ─────────────────────────────────────────────

  async validateToken(token: string): Promise<{ valid: boolean; email?: string }> {
    const t = await this.tokenRepo.findOne({
      where: { token, used: false },
      relations: ['user'],
    });

    if (!t) return { valid: false };
    if (new Date() > t.expiresAt) return { valid: false };

    return { valid: true, email: t.user.email };
  }

  // ── Aplicar nuevo password ────────────────────────────────────

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const t = await this.tokenRepo.findOne({
      where: { token, used: false },
      relations: ['user'],
    });

    if (!t) throw new BadRequestException('Token inválido o ya utilizado');
    if (new Date() > t.expiresAt) throw new BadRequestException('El enlace de recuperación ha expirado');

    const hash = await bcrypt.hash(newPassword, 12);
    await this.userRepo.update(t.userId, { passwordHash: hash });

    // Marcar token como usado
    t.used = true;
    await this.tokenRepo.save(t);

    // Invalidar otros tokens del usuario
    await this.tokenRepo.update(
      { userId: t.userId, used: false },
      { used: true },
    );

    this.logger.log(`Contraseña restablecida para usuario ${t.user.email}`);
    return { message: '✅ Contraseña actualizada correctamente. Ya puedes iniciar sesión.' };
  }
}
