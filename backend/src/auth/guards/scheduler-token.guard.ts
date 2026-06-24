// src/auth/guards/scheduler-token.guard.ts
import {
  CanActivate, ExecutionContext, Injectable,
  UnauthorizedException, Logger,
} from '@nestjs/common';

/**
 * Valida un token compartido entre el backend y el servicio scheduler.
 *
 * Uso: endpoints que SOLO el servicio scheduler debe poder llamar
 *      (ej: housekeeping de fotos, dispatchers internos).
 *
 * El scheduler envía el token en uno de estos headers:
 *   - Authorization: Bearer <token>
 *   - x-scheduler-token: <token>
 *
 * El token vive en la variable de entorno SCHEDULER_API_TOKEN, que debe
 * tener el mismo valor en ambos servicios.
 */
@Injectable()
export class SchedulerTokenGuard implements CanActivate {
  private readonly logger = new Logger(SchedulerTokenGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();

    const expected = process.env.SCHEDULER_API_TOKEN;
    if (!expected) {
      this.logger.error(
        'SCHEDULER_API_TOKEN no está configurado en el backend. ' +
        'Agregarlo al .env para permitir llamadas del scheduler.',
      );
      throw new UnauthorizedException('Scheduler token no configurado en el servidor');
    }

    const authHeader = (req.headers['authorization'] as string) || '';
    const xToken     = (req.headers['x-scheduler-token'] as string) || '';

    const provided = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : xToken.trim();

    if (!provided) {
      throw new UnauthorizedException('Token del scheduler requerido');
    }

    if (provided !== expected) {
      this.logger.warn('Intento de acceso al scheduler endpoint con token inválido');
      throw new UnauthorizedException('Token del scheduler inválido');
    }

    return true;
  }
}
