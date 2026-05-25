import { UsersService } from './users.service';
import { PasswordResetService } from './password-reset.service';
import { CreateUserDto, UpdateUserDto, ChangePasswordDto } from './users.dto';
import { UserRole } from './user.entity';
declare class RequestResetDto {
    email: string;
}
declare class ResetPasswordDto {
    token: string;
    newPassword: string;
}
export declare class UsersController {
    private readonly svc;
    private readonly resetSvc;
    constructor(svc: UsersService, resetSvc: PasswordResetService);
    create(dto: CreateUserDto): Promise<import("./user.entity").User>;
    findAll(role?: UserRole): Promise<import("./user.entity").User[]>;
    findOne(id: string): Promise<import("./user.entity").User>;
    update(id: string, dto: UpdateUserDto): Promise<import("./user.entity").User>;
    deactivate(id: string): Promise<void>;
    activate(id: string): Promise<import("./user.entity").User>;
    changePassword(req: any, dto: ChangePasswordDto): Promise<void>;
    requestReset(dto: RequestResetDto): Promise<{
        message: string;
        method: string;
        whatsappUrl?: string;
        resetUrl?: string;
    }>;
    validateToken(token: string): Promise<{
        valid: boolean;
        email?: string;
    }>;
    resetPassword(dto: ResetPasswordDto): Promise<{
        message: string;
    }>;
}
export {};
