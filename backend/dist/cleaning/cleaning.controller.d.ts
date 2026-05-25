import { CleaningService } from './cleaning.service';
import { CreateProviderDto, UpdateProviderDto, CreateAreaDto, UpdateAreaDto, CreateCleaningRecordDto, UpdateCleaningRecordDto, ConfirmProviderPaymentDto } from './cleaning.dto';
export declare class CleaningController {
    private readonly svc;
    constructor(svc: CleaningService);
    createProvider(dto: CreateProviderDto): Promise<import("./cleaning.entities").CleaningProvider>;
    findProviders(buildingId: string): Promise<import("./cleaning.entities").CleaningProvider[]>;
    findProvider(id: string): Promise<import("./cleaning.entities").CleaningProvider>;
    updateProvider(id: string, dto: UpdateProviderDto): Promise<import("./cleaning.entities").CleaningProvider>;
    deactivateProvider(id: string): Promise<import("./cleaning.entities").CleaningProvider>;
    createArea(dto: CreateAreaDto): Promise<import("./cleaning.entities").CleaningArea>;
    findAreas(buildingId: string): Promise<import("./cleaning.entities").CleaningArea[]>;
    findArea(id: string): Promise<import("./cleaning.entities").CleaningArea>;
    updateArea(id: string, dto: UpdateAreaDto): Promise<import("./cleaning.entities").CleaningArea>;
    createRecord(dto: CreateCleaningRecordDto): Promise<import("./cleaning.entities").CleaningRecord>;
    findRecords(buildingId: string, year?: number, month?: number): Promise<import("./cleaning.entities").CleaningRecord[]>;
    findRecord(id: string): Promise<import("./cleaning.entities").CleaningRecord>;
    updateRecord(id: string, dto: UpdateCleaningRecordDto): Promise<import("./cleaning.entities").CleaningRecord>;
    confirmProviderPayment(id: string, dto: ConfirmProviderPaymentDto): Promise<import("./cleaning.entities").CleaningRecord>;
    getMessage(id: string, buildingId: string): Promise<{
        mensajeTexto: string;
        desglose: object;
        datosPago: object;
        cuotaPorDepto: number;
    }>;
    confirmMessage(id: string, req: any): Promise<{
        mensaje: string;
        record: import("./cleaning.entities").CleaningRecord;
    }>;
}
