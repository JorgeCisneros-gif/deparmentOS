import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ReadingsService } from '../readings/readings.service';

/**
 * Scheduler diario para el housekeeping de fotos de medidores.
 *
 * Se ejecuta una vez al día (3 AM hora del servidor) y realiza:
 *  1. Reintentar uploads fallidos al Storage Gateway
 *  2. Borrar archivos locales que ya están confirmados en Drive
 *  3. Expirar fotos locales antiguas (las que pasaron 1 año)
 *
 * Patrón: igual que NotificationSchedulerService, usa setInterval simple
 * con cálculo del próximo trigger basado en la hora actual.
 */
@Injectable()
export class MeterImagesSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(MeterImagesSchedulerService.name);
  private intervalHandle: NodeJS.Timeout | null = null;

  // Hora del día (en hora local del servidor) cuando se ejecuta
  private readonly TARGET_HOUR = 3;

  // Cada cuánto verificamos si toca ejecutar (ms)
  private readonly CHECK_INTERVAL_MS = 60 * 60 * 1000; // 1 hora

  // Última fecha en que se ejecutó (para no correr dos veces el mismo día)
  private lastRunDate: string | null = null;

  constructor(private readonly readingsService: ReadingsService) {}

  onModuleInit(): void {
    // En desarrollo permitimos override por env var para testear rápido
    const disabled = process.env.METER_IMAGES_HOUSEKEEPING_DISABLED === 'true';
    if (disabled) {
      this.logger.warn(
        '⚠️  MeterImagesScheduler DESACTIVADO (METER_IMAGES_HOUSEKEEPING_DISABLED=true)',
      );
      return;
    }

    // Verificar cada hora si toca ejecutar
    this.intervalHandle = setInterval(() => this.tick(), this.CHECK_INTERVAL_MS);

    this.logger.log(
      `✅ MeterImagesScheduler iniciado ` +
      `(ejecuta diario ~${String(this.TARGET_HOUR).padStart(2, '0')}:00 hora del servidor)`,
    );

    // Primera verificación inmediata para no esperar 1 hora si el servicio
    // arrancó justo después de las 3 AM.
    setTimeout(() => this.tick(), 5000);
  }

  /**
   * Llamado cada hora. Si es la hora target Y no se ha ejecutado hoy,
   * dispara el housekeeping.
   */
  private async tick(): Promise<void> {
    const now = new Date();
    const hour = now.getHours();
    const todayKey = now.toISOString().split('T')[0];

    if (hour !== this.TARGET_HOUR) return;
    if (this.lastRunDate === todayKey) return;

    this.lastRunDate = todayKey;

    try {
      const summary = await this.readingsService.runHousekeeping();
      this.logger.log(
        `Housekeeping diario OK: ` +
        `${summary.retried} uploads reintentados (${summary.retriedOk} OK), ` +
        `${summary.purgedLocal} locales purgados, ` +
        `${summary.expiredDeleted} expirados.`,
      );
    } catch (err) {
      this.logger.error(`Housekeeping diario FALLÓ: ${err.message}`, err.stack);
    }
  }

  // Útil para tests o trigger manual
  async runNow(): Promise<void> {
    this.logger.log('Housekeeping disparado manualmente.');
    await this.readingsService.runHousekeeping();
  }
}
