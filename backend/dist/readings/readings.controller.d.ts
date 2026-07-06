import { ReadingsService } from './readings.service';
import { CreateReadingDto, UpdateReadingDto } from './readings.dto';
export declare class ReadingsController {
    private readonly svc;
    constructor(svc: ReadingsService);
    create(dto: CreateReadingDto): Promise<import("./reading.entity").Reading>;
    findAll(receiptId?: string, deptId?: string): Promise<any[]>;
    getHistory(deptId: string, req: any): Promise<{
        mesesMostrados: number;
        nota: string;
        historial: any[];
    }>;
    getMeterImage(id: string): Promise<{
        id: string;
        filename: string;
        storageProvider: "local" | "google_drive";
        externalUrl: string | null;
        filepath?: string | null;
    }>;
    findOne(id: string): Promise<import("./reading.entity").Reading>;
    update(id: string, dto: UpdateReadingDto): Promise<import("./reading.entity").Reading>;
    uploadOcr(req: any): Promise<{
        sessionId: string;
        ocrResult: import("./ocr.service").OcrResult;
        message: string;
        siguientePaso: string;
    }>;
    confirmOcr(body: any, req: any): Promise<import("./reading.entity").Reading>;
    housekeeping(): Promise<{
        retried: number;
        retriedOk: number;
        purgedLocal: number;
        expiredDeleted: number;
    }>;
}
