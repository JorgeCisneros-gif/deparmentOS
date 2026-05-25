// src/notifications/push.controller.ts
import {
  Controller, Post, Delete, Get, Patch, Body,
  Request, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PushService, SubscribeDto } from './push.service';

@ApiTags('Push Notifications')
@Controller('push')
export class PushController {
  constructor(private readonly pushSvc: PushService) {}

  // ── Público — no requiere auth ────────────────────────────────
  // Se llama antes del login para obtener la clave de suscripción
  @Get('vapid-public-key')
  @ApiOperation({ summary: 'Obtener clave pública VAPID (pública)' })
  getVapidPublicKey() {
    return { publicKey: process.env.VAPID_PUBLIC_KEY || '' };
  }

  // ── Requieren auth ────────────────────────────────────────────
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Post('subscribe')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Registrar suscripción push (propietario)' })
  subscribe(@Request() req: any, @Body() dto: SubscribeDto) {
    return this.pushSvc.subscribe(req.user.id, dto);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Patch('heartbeat')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Actualizar timestamp de última actividad' })
  heartbeat(@Request() req: any, @Body() body: { endpoint: string }) {
    return this.pushSvc.heartbeat(req.user.id, body.endpoint);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Delete('unsubscribe')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar suscripción push' })
  unsubscribe(@Request() req: any, @Body() body: { endpoint: string }) {
    return this.pushSvc.unsubscribe(req.user.id, body.endpoint);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Get('subscriptions')
  @ApiOperation({ summary: 'Listar dispositivos suscritos del usuario' })
  getSubscriptions(@Request() req: any) {
    return this.pushSvc.getSubscriptions(req.user.id);
  }
}
