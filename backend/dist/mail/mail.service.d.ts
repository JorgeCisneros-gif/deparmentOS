export interface SendMailDto {
    to: string;
    subject: string;
    html: string;
    text?: string;
}
export interface SmtpConfig {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    pass: string;
    fromName: string;
    fromEmail: string;
}
export declare class MailService {
    private readonly logger;
    getConfig(): SmtpConfig;
    private createTransporter;
    send(dto: SendMailDto): Promise<void>;
    testConnection(cfg?: Partial<SmtpConfig>): Promise<{
        ok: boolean;
        message: string;
    }>;
    buildResetPasswordEmail(opts: {
        nombre: string;
        resetUrl: string;
        expiraEn: string;
    }): string;
}
