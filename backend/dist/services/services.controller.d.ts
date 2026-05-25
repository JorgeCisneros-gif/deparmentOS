import { ServicesService } from './services.service';
import { CreateServiceDto, UpdateServiceDto } from './services.dto';
export declare class ServicesController {
    private readonly svc;
    constructor(svc: ServicesService);
    create(dto: CreateServiceDto): Promise<import("./service.entity").Service>;
    findAll(buildingId?: string): Promise<import("./service.entity").Service[]>;
    findOne(id: string): Promise<import("./service.entity").Service>;
    update(id: string, dto: UpdateServiceDto): Promise<import("./service.entity").Service>;
    remove(id: string): Promise<{
        message: string;
    }>;
}
