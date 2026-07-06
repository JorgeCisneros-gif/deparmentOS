import { Strategy } from 'passport-jwt';
import { UsersService } from '../../users/users.service';
import { GruposService } from '../../grupos/grupos.service';
import { UserRole } from '../../users/user.entity';
export interface JwtPayload {
    sub: string;
    email: string;
    role: string;
    idGrupo?: string;
    idEdificio?: string;
    idDepartamento?: string;
}
declare const JwtStrategy_base: new (...args: any[]) => Strategy;
export declare class JwtStrategy extends JwtStrategy_base {
    private readonly usersService;
    private readonly gruposService;
    constructor(usersService: UsersService, gruposService: GruposService);
    validate(payload: JwtPayload): Promise<{
        id: string;
        email: string;
        role: UserRole;
        idGrupo: string;
        idEdificio: string;
        idDepartamento: string;
        idPropietario: string;
    }>;
}
export {};
