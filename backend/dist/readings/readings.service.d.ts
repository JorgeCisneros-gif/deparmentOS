import { Repository } from 'typeorm';
import { Reading } from './reading.entity';
import { MeterImage } from './meter-image.entity';
import { OcrService } from './ocr.service';
import { CreateReadingDto, UpdateReadingDto, ConfirmOcrReadingDto } from './readings.dto';
import { ReceiptsService } from '../receipts/receipts.service';
import { DepartmentsService } from '../departments/departments.service';
export declare class ReadingsService {
    private readonly readingRepo;
    private readonly imageRepo;
    private readonly ocrService;
    private readonly receiptsService;
    private readonly departmentsService;
    private readonly logger;
    private readonly uploadDir;
    constructor(readingRepo: Repository<Reading>, imageRepo: Repository<MeterImage>, ocrService: OcrService, receiptsService: ReceiptsService, departmentsService: DepartmentsService);
    private assertPeriodReady;
    create(dto: CreateReadingDto): Promise<Reading>;
    findAll(idRecibo?: string, idDepartamento?: string): Promise<any[]>;
    findOne(id: string): Promise<Reading>;
    update(id: string, dto: UpdateReadingDto): Promise<Reading>;
    processOcrImage(fileBuffer: Buffer, originalName: string, fileSizeKb: number, idDepartamento: string, idRecibo: string, userId: string, originalBuffer?: Buffer): Promise<{
        meterImageId: string;
        ocrResult: any;
        message: string;
        siguientePaso: string;
    }>;
    confirmOcr(meterImageId: string, dto: ConfirmOcrReadingDto, userId: string): Promise<Reading>;
    getConsumptionHistory(idDepartamento: string, isSupervisor?: boolean): Promise<{
        mesesMostrados: number;
        nota: string;
        historial: any[];
    }>;
    getMeterImageById(id: string): Promise<{
        id: string;
        filename: string;
        filepath: string;
    } | null>;
    runHousekeeping(): Promise<{
        deleted: number;
    }>;
}
