// src/notifications/push.service.ts
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as webpush from 'web-push';
import { PushSubscription } from './push-subscription.entity';

export interface SubscribeDto {
  endpoint:   string;
  p256dh:     string;
  authKey:    string;
  userAgent?: string;
}

export interface PushPayloadDto {
  title:  string;
  body:   string;
  icon?:  string;
  url?:   string;
  badge?: string;
}

@Injectable()
export class PushService implements OnModuleInit {
  private readonly logger = new Logger(PushService.name);

  constructor(
    @InjectRepository(PushSubscription)
    private readonly repo: Repository<PushSubscription>,
  ) {}

  onModuleInit() {
    const pub  = process.env.VAPID_PUBLIC_KEY;
    const priv = process.env.VAPID_PRIVATE_KEY;
    const subj = process.env.VAPID_SUBJECT || 'mailto:admin@departmos.com';

    if (!pub || !priv) {
      this.logger.warn(
        'VAPID_PUBLIC_KEY o VAPID_PRIVATE_KEY no configuradas — Push deshabilitado. ' +
        'Generar con: npx web-push generate-vapid-keys',
      );
      return;
    }

    webpush.setVapidDetails(subj, pub, priv);
    this.logger.log('Web Push configurado con claves VAPID');
  }

  // ── Guardar / actualizar suscripción del browser ─────────────
  async subscribe(idUser: string, dto: SubscribeDto): Promise<void> {
    await this.repo.upsert(
      {
        idUser,
        endpoint:    dto.endpoint,
        p256dh:      dto.p256dh,
        authKey:     dto.authKey,
        userAgent:   dto.userAgent ?? '',
        lastSeenAt:  new Date(),  // registrar dispositivo activo
      },
      { conflictPaths: ['idUser', 'endpoint'] },
    );
    this.logger.log(`Suscripción guardada — user ${idUser}`);
  }

  // ── Actualizar last_seen_at (llamar al hacer ping desde frontend) ──
  async heartbeat(idUser: string, endpoint: string): Promise<void> {
    await this.repo.update(
      { idUser, endpoint },
      { lastSeenAt: new Date() },
    );
  }

  // ── Eliminar suscripción ──────────────────────────────────────
  async unsubscribe(idUser: string, endpoint: string): Promise<void> {
    await this.repo.delete({ idUser, endpoint });
    this.logger.log(`Suscripción eliminada — user ${idUser}`);
  }

  // ── Obtener TODAS las suscripciones de un usuario ─────────────
  async getSubscriptions(idUser: string): Promise<PushSubscription[]> {
    return this.repo.find({
      where: { idUser },
      order: { lastSeenAt: 'DESC' },
    });
  }

  // ── Obtener el dispositivo más reciente de un usuario ─────────
  // Útil para el scheduler: notificar al último dispositivo activo
  async getLatestSubscription(idUser: string): Promise<PushSubscription | null> {
    return this.repo.findOne({
      where: { idUser },
      order: { lastSeenAt: 'DESC' },
    });
  }

  // ── Enviar a un usuario (todos sus dispositivos activos) ──────
  async sendToUser(idUser: string, payload: PushPayloadDto): Promise<void> {
    const subs = await this.getSubscriptions(idUser);
    if (!subs.length) return;

    await Promise.allSettled(
      subs.map(sub => this.sendToSubscription(sub, payload)),
    );
  }

  // ── Envío individual a una suscripción ───────────────────────
  async sendToSubscription(
    sub: PushSubscription,
    payload: PushPayloadDto,
  ): Promise<void> {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.authKey } },
        JSON.stringify({
          title: payload.title,
          body:  payload.body,
          icon:  payload.icon  ?? '/icons/icon-192.png',
          badge: payload.badge ?? '/icons/badge-72.png',
          url:   payload.url   ?? '/',
        }),
      );
    } catch (err: any) {
      if (err?.statusCode === 410 || err?.statusCode === 404) {
        this.logger.warn(`Suscripción expirada — eliminando user ${sub.idUser}`);
        await this.repo.remove(sub);
      } else {
        this.logger.error(`Error push a ${sub.endpoint}: ${err?.message}`);
      }
    }
  }
}
