import {
  Injectable, CanActivate, ExecutionContext, ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole } from '../../users/user.entity';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) return true;

    const { user } = context.switchToHttp().getRequest();

    // Jerarquía de roles:
    // SUPERVISOR > ADMINISTRADOR > GESTION > PROPIETARIO
    //
    // Si un endpoint requiere SUPERVISOR → solo SUPERVISOR
    // Si un endpoint requiere ADMINISTRADOR → SUPERVISOR + ADMINISTRADOR
    // Si un endpoint requiere GESTION → SUPERVISOR + ADMINISTRADOR + GESTION
    // Si un endpoint requiere PROPIETARIO → todos

    const effectiveRoles = new Set(requiredRoles);

    if (requiredRoles.includes(UserRole.ADMINISTRADOR)) {
      effectiveRoles.add(UserRole.SUPERVISOR);
    }

    if (requiredRoles.includes(UserRole.GESTION)) {
      effectiveRoles.add(UserRole.SUPERVISOR);
      effectiveRoles.add(UserRole.ADMINISTRADOR);
    }

    if (requiredRoles.includes(UserRole.PROPIETARIO)) {
      effectiveRoles.add(UserRole.SUPERVISOR);
      effectiveRoles.add(UserRole.ADMINISTRADOR);
      effectiveRoles.add(UserRole.GESTION);
    }

    const hasRole = effectiveRoles.has(user?.role);

    if (!hasRole) {
      throw new ForbiddenException(
        `Acceso denegado. Se requiere rol: ${requiredRoles.join(' o ')}`,
      );
    }
    return true;
  }
}
