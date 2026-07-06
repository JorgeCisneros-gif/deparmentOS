export type StorageProvider = 'local' | 'google_drive';
export declare class MeterImage {
    id: string;
    idDepartamento: string;
    idRecibo: string;
    filename: string;
    filepath: string | null;
    fileSizeKb: number;
    ocrRawValue: string;
    ocrConfidence: number;
    ocrUsedRed: boolean;
    lecturaFinal: number;
    ocrMetadata: object;
    expiresAt: string;
    createdBy: string;
    createdAt: Date;
    storageProvider: StorageProvider;
    gatewayFileId: string | null;
    externalUrl: string | null;
    gatewayUploadedAt: Date | null;
    gatewayLastError: string | null;
    gatewayAttempts: number;
    localPurgeableAt: Date | null;
}
