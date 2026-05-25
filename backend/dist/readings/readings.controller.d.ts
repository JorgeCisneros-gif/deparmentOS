import { ReadingsService } from './readings.service';
import { CreateReadingDto, UpdateReadingDto, ConfirmOcrReadingDto } from './readings.dto';
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
        filepath: string;
    }>;
    findOne(id: string): Promise<import("./reading.entity").Reading>;
    update(id: string, dto: UpdateReadingDto): Promise<import("./reading.entity").Reading>;
    uploadOcr(req: any): Promise<{
        meterImageId: string;
        ocrResult: any;
        message: string;
        siguientePaso: string;
    }>;
    confirmOcr(body: {
        meterImageId: string;
    } & ConfirmOcrReadingDto, req: any): Promise<import("./reading.entity").Reading>;
    housekeeping(): Promise<{
        deleted: number;
    }>;
}
