import { OnModuleInit } from '@nestjs/common';
import { Repository } from 'typeorm';
import { PushSubscription } from './push-subscription.entity';
export interface SubscribeDto {
    endpoint: string;
    p256dh: string;
    authKey: string;
    userAgent?: string;
}
export interface PushPayloadDto {
    title: string;
    body: string;
    icon?: string;
    url?: string;
    badge?: string;
}
export declare class PushService implements OnModuleInit {
    private readonly repo;
    private readonly logger;
    constructor(repo: Repository<PushSubscription>);
    onModuleInit(): void;
    subscribe(idUser: string, dto: SubscribeDto): Promise<void>;
    heartbeat(idUser: string, endpoint: string): Promise<void>;
    unsubscribe(idUser: string, endpoint: string): Promise<void>;
    getSubscriptions(idUser: string): Promise<PushSubscription[]>;
    getLatestSubscription(idUser: string): Promise<PushSubscription | null>;
    sendToUser(idUser: string, payload: PushPayloadDto): Promise<void>;
    sendToSubscription(sub: PushSubscription, payload: PushPayloadDto): Promise<void>;
}
