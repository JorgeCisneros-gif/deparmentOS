// src/mail/mail.controller.ts
import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { MailService } from './mail.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';
import { IsEmail, IsNotEmpty, IsOptional, IsString, IsBoolean, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class TestSmtpDto {
  @ApiPropertyOptional() @IsOptional() @IsString() host?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() port?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() secure?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() user?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() pass?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() fromName?: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail()  fromEmail?: string;
}

class SendTestEmailDto {
  @ApiProperty({ example: 'test@example.com' })
  @IsEmail()
  to: string;
}

@ApiTags('Mail')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMINISTRADOR)
@Controller('mail')
export class MailController {
  constructor(private readonly mailSvc: MailService) {}

  // Obtener configuración SMTP actual (sin mostrar la contraseña)
  @Get('config')
  @ApiOperation({ summary: 'Ver configuración SMTP actual (sin contraseña)' })
  getConfig() {
    const cfg = this.mailSvc.getConfig();
    return {
      host:      cfg.host,
      port:      cfg.port,
      secure:    cfg.secure,
      user:      cfg.user,
      fromName:  cfg.fromName,
      fromEmail: cfg.fromEmail,
      passConfigured: !!cfg.pass,
      envVars: {
        SMTP_HOST:       process.env.SMTP_HOST      || '(no configurado)',
        SMTP_PORT:       process.env.SMTP_PORT      || '587',
        SMTP_SECURE:     process.env.SMTP_SECURE    || 'false',
        SMTP_USER:       process.env.SMTP_USER      || '(no configurado)',
        SMTP_FROM_NAME:  process.env.SMTP_FROM_NAME || '(no configurado)',
        SMTP_FROM_EMAIL: process.env.SMTP_FROM_EMAIL || '(usa SMTP_USER)',
        SMTP_PASS:       process.env.SMTP_PASS      ? '••••••••' : '(no configurado)',
      },
    };
  }

  // Probar conexión SMTP
  @Post('test-connection')
  @ApiOperation({ summary: 'Probar conexión SMTP (usa config del .env por defecto)' })
  testConnection(@Body() dto: TestSmtpDto) {
    return this.mailSvc.testConnection(dto);
  }

  // Enviar email de prueba
  @Post('test-send')
  @ApiOperation({ summary: 'Enviar email de prueba al destinatario indicado' })
  async testSend(@Body() dto: SendTestEmailDto) {
    await this.mailSvc.send({
      to:      dto.to,
      subject: '✅ Prueba de configuración SMTP — Edify',
      html:    `
        <div style="font-family:sans-serif;background:#1a1f2e;padding:32px;border-radius:12px;color:#a0aec0;max-width:400px;margin:0 auto">
          <h2 style="color:#f5a623;margin:0 0 16px">🏢 edify</h2>
          <p>Este es un email de prueba enviado desde la configuración SMTP de Edify.</p>
          <p>Si recibes este mensaje, la configuración está correcta ✓</p>
          <p style="font-size:0.8rem;color:#4a5568;margin-top:24px">Enviado: ${new Date().toLocaleString('es-PE')}</p>
        </div>`,
    });
    return { ok: true, message: `Email de prueba enviado a ${dto.to}` };
  }
}
