export declare class MeterImage {
    id: string;
    idDepartamento: string;
    idRecibo: string;
    filename: string;
    filepath: string;
    fileSizeKb: number;
    ocrRawValue: string;
    ocrConfidence: number;
    ocrUsedRed: boolean;
    lecturaFinal: number;
    ocrMetadata: object;
    expiresAt: string;
    createdBy: string;
    createdAt: Date;
}
