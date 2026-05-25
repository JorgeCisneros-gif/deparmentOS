export declare enum UserRole {
    SUPERVISOR = "supervisor",
    ADMINISTRADOR = "administrador",
    PROPIETARIO = "propietario"
}
export declare class User {
    id: string;
    email: string;
    passwordHash: string;
    role: UserRole;
    idEdificio: string;
    idDepartamento: string;
    idPropietario: string;
    isActive: boolean;
    lastLogin: Date;
    refreshToken: string;
    createdAt: Date;
    updatedAt: Date;
}
