// src/auth/guards/subscription.guard.ts
//
// Uso: decorar endpoints que crean recursos limitados por suscripción
//
// @UseGuards(JwtAuthGuard, SubscriptionGuard)
// @SubscriptionCheck('edificios')  ← 'edificios' | 'deptos' | 'periodos'
//
import {
  Injectable, CanActivate, ExecutionContext,
  ForbiddenException, SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AccountsService } from '../../accounts/accounts.service';
import { UserRole } from '../../users/user.entity';

export const SUBSCRIPTION_CHECK_KEY = 'subscription_check';
export const SubscriptionCheck = (resource: 'edificios' | 'deptos' | 'periodos') =>
  SetMetadata(SUBSCRIPTION_CHECK_KEY, resource);

@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(
    private readonly reflector:   Reflector,
    private readonly accountsSvc: AccountsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const resource = this.reflector.getAllAndOverride<string>(SUBSCRIPTION_CHECK_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!resource) return true;

    const request = context.switchToHttp().getRequest();
    const user    = request.user;

    // Supervisor (plan full) — sin restricciones
    if (user.role === UserRole.SUPERVISOR) return true;

    // Usuarios sin cuenta — no deberían llegar aquí, pero por seguridad
    if (!user.idAccount) {
      throw new ForbiddenException('No tienes una cuenta de suscripción activa');
    }

    // Verificar límites según el recurso
    switch (resource) {
      case 'edificios':
        await this.accountsSvc.checkEdificiosLimit(user.idAccount);
        break;

      case 'deptos': {
        // El edificioId viene del body o del param
        const edificioId = request.body?.idEdificio || request.params?.edificioId;
        if (edificioId) {
          await this.accountsSvc.checkDeptosLimit(user.idAccount, edificioId);
        }
        break;
      }

      case 'periodos': {
        const edificioId = request.body?.idEdificio || request.params?.edificioId;
        if (edificioId) {
          await this.accountsSvc.checkPeriodosLimit(user.idAccount, edificioId);
        }
        break;
      }
    }

    return true;
  }
}
