import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
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

    // El rol ADMINISTRADOR hereda todos los permisos de SUPERVISOR.
    // Si un endpoint requiere SUPERVISOR, el ADMINISTRADOR también puede acceder.
    const effectiveRoles = [...requiredRoles];
    if (requiredRoles.includes(UserRole.SUPERVISOR)) {
      effectiveRoles.push(UserRole.ADMINISTRADOR);
    }

    const hasRole = effectiveRoles.includes(user?.role);

    if (!hasRole) {
      throw new ForbiddenException(
        `Acceso denegado. Se requiere rol: ${requiredRoles.join(' o ')}`,
      );
    }
    return true;
  }
}
