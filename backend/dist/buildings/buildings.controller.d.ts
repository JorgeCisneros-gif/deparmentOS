import { BuildingsService } from './buildings.service';
import { CreateBuildingDto, UpdateBuildingDto } from './buildings.dto';
import { GruposService } from '../grupos/grupos.service';
export declare class BuildingsController {
    private readonly svc;
    private readonly gruposSvc;
    constructor(svc: BuildingsService, gruposSvc: GruposService);
    create(dto: CreateBuildingDto, req: any): Promise<import("./building.entity").Building>;
    findAll(req: any): Promise<any[]>;
    findOne(id: string): Promise<import("./building.entity").Building>;
    update(id: string, dto: UpdateBuildingDto, req: any): Promise<import("./building.entity").Building>;
    remove(id: string): Promise<{
        message: string;
    }>;
}
