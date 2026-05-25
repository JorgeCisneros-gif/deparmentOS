import { Repository } from 'typeorm';
import { Alicuota } from '../alicuotas/alicuota.entity';
import { Fee } from './fee.entity';
import { Department } from '../departments/department.entity';
import { Service } from '../services/service.entity';
import { DepartmentsService } from '../departments/departments.service';
import { ReceiptsService } from '../receipts/receipts.service';
import { ReadingsService } from '../readings/readings.service';
export declare class CalculateFeesDto {
    idEdificio: string;
    periodoMes: number;
    periodoAnio: number;
    fechaVencimiento?: string;
}
export declare class FeesService {
    private readonly repo;
    private readonly serviceRepo;
    private readonly deptRepo;
    private readonly alicuotaRepo;
    private readonly departmentsService;
    private readonly receiptsService;
    private readonly readingsService;
    private readonly logger;
    constructor(repo: Repository<Fee>, serviceRepo: Repository<Service>, deptRepo: Repository<Department>, alicuotaRepo: Repository<Alicuota>, departmentsService: DepartmentsService, receiptsService: ReceiptsService, readingsService: ReadingsService);
    calculatePeriod(dto: CalculateFeesDto): Promise<Fee[]>;
    private calcularMontoServicio;
    private calcularAguaComun;
    findAll(idDepartamento?: string, anio?: number, mes?: number, status?: string): Promise<Fee[]>;
    findOne(id: string): Promise<Fee>;
    getPendingSummary(idEdificio: string, mes: number, anio: number): Promise<any[]>;
    updateStatus(id: string, status: string): Promise<Fee>;
    getPeriodVencimiento(idEdificio: string, mes: number, anio: number): Promise<{
        fechaVencimiento: string | null;
        totalCuotas: number;
    }>;
    updatePeriodVencimiento(idEdificio: string, mes: number, anio: number, fechaVencimiento: string): Promise<{
        updated: number;
    }>;
}
