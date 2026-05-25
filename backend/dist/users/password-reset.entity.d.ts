import { User } from './user.entity';
export declare class PasswordResetToken {
    id: string;
    userId: string;
    user: User;
    token: string;
    expiresAt: Date;
    used: boolean;
    createdAt: Date;
}
