import { User } from '../users/user.entity';
export declare class PushSubscription {
    id: string;
    idUser: string;
    user: User;
    endpoint: string;
    p256dh: string;
    authKey: string;
    userAgent: string;
    lastSeenAt: Date;
    createdAt: Date;
    updatedAt: Date;
}
