import { AuthService } from './auth.service';
import { LoginDto, RefreshTokenDto } from './auth.dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
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
    logout(req: any): Promise<{
        message: string;
    }>;
    me(req: any): any;
}
