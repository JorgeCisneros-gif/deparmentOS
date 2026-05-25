export interface OcrResult {
    rawValue: string;
    lecturaFinal: number;
    confidence: number;
    usedRed: boolean;
    metadata: object;
}
export declare class OcrService {
    private readonly logger;
    private get ocrEndpoint();
    readMeter(imagePath: string): Promise<OcrResult>;
    private parseReading;
}
