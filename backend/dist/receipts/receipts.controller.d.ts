import { Repository } from 'typeorm';
import { ReceiptsService } from './receipts.service';
import { CreateReceiptDto, UpdateReceiptDto } from './receipts.dto';
import { Service } from '../services/service.entity';
import { Building } from '../buildings/building.entity';
export declare class ReceiptsController {
    private readonly svc;
    private readonly serviceRepo;
    private readonly buildingRepo;
    constructor(svc: ReceiptsService, serviceRepo: Repository<Service>, buildingRepo: Repository<Building>);
    create(dto: CreateReceiptDto): Promise<import("./receipt.entity").Receipt>;
    recalcularFactor(reciboId: string, save?: string): Promise<{
        reciboId: string;
        totalUnidadesFactura: number;
        sumaM3Mediciones: number;
        factorAjuste: number;
        factorEstado: string;
        mensaje: string;
    }>;
    update(id: string, dto: UpdateReceiptDto): Promise<import("./receipt.entity").Receipt>;
    validatePeriod(buildingId: string, month: number, year: number): Promise<{
        listo: boolean;
        serviciosFaltantes: string[];
        detalle: Record<string, {
            cargado: boolean;
            monto?: number;
            precioM3?: number;
        }>;
    }>;
    getPeriodReceipts(buildingId: string, month: number, year: number): Promise<{
        periodoMes: number;
        periodoAnio: number;
        listo: boolean;
        serviciosItems: any[];
        servicios: {};
        agua?: undefined;
        luz?: undefined;
        internet?: undefined;
        limpieza?: undefined;
    } | {
        periodoMes: number;
        periodoAnio: number;
        listo: boolean;
        serviciosItems: {
            tipo: import("../services/service.entity").TipoServicio;
            servicio: Service;
            recibo: any;
            cargado: boolean;
            icon: string;
            color: string;
            titulo: string;
            descripcion: string;
        }[];
        agua: any;
        luz: any;
        internet: any;
        limpieza: any;
        servicios: Record<string, any>;
    }>;
    findAll(serviceId?: string, year?: number, month?: number): Promise<import("./receipt.entity").Receipt[]>;
    findOne(id: string): Promise<import("./receipt.entity").Receipt>;
}
