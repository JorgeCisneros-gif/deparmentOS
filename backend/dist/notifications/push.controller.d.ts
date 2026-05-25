import { PushService, SubscribeDto } from './push.service';
export declare class PushController {
    private readonly pushSvc;
    constructor(pushSvc: PushService);
    getVapidPublicKey(): {
        publicKey: string;
    };
    subscribe(req: any, dto: SubscribeDto): Promise<void>;
    heartbeat(req: any, body: {
        endpoint: string;
    }): Promise<void>;
    unsubscribe(req: any, body: {
        endpoint: string;
    }): Promise<void>;
    getSubscriptions(req: any): Promise<import("./push-subscription.entity").PushSubscription[]>;
}
