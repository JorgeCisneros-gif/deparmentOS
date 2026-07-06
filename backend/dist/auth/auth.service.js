"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const bcrypt = __importStar(require("bcrypt"));
const users_service_1 = require("../users/users.service");
const app_config_service_1 = require("../config/app-config.service");
let AuthService = class AuthService {
    constructor(usersService, jwtService, appConfigService) {
        this.usersService = usersService;
        this.jwtService = jwtService;
        this.appConfigService = appConfigService;
    }
    async login(dto) {
        const user = await this.usersService.findByEmail(dto.email);
        if (!user || !user.isActive) {
            throw new common_1.UnauthorizedException('Credenciales inválidas');
        }
        const valid = await bcrypt.compare(dto.password, user.passwordHash);
        if (!valid)
            throw new common_1.UnauthorizedException('Credenciales inválidas');
        await this.usersService.updateLastLogin(user.id);
        const tokens = await this.generateTokens(user);
        await this.usersService.updateRefreshToken(user.id, tokens.refreshToken);
        const config = await this.appConfigService.getAll();
        return {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                idGrupo: user.idGrupo,
                idEdificio: user.idEdificio,
                idDepartamento: user.idDepartamento,
                idPropietario: user.idPropietario,
            },
            config,
        };
    }
    async refresh(dto) {
        try {
            const payload = this.jwtService.verify(dto.refreshToken, {
                secret: process.env.JWT_REFRESH_SECRET || 'edify_refresh_secret',
            });
            const user = await this.usersService.findOne(payload.sub);
            const valid = await this.usersService.validateRefreshToken(user.id, dto.refreshToken);
            if (!valid)
                throw new common_1.UnauthorizedException('Refresh token inválido');
            const tokens = await this.generateTokens(user);
            await this.usersService.updateRefreshToken(user.id, tokens.refreshToken);
            return tokens;
        }
        catch {
            throw new common_1.UnauthorizedException('Refresh token inválido o expirado');
        }
    }
    async logout(userId) {
        await this.usersService.updateRefreshToken(userId, null);
        return { message: 'Sesión cerrada correctamente' };
    }
    async generateTokens(user) {
        const payload = {
            sub: user.id,
            email: user.email,
            role: user.role,
            idGrupo: user.idGrupo,
            idEdificio: user.idEdificio,
            idDepartamento: user.idDepartamento,
        };
        const [accessToken, refreshToken] = await Promise.all([
            this.jwtService.signAsync(payload, {
                secret: process.env.JWT_SECRET || 'edify_super_secret_key',
                expiresIn: process.env.JWT_EXPIRES_IN || '7d',
            }),
            this.jwtService.signAsync(payload, {
                secret: process.env.JWT_REFRESH_SECRET || 'edify_refresh_secret',
                expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
            }),
        ]);
        return { accessToken, refreshToken };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        jwt_1.JwtService,
        app_config_service_1.AppConfigService])
], AuthService);
//# sourceMappingURL=auth.service.js.map