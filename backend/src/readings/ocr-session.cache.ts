import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { OcrResult } from './ocr.service';

/**
 * Una sesión OCR temporal — guarda el buffer y el resultado OCR
 * hasta que el usuario confirma la lectura (o expira).
 */
export interface OcrSession {
  sessionId: string;
  buffer: Buffer;
  originalFileName: string;
  mimeType: string;
  fileSizeKb: number;
  ocrResult: OcrResult;
  idDepartamento: string;
  idRecibo: string;
  userId: string;
  expiresAt: number;
}

/**
 * Cache en memoria para sesiones OCR pendientes de confirmación.
 *
 * Patrón: el usuario sube foto → OCR → cache. Si retoma otra foto,
 * la anterior queda en cache hasta expirar (sin tocar disco/Drive).
 * Cuando confirma, leemos del cache, persistimos, borramos.
 *
 * Por ahora es Map de Node. Si en el futuro se necesita persistencia
 * entre reinicios o múltiples instancias, migrar a Redis sin cambiar
 * la interfaz pública (set/get/delete).
 */
@Injectable()
export class OcrSessionCache implements OnModuleDestroy {
  private readonly logger = new Logger(OcrSessionCache.name);
  private readonly sessions = new Map<string, OcrSession>();

  /** TTL por defecto: 30 minutos. Tiempo de sobra para que el usuario decida. */
  private readonly TTL_MS = 30 * 60 * 1000;

  /** Intervalo de limpieza: cada 10 minutos. */
  private readonly CLEANUP_INTERVAL_MS = 10 * 60 * 1000;

  private cleanupTimer: NodeJS.Timeout;

  constructor() {
    this.cleanupTimer = setInterval(
      () => this.cleanExpired(),
      this.CLEANUP_INTERVAL_MS,
    );
    // No bloquear el cierre de Node por el timer
    this.cleanupTimer.unref();
  }

  onModuleDestroy() {
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
  }

  set(data: Omit<OcrSession, 'sessionId' | 'expiresAt'>): string {
    const sessionId = randomUUID();
    const session: OcrSession = {
      ...data,
      sessionId,
      expiresAt: Date.now() + this.TTL_MS,
    };
    this.sessions.set(sessionId, session);
    this.logger.debug(`Sesión OCR creada: ${sessionId} (${this.sessions.size} en cache)`);
    return sessionId;
  }

  get(sessionId: string): OcrSession | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    if (session.expiresAt < Date.now()) {
      this.sessions.delete(sessionId);
      return null;
    }
    return session;
  }

  delete(sessionId: string): void {
    if (this.sessions.delete(sessionId)) {
      this.logger.debug(`Sesión OCR eliminada: ${sessionId} (${this.sessions.size} en cache)`);
    }
  }

  /** Limpieza de sesiones expiradas. Se ejecuta periódicamente. */
  private cleanExpired(): void {
    const now = Date.now();
    let removed = 0;
    for (const [id, session] of this.sessions) {
      if (session.expiresAt < now) {
        this.sessions.delete(id);
        removed++;
      }
    }
    if (removed > 0) {
      this.logger.log(`Limpieza de sesiones OCR: ${removed} eliminadas, ${this.sessions.size} activas`);
    }
  }

  /** Estado actual del cache (útil para health checks). */
  stats(): { size: number; oldestExpiresAt: number | null } {
    if (this.sessions.size === 0) return { size: 0, oldestExpiresAt: null };
    let oldest = Number.MAX_SAFE_INTEGER;
    for (const s of this.sessions.values()) {
      if (s.expiresAt < oldest) oldest = s.expiresAt;
    }
    return { size: this.sessions.size, oldestExpiresAt: oldest };
  }
}
