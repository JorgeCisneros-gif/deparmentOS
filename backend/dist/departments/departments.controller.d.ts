import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto, UpdateDepartmentDto } from './departments.dto';
export declare class DepartmentsController {
    private readonly svc;
    constructor(svc: DepartmentsService);
    create(dto: CreateDepartmentDto): Promise<import("./department.entity").Department>;
    findAll(buildingId?: string): Promise<import("./department.entity").Department[]>;
    findOne(id: string): Promise<import("./department.entity").Department>;
    update(id: string, dto: UpdateDepartmentDto): Promise<import("./department.entity").Department>;
}
