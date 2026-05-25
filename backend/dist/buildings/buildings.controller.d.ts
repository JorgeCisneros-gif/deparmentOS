import { BuildingsService } from './buildings.service';
import { CreateBuildingDto, UpdateBuildingDto } from './buildings.dto';
export declare class BuildingsController {
    private readonly svc;
    constructor(svc: BuildingsService);
    create(dto: CreateBuildingDto): Promise<import("./building.entity").Building>;
    findAll(): Promise<import("./building.entity").Building[]>;
    findOne(id: string): Promise<import("./building.entity").Building>;
    update(id: string, dto: UpdateBuildingDto): Promise<import("./building.entity").Building>;
    remove(id: string): Promise<{
        message: string;
    }>;
}
