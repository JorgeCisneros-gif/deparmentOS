"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JwtStrategy = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const passport_jwt_1 = require("passport-jwt");
const users_service_1 = require("../../users/users.service");
const grupos_service_1 = require("../../grupos/grupos.service");
const user_entity_1 = require("../../users/user.entity");
let JwtStrategy = class JwtStrategy extends (0, passport_1.PassportStrategy)(passport_jwt_1.Strategy, 'jwt') {
    constructor(usersService, gruposService) {
        super({
            jwtFromRequest: passport_jwt_1.ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: process.env.JWT_SECRET || 'edify_super_secret_key',
        });
        this.usersService = usersService;
        this.gruposService = gruposService;
    }
    async validate(payload) {
        const user = await this.usersService.findOne(payload.sub);
        if (!user || !user.isActive) {
            throw new common_1.UnauthorizedException('Token inválido o usuario inactivo');
        }
        if (user.role !== user_entity_1.UserRole.SUPERVISOR && user.idGrupo) {
            const grupo = await this.gruposService.findOne(user.idGrupo);
            if (grupo) {
                const isExpired = grupo.subscriptionEnd && new Date() > new Date(grupo.subscriptionEnd);
                const isSuspended = grupo.status === 'suspendido';
                if (isSuspended) {
                    throw new common_1.ForbiddenException({
                        code: 'SUBSCRIPTION_SUSPENDED',
                        message: 'Tu suscripción está suspendida. Contacta al administrador.',
                    });
                }
                if (isExpired) {
                    throw new common_1.ForbiddenException({
                        code: 'SUBSCRIPTION_EXPIRED',
                        message: 'Tu suscripción ha vencido. Contacta al administrador.',
                    });
                }
            }
        }
        return {
            id: user.id,
            email: user.email,
            role: user.role,
            idGrupo: user.idGrupo,
            idEdificio: user.idEdificio,
            idDepartamento: user.idDepartamento,
            idPropietario: user.idPropietario,
        };
    }
};
exports.JwtStrategy = JwtStrategy;
exports.JwtStrategy = JwtStrategy = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        grupos_service_1.GruposService])
], JwtStrategy);
//# sourceMappingURL=jwt.strategy.js.map