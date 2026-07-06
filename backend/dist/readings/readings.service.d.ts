import { Repository, DataSource } from 'typeorm';
import { Reading } from './reading.entity';
import { MeterImage } from './meter-image.entity';
import { OcrService } from './ocr.service';
import { OcrSessionCache } from './ocr-session.cache';
import { CreateReadingDto, UpdateReadingDto, ConfirmOcrReadingDto } from './readings.dto';
import { ReceiptsService } from '../receipts/receipts.service';
import { DepartmentsService } from '../departments/departments.service';
import { StorageGatewayService } from '../storage-gateway/storage-gateway.service';
export declare class ReadingsService {
    private readonly readingRepo;
    private readonly imageRepo;
    private readonly dataSource;
    private readonly ocrService;
    private readonly ocrSessionCache;
    private readonly receiptsService;
    private readonly departmentsService;
    private readonly storageGateway;
    private readonly logger;
    private readonly uploadDir;
    constructor(readingRepo: Repository<Reading>, imageRepo: Repository<MeterImage>, dataSource: DataSource, ocrService: OcrService, ocrSessionCache: OcrSessionCache, receiptsService: ReceiptsService, departmentsService: DepartmentsService, storageGateway: StorageGatewayService);
    private assertPeriodReady;
    private assertNoExistingMeasurement;
    create(dto: CreateReadingDto): Promise<Reading>;
    findAll(idRecibo?: string, idDepartamento?: string): Promise<any[]>;
    findOne(id: string): Promise<Reading>;
    update(id: string, dto: UpdateReadingDto): Promise<Reading>;
    processOcrImage(fileBuffer: Buffer, originalName: string, fileSizeKb: number, mimeType: string, idDepartamento: string, idRecibo: string, userId: string, originalBuffer?: Buffer): Promise<{
        sessionId: string;
        ocrResult: import("./ocr.service").OcrResult;
        message: string;
        siguientePaso: string;
    }>;
    confirmOcr(identifier: {
        sessionId?: string;
        meterImageId?: string;
    }, dto: ConfirmOcrReadingDto, userId: string): Promise<Reading>;
    private confirmFromSession;
    private confirmFromImage;
    private confirmManualReading;
    private tryUploadToGateway;
    private resolveMeterImageContext;
    getConsumptionHistory(idDepartamento: string, isSupervisor?: boolean): Promise<{
        mesesMostrados: number;
        nota: string;
        historial: any[];
    }>;
    getMeterImageById(id: string): Promise<{
        id: string;
        filename: string;
        storageProvider: 'local' | 'google_drive';
        externalUrl: string | null;
        filepath?: string | null;
    } | null>;
    runHousekeeping(): Promise<{
        retried: number;
        retriedOk: number;
        purgedLocal: number;
        expiredDeleted: number;
    }>;
    private retryPendingUploads;
    private purgeLocalAfterDriveSuccess;
    private deleteExpiredLocal;
    private guessMimeType;
}
