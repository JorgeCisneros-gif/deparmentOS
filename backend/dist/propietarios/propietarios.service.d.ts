import { Repository } from 'typeorm';
import { Propietario } from './propietario.entity';
import { CreatePropietarioDto, UpdatePropietarioDto } from './propietarios.dto';
export declare class PropietariosService {
    private readonly repo;
    constructor(repo: Repository<Propietario>);
    create(dto: CreatePropietarioDto & {
        idDepartamento?: string;
    }): Promise<Propietario>;
    findAll(status?: string): Promise<Propietario[]>;
    findOne(id: string): Promise<Propietario>;
    update(id: string, dto: UpdatePropietarioDto): Promise<Propietario>;
    deactivate(id: string): Promise<Propietario>;
    findAllWithDept(idEdificio?: string): Promise<any[]>;
}
