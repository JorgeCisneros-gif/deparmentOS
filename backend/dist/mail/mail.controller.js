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
Object.defineProperty(exports, "__esModule", { value: true });
exports.MailController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const mail_service_1 = require("./mail.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const user_entity_1 = require("../users/user.entity");
const class_validator_1 = require("class-validator");
const swagger_2 = require("@nestjs/swagger");
class TestSmtpDto {
}
__decorate([
    (0, swagger_2.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], TestSmtpDto.prototype, "host", void 0);
__decorate([
    (0, swagger_2.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], TestSmtpDto.prototype, "port", void 0);
__decorate([
    (0, swagger_2.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], TestSmtpDto.prototype, "secure", void 0);
__decorate([
    (0, swagger_2.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], TestSmtpDto.prototype, "user", void 0);
__decorate([
    (0, swagger_2.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], TestSmtpDto.prototype, "pass", void 0);
__decorate([
    (0, swagger_2.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], TestSmtpDto.prototype, "fromName", void 0);
__decorate([
    (0, swagger_2.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], TestSmtpDto.prototype, "fromEmail", void 0);
class SendTestEmailDto {
}
__decorate([
    (0, swagger_2.ApiProperty)({ example: 'test@example.com' }),
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], SendTestEmailDto.prototype, "to", void 0);
let MailController = class MailController {
    constructor(mailSvc) {
        this.mailSvc = mailSvc;
    }
    getConfig() {
        const cfg = this.mailSvc.getConfig();
        return {
            host: cfg.host,
            port: cfg.port,
            secure: cfg.secure,
            user: cfg.user,
            fromName: cfg.fromName,
            fromEmail: cfg.fromEmail,
            passConfigured: !!cfg.pass,
            envVars: {
                SMTP_HOST: process.env.SMTP_HOST || '(no configurado)',
                SMTP_PORT: process.env.SMTP_PORT || '587',
                SMTP_SECURE: process.env.SMTP_SECURE || 'false',
                SMTP_USER: process.env.SMTP_USER || '(no configurado)',
                SMTP_FROM_NAME: process.env.SMTP_FROM_NAME || '(no configurado)',
                SMTP_FROM_EMAIL: process.env.SMTP_FROM_EMAIL || '(usa SMTP_USER)',
                SMTP_PASS: process.env.SMTP_PASS ? '••••••••' : '(no configurado)',
            },
        };
    }
    testConnection(dto) {
        return this.mailSvc.testConnection(dto);
    }
    async testSend(dto) {
        await this.mailSvc.send({
            to: dto.to,
            subject: '✅ Prueba de configuración SMTP — Edify',
            html: `
        <div style="font-family:sans-serif;background:#1a1f2e;padding:32px;border-radius:12px;color:#a0aec0;max-width:400px;margin:0 auto">
          <h2 style="color:#f5a623;margin:0 0 16px">🏢 edify</h2>
          <p>Este es un email de prueba enviado desde la configuración SMTP de Edify.</p>
          <p>Si recibes este mensaje, la configuración está correcta ✓</p>
          <p style="font-size:0.8rem;color:#4a5568;margin-top:24px">Enviado: ${new Date().toLocaleString('es-PE')}</p>
        </div>`,
        });
        return { ok: true, message: `Email de prueba enviado a ${dto.to}` };
    }
};
exports.MailController = MailController;
__decorate([
    (0, common_1.Get)('config'),
    (0, swagger_1.ApiOperation)({ summary: 'Ver configuración SMTP actual (sin contraseña)' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], MailController.prototype, "getConfig", null);
__decorate([
    (0, common_1.Post)('test-connection'),
    (0, swagger_1.ApiOperation)({ summary: 'Probar conexión SMTP (usa config del .env por defecto)' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [TestSmtpDto]),
    __metadata("design:returntype", void 0)
], MailController.prototype, "testConnection", null);
__decorate([
    (0, common_1.Post)('test-send'),
    (0, swagger_1.ApiOperation)({ summary: 'Enviar email de prueba al destinatario indicado' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [SendTestEmailDto]),
    __metadata("design:returntype", Promise)
], MailController.prototype, "testSend", null);
exports.MailController = MailController = __decorate([
    (0, swagger_1.ApiTags)('Mail'),
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(user_entity_1.UserRole.SUPERVISOR),
    (0, common_1.Controller)('mail'),
    __metadata("design:paramtypes", [mail_service_1.MailService])
], MailController);
//# sourceMappingURL=mail.controller.js.map