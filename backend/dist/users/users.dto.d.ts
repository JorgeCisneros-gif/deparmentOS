import { UserRole } from './user.entity';
export declare class CreateUserDto {
    email: string;
    password: string;
    role: UserRole;
    idEdificio?: string;
    idDepartamento?: string;
    idPropietario?: string;
}
declare const UpdateUserDto_base: import("@nestjs/common").Type<Partial<CreateUserDto>>;
export declare class UpdateUserDto extends UpdateUserDto_base {
    isActive?: boolean;
}
export declare class ChangePasswordDto {
    currentPassword: string;
    newPassword: string;
}
export {};
