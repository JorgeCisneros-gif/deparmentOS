import { Repository } from 'typeorm';
import { PasswordResetToken } from './password-reset.entity';
import { User } from './user.entity';
import { MailService } from '../mail/mail.service';
export declare class PasswordResetService {
    private readonly tokenRepo;
    private readonly userRepo;
    private readonly mailSvc;
    private readonly logger;
    constructor(tokenRepo: Repository<PasswordResetToken>, userRepo: Repository<User>, mailSvc: MailService);
    requestReset(email: string): Promise<{
        message: string;
        method: string;
        whatsappUrl?: string;
        resetUrl?: string;
    }>;
    validateToken(token: string): Promise<{
        valid: boolean;
        email?: string;
    }>;
    resetPassword(token: string, newPassword: string): Promise<{
        message: string;
    }>;
}
