import { Repository } from 'typeorm';
import { Service } from './service.entity';
import { CreateServiceDto, UpdateServiceDto } from './services.dto';
export declare class ServicesService {
    private readonly repo;
    constructor(repo: Repository<Service>);
    create(dto: CreateServiceDto): Promise<Service>;
    findAll(idEdificio?: string): Promise<Service[]>;
    findOne(id: string): Promise<Service>;
    update(id: string, dto: UpdateServiceDto): Promise<Service>;
    remove(id: string): Promise<{
        message: string;
    }>;
}
