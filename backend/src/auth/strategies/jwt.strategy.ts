// src/auth/strategies/jwt.strategy.ts
import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../../users/users.service';
import { GruposService } from '../../grupos/grupos.service';
import { SubscriptionStatus, SubscriptionPlan } from '../../grupos/grupo.entity';
import { UserRole } from '../../users/user.entity';

export interface JwtPayload {
  sub:             string;
  email:           string;
  role:            string;
  idGrupo?:        string;
  idEdificio?:     string;
  idDepartamento?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly usersService: UsersService,
    private readonly gruposService: GruposService,
  ) {
    super({
      jwtFromRequest:   ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:      process.env.JWT_SECRET || 'edify_super_secret_key',
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.usersService.findOne(payload.sub);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Token inválido o usuario inactivo');
    }

    // Verificar suscripción del grupo (excepto supervisor)
    if (user.role !== UserRole.SUPERVISOR && user.idGrupo) {
      const grupo = await this.gruposService.findOne(user.idGrupo);
      if (grupo) {
        const isExpired   = grupo.subscriptionEnd && new Date() > new Date(grupo.subscriptionEnd);
        const isSuspended = grupo.status === 'suspendido';

        if (isSuspended) {
          throw new ForbiddenException({
            code:    'SUBSCRIPTION_SUSPENDED',
            message: 'Tu suscripción está suspendida. Contacta al administrador.',
          });
        }
        if (isExpired) {
          throw new ForbiddenException({
            code:    'SUBSCRIPTION_EXPIRED',
            message: 'Tu suscripción ha vencido. Contacta al administrador.',
          });
        }
      }
    }

    return {
      id:             user.id,
      email:          user.email,
      role:           user.role,
      idGrupo:        user.idGrupo,        // ← clave para filtrar data
      idEdificio:     user.idEdificio,
      idDepartamento: user.idDepartamento,
      idPropietario:  user.idPropietario,
    };
  }
}
