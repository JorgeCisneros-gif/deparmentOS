import { PropietariosService } from './propietarios.service';
import { CreatePropietarioDto, UpdatePropietarioDto } from './propietarios.dto';
export declare class PropietariosController {
    private readonly svc;
    constructor(svc: PropietariosService);
    create(dto: CreatePropietarioDto): Promise<import("./propietario.entity").Propietario>;
    findAll(buildingId?: string, status?: string): Promise<any[]>;
    findOne(id: string): Promise<import("./propietario.entity").Propietario>;
    update(id: string, dto: UpdatePropietarioDto): Promise<import("./propietario.entity").Propietario>;
    deactivate(id: string): Promise<import("./propietario.entity").Propietario>;
}
