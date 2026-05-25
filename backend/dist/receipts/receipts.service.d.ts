import { Repository } from 'typeorm';
import { Receipt } from './receipt.entity';
import { CreateReceiptDto, UpdateReceiptDto } from './receipts.dto';
import { Service } from '../services/service.entity';
import { Building } from '../buildings/building.entity';
export declare const INTERNET_MONTO_DEFAULT = 30;
export declare class ReceiptsService {
    private readonly repo;
    private readonly serviceRepo;
    private readonly buildingRepo;
    constructor(repo: Repository<Receipt>, serviceRepo: Repository<Service>, buildingRepo: Repository<Building>);
    create(dto: CreateReceiptDto): Promise<Receipt>;
    findAll(idServicio?: string, anio?: number, mes?: number): Promise<Receipt[]>;
    findOne(id: string): Promise<Receipt>;
    update(id: string, dto: UpdateReceiptDto): Promise<Receipt>;
    validatePeriodReceipts(idEdificio: string, periodoMes: number, periodoAnio: number): Promise<{
        listo: boolean;
        serviciosFaltantes: string[];
        detalle: Record<string, {
            cargado: boolean;
            monto?: number;
            precioM3?: number;
        }>;
    }>;
    recalcularFactor(reciboId: string, save?: boolean): Promise<{
        reciboId: string;
        totalUnidadesFactura: number;
        sumaM3Mediciones: number;
        factorAjuste: number;
        factorEstado: string;
        mensaje: string;
    }>;
}
