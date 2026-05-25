import { Repository } from 'typeorm';
import { CleaningProvider, CleaningArea, CleaningRecord } from './cleaning.entities';
import { CreateProviderDto, UpdateProviderDto, CreateAreaDto, UpdateAreaDto, CreateCleaningRecordDto, UpdateCleaningRecordDto, ConfirmProviderPaymentDto } from './cleaning.dto';
export declare class CleaningService {
    private readonly providerRepo;
    private readonly areaRepo;
    private readonly recordRepo;
    constructor(providerRepo: Repository<CleaningProvider>, areaRepo: Repository<CleaningArea>, recordRepo: Repository<CleaningRecord>);
    createProvider(dto: CreateProviderDto): Promise<CleaningProvider>;
    findProviders(idEdificio: string): Promise<CleaningProvider[]>;
    findProvider(id: string): Promise<CleaningProvider>;
    updateProvider(id: string, dto: UpdateProviderDto): Promise<CleaningProvider>;
    deactivateProvider(id: string): Promise<CleaningProvider>;
    createArea(dto: CreateAreaDto): Promise<CleaningArea>;
    findAreas(idEdificio: string): Promise<CleaningArea[]>;
    findArea(id: string): Promise<CleaningArea>;
    updateArea(id: string, dto: UpdateAreaDto): Promise<CleaningArea>;
    createRecord(dto: CreateCleaningRecordDto): Promise<CleaningRecord>;
    findRecords(idEdificio: string, anio?: number, mes?: number): Promise<CleaningRecord[]>;
    findRecord(id: string): Promise<CleaningRecord>;
    updateRecord(id: string, dto: UpdateCleaningRecordDto): Promise<CleaningRecord>;
    confirmProviderPayment(id: string, dto: ConfirmProviderPaymentDto): Promise<CleaningRecord>;
    generateCleaningMessage(recordId: string, idEdificio: string): Promise<{
        mensajeTexto: string;
        desglose: object;
        datosPago: object;
        cuotaPorDepto: number;
    }>;
    confirmCleaningMessageSent(recordId: string, supervisorId: string): Promise<{
        mensaje: string;
        record: CleaningRecord;
    }>;
}
