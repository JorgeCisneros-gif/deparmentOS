import { Repository } from 'typeorm';
import { Department } from './department.entity';
import { CreateDepartmentDto, UpdateDepartmentDto } from './departments.dto';
export declare class DepartmentsService {
    private readonly repo;
    constructor(repo: Repository<Department>);
    create(dto: CreateDepartmentDto): Promise<Department>;
    findAll(idEdificio?: string): Promise<Department[]>;
    findOne(id: string): Promise<Department>;
    update(id: string, dto: UpdateDepartmentDto): Promise<Department>;
}
