import { MailService } from './mail.service';
declare class TestSmtpDto {
    host?: string;
    port?: number;
    secure?: boolean;
    user?: string;
    pass?: string;
    fromName?: string;
    fromEmail?: string;
}
declare class SendTestEmailDto {
    to: string;
}
export declare class MailController {
    private readonly mailSvc;
    constructor(mailSvc: MailService);
    getConfig(): {
        host: string;
        port: number;
        secure: boolean;
        user: string;
        fromName: string;
        fromEmail: string;
        passConfigured: boolean;
        envVars: {
            SMTP_HOST: string;
            SMTP_PORT: string;
            SMTP_SECURE: string;
            SMTP_USER: string;
            SMTP_FROM_NAME: string;
            SMTP_FROM_EMAIL: string;
            SMTP_PASS: string;
        };
    };
    testConnection(dto: TestSmtpDto): Promise<{
        ok: boolean;
        message: string;
    }>;
    testSend(dto: SendTestEmailDto): Promise<{
        ok: boolean;
        message: string;
    }>;
}
export {};
