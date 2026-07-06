import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { AppConfigService } from '../config/app-config.service';
import { LoginDto, RefreshTokenDto } from './auth.dto';
export declare class AuthService {
    private readonly usersService;
    private readonly jwtService;
    private readonly appConfigService;
    constructor(usersService: UsersService, jwtService: JwtService, appConfigService: AppConfigService);
    login(dto: LoginDto): Promise<{
        accessToken: string;
        refreshToken: string;
        user: {
            id: string;
            email: string;
            role: import("../users/user.entity").UserRole;
            idGrupo: string;
            idEdificio: string;
            idDepartamento: string;
            idPropietario: string;
        };
        config: Record<string, any>;
    }>;
    refresh(dto: RefreshTokenDto): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    logout(userId: string): Promise<{
        message: string;
    }>;
    private generateTokens;
}
