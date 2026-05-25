export interface UploadedImageResult {
    buffer: Buffer;
    filename: string;
    mimeType: string;
    fileSizeKb: number;
    filepath: string;
}
export interface SaveImageOptions {
    subdir?: string;
    maxSizeMb?: number;
    allowedMimes?: string[];
}
export declare class ImageUploadService {
    private readonly logger;
    parseMultipart(req: any, opts?: SaveImageOptions): Promise<{
        fields: Record<string, string>;
        image: UploadedImageResult;
    }>;
    saveBuffer(buffer: Buffer, originalName: string, prefix: string, opts?: SaveImageOptions): string;
    saveBase64(base64: string, originalName: string, prefix: string, opts?: SaveImageOptions): string;
    deleteIfExists(filepath: string): void;
}
