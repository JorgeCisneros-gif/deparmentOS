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
    readMeterFromBuffer(buffer: Buffer, filename?: string): Promise<OcrResult>;
    readMeter(imagePath: string): Promise<OcrResult>;
    private callOcrEndpoint;
    private parseReading;
}
