import { FeesService } from './fees.service';
import { CalculateFeesDto, UpdateFeeStatusDto } from './fees.dto';
export declare class FeesController {
    private readonly svc;
    constructor(svc: FeesService);
    calculate(dto: CalculateFeesDto): Promise<import("./fee.entity").Fee[]>;
    findAll(req: any, deptId?: string, year?: number, month?: number, status?: string): Promise<import("./fee.entity").Fee[]>;
    pending(buildingId: string, month: number, year: number): Promise<any[]>;
    findOne(id: string, req: any): Promise<import("./fee.entity").Fee>;
    updateStatus(id: string, dto: UpdateFeeStatusDto): Promise<import("./fee.entity").Fee>;
    getPeriodVencimiento(buildingId: string, month: number, year: number): Promise<{
        fechaVencimiento: string | null;
        totalCuotas: number;
    }>;
    updatePeriodVencimiento(body: {
        buildingId: string;
        month: number;
        year: number;
        fechaVencimiento: string;
    }): Promise<{
        updated: number;
    }>;
}
