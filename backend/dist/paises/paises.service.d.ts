import { Repository } from 'typeorm';
import { Pais } from './pais.entity';
export declare class PaisesService {
    private readonly repo;
    constructor(repo: Repository<Pais>);
    findAll(): Promise<Pais[]>;
    findByCodigo(codigo: string): Promise<Pais>;
}
