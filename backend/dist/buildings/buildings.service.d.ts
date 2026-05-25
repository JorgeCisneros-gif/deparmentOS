import { Repository } from 'typeorm';
import { Building } from './building.entity';
import { CreateBuildingDto, UpdateBuildingDto } from './buildings.dto';
export declare class BuildingsService {
    private readonly repo;
    constructor(repo: Repository<Building>);
    create(dto: CreateBuildingDto): Promise<Building>;
    findAll(): Promise<Building[]>;
    findOne(id: string): Promise<Building>;
    update(id: string, dto: UpdateBuildingDto): Promise<Building>;
    remove(id: string): Promise<{
        message: string;
    }>;
}
