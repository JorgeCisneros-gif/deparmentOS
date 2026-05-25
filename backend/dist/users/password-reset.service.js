"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var PasswordResetService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PasswordResetService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const password_reset_entity_1 = require("./password-reset.entity");
const user_entity_1 = require("./user.entity");
const mail_service_1 = require("../mail/mail.service");
const EXPIRY_HOURS = 2;
let PasswordResetService = PasswordResetService_1 = class PasswordResetService {
    constructor(tokenRepo, userRepo, mailSvc) {
        this.tokenRepo = tokenRepo;
        this.userRepo = userRepo;
        this.mailSvc = mailSvc;
        this.logger = new common_1.Logger(PasswordResetService_1.name);
    }
    async requestReset(email) {
        const user = await this.userRepo.findOne({ where: { email, isActive: true } });
        const genericMsg = 'Si el correo está registrado, recibirás las instrucciones para restablecer tu contraseña.';
        if (!user) {
            this.logger.warn(`Reset solicitado para email no encontrado: ${email}`);
            return { message: genericMsg, method: 'none' };
        }
        await this.tokenRepo.update({ userId: user.id, used: false }, { used: true });
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + EXPIRY_HOURS);
        await this.tokenRepo.save(this.tokenRepo.create({ userId: user.id, token, expiresAt }));
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const resetUrl = `${frontendUrl}/reset-password?token=${token}`;
        const method = process.env.RESET_NOTIFICATION || 'email';
        const result = { message: genericMsg, method };
        if (method === 'email' || method === 'both') {
            try {
                await this.mailSvc.send({
                    to: email,
                    subject: '🔑 Restablecer contraseña — Edify',
                    html: this.mailSvc.buildResetPasswordEmail({
                        nombre: user.email.split('@')[0],
                        resetUrl,
                        expiraEn: `${EXPIRY_HOURS} horas`,
                    }),
                });
                this.logger.log(`Email de reset enviado a ${email}`);
            }
            catch (err) {
                this.logger.error(`Error enviando email de reset: ${err.message}`);
                if (process.env.NODE_ENV !== 'production') {
                    result.resetUrl = resetUrl;
                    result.message = `Email no pudo enviarse (SMTP no configurado). URL de reset (solo desarrollo): ${resetUrl}`;
                }
            }
        }
        if (method === 'whatsapp' || method === 'both') {
            const mensaje = encodeURIComponent(`🔑 *Edify* — Restablece tu contraseña:\n${resetUrl}\n\n⏱ Expira en ${EXPIRY_HOURS} horas.`);
            let telefono = '';
            if (user.idPropietario) {
                const propData = await this.userRepo.query(`SELECT telefono FROM propietarios WHERE id = $1 LIMIT 1`, [user.idPropietario]);
                telefono = propData[0]?.telefono?.replace(/\D/g, '') || '';
            }
            result.whatsappUrl = telefono
                ? `https://wa.me/${telefono}?text=${mensaje}`
                : `https://wa.me/?text=${mensaje}`;
        }
        if (process.env.NODE_ENV !== 'production' && !result.resetUrl) {
            result.resetUrl = resetUrl;
        }
        return result;
    }
    async validateToken(token) {
        const t = await this.tokenRepo.findOne({
            where: { token, used: false },
            relations: ['user'],
        });
        if (!t)
            return { valid: false };
        if (new Date() > t.expiresAt)
            return { valid: false };
        return { valid: true, email: t.user.email };
    }
    async resetPassword(token, newPassword) {
        const t = await this.tokenRepo.findOne({
            where: { token, used: false },
            relations: ['user'],
        });
        if (!t)
            throw new common_1.BadRequestException('Token inválido o ya utilizado');
        if (new Date() > t.expiresAt)
            throw new common_1.BadRequestException('El enlace de recuperación ha expirado');
        const hash = await bcrypt.hash(newPassword, 12);
        await this.userRepo.update(t.userId, { passwordHash: hash });
        t.used = true;
        await this.tokenRepo.save(t);
        await this.tokenRepo.update({ userId: t.userId, used: false }, { used: true });
        this.logger.log(`Contraseña restablecida para usuario ${t.user.email}`);
        return { message: '✅ Contraseña actualizada correctamente. Ya puedes iniciar sesión.' };
    }
};
exports.PasswordResetService = PasswordResetService;
exports.PasswordResetService = PasswordResetService = PasswordResetService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(password_reset_entity_1.PasswordResetToken)),
    __param(1, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        mail_service_1.MailService])
], PasswordResetService);
//# sourceMappingURL=password-reset.service.js.map