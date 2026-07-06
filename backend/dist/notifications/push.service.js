"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var PushService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PushService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const webpush = __importStar(require("web-push"));
const push_subscription_entity_1 = require("./push-subscription.entity");
let PushService = PushService_1 = class PushService {
    constructor(repo) {
        this.repo = repo;
        this.logger = new common_1.Logger(PushService_1.name);
    }
    onModuleInit() {
        const pub = process.env.VAPID_PUBLIC_KEY;
        const priv = process.env.VAPID_PRIVATE_KEY;
        const subj = process.env.VAPID_SUBJECT || 'mailto:admin@departmos.com';
        if (!pub || !priv) {
            this.logger.warn('VAPID_PUBLIC_KEY o VAPID_PRIVATE_KEY no configuradas — Push deshabilitado. ' +
                'Generar con: npx web-push generate-vapid-keys');
            return;
        }
        webpush.setVapidDetails(subj, pub, priv);
        this.logger.log('Web Push configurado con claves VAPID');
    }
    async subscribe(idUser, dto) {
        await this.repo.upsert({
            idUser,
            endpoint: dto.endpoint,
            p256dh: dto.p256dh,
            authKey: dto.authKey,
            userAgent: dto.userAgent ?? '',
            lastSeenAt: new Date(),
        }, { conflictPaths: ['idUser', 'endpoint'] });
        this.logger.log(`Suscripción guardada — user ${idUser}`);
    }
    async heartbeat(idUser, endpoint) {
        await this.repo.update({ idUser, endpoint }, { lastSeenAt: new Date() });
    }
    async unsubscribe(idUser, endpoint) {
        await this.repo.delete({ idUser, endpoint });
        this.logger.log(`Suscripción eliminada — user ${idUser}`);
    }
    async getSubscriptions(idUser) {
        return this.repo.find({
            where: { idUser },
            order: { lastSeenAt: 'DESC' },
        });
    }
    async getLatestSubscription(idUser) {
        return this.repo.findOne({
            where: { idUser },
            order: { lastSeenAt: 'DESC' },
        });
    }
    async sendToUser(idUser, payload) {
        const subs = await this.getSubscriptions(idUser);
        if (!subs.length)
            return;
        await Promise.allSettled(subs.map(sub => this.sendToSubscription(sub, payload)));
    }
    async sendToSubscription(sub, payload) {
        try {
            await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.authKey } }, JSON.stringify({
                title: payload.title,
                body: payload.body,
                icon: payload.icon ?? '/icons/icon-192.png',
                badge: payload.badge ?? '/icons/badge-72.png',
                url: payload.url ?? '/',
            }));
        }
        catch (err) {
            if (err?.statusCode === 410 || err?.statusCode === 404) {
                this.logger.warn(`Suscripción expirada — eliminando user ${sub.idUser}`);
                await this.repo.remove(sub);
            }
            else {
                this.logger.error(`Error push a ${sub.endpoint}: ${err?.message}`);
            }
        }
    }
};
exports.PushService = PushService;
exports.PushService = PushService = PushService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(push_subscription_entity_1.PushSubscription)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], PushService);
//# sourceMappingURL=push.service.js.map