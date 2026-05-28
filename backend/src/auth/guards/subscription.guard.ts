// src/auth/guards/subscription.guard.ts
import {
  Injectable, CanActivate, ExecutionContext,
  ForbiddenException, SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GruposService } from '../../grupos/grupos.service';
import { UserRole } from '../../users/user.entity';

export const SUBSCRIPTION_CHECK_KEY = 'subscription_check';
export const SubscriptionCheck = (resource: 'edificios' | 'deptos' | 'periodos') =>
  SetMetadata(SUBSCRIPTION_CHECK_KEY, resource);

@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(
    private readonly reflector:   Reflector,
    private readonly gruposSvc: GruposService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const resource = this.reflector.getAllAndOverride<string>(
      SUBSCRIPTION_CHECK_KEY, [context.getHandler(), context.getClass()]
    );
    if (!resource) return true;

    const request = context.switchToHttp().getRequest();
    const user    = request.user;

    // Supervisor — sin restricciones
    if (user.role === UserRole.SUPERVISOR) return true;

    if (!user.idGrupo) {
      throw new ForbiddenException('No tienes un grupo de suscripción activo');
    }

    switch (resource) {
      case 'edificios':
        await this.gruposSvc.checkEdificiosLimit(user.idGrupo);
        break;
      case 'deptos': {
        const edificioId = request.body?.idEdificio || request.params?.edificioId;
        if (edificioId) await this.gruposSvc.checkDeptosLimit(user.idGrupo, edificioId);
        break;
      }
      case 'periodos': {
        const edificioId = request.body?.idEdificio || request.params?.edificioId;
        if (edificioId) await this.gruposSvc.checkPeriodosLimit(user.idGrupo, edificioId);
        break;
      }
    }
    return true;
  }
}
