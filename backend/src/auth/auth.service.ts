// src/auth/auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { LoginDto, RefreshTokenDto } from './auth.dto';
import { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService:   JwtService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Credenciales inválidas');

    // Actualizar last_login
    await this.usersService.updateLastLogin(user.id);

    const tokens = await this.generateTokens(user);
    await this.usersService.updateRefreshToken(user.id, tokens.refreshToken);

    return {
      accessToken:  tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id:             user.id,
        email:          user.email,
        role:           user.role,
        idGrupo:        user.idGrupo,
        idEdificio:     user.idEdificio,
        idDepartamento: user.idDepartamento,
        idPropietario:  user.idPropietario,
      },
    };
  }

  async refresh(dto: RefreshTokenDto) {
    try {
      const payload = this.jwtService.verify(dto.refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET || 'edify_refresh_secret',
      });
      const user  = await this.usersService.findOne(payload.sub);
      const valid = await this.usersService.validateRefreshToken(user.id, dto.refreshToken);
      if (!valid) throw new UnauthorizedException('Refresh token inválido');

      const tokens = await this.generateTokens(user);
      await this.usersService.updateRefreshToken(user.id, tokens.refreshToken);
      return tokens;
    } catch {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }
  }

  async logout(userId: string) {
    await this.usersService.updateRefreshToken(userId, null);
    return { message: 'Sesión cerrada correctamente' };
  }

  private async generateTokens(user: any) {
    const payload: JwtPayload = {
      sub:            user.id,
      email:          user.email,
      role:           user.role,
      idGrupo:        user.idGrupo,
      idEdificio:     user.idEdificio,
      idDepartamento: user.idDepartamento,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret:    process.env.JWT_SECRET || 'edify_super_secret_key',
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      }),
      this.jwtService.signAsync(payload, {
        secret:    process.env.JWT_REFRESH_SECRET || 'edify_refresh_secret',
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
      }),
    ]);

    return { accessToken, refreshToken };
  }
}
