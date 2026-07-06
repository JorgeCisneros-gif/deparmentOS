import { Grupo } from '../grupos/grupo.entity';
export declare enum UserRole {
    SUPERVISOR = "supervisor",
    ADMINISTRADOR = "administrador",
    GESTION = "gestion",
    PROPIETARIO = "propietario"
}
export declare class User {
    id: string;
    email: string;
    passwordHash: string;
    role: UserRole;
    idGrupo: string | null;
    grupo: Grupo;
    idEdificio: string | null;
    idDepartamento: string | null;
    idPropietario: string | null;
    isActive: boolean;
    lastLogin: Date;
    refreshToken: string;
    idAccount: string | null;
    createdAt: Date;
    updatedAt: Date;
}
