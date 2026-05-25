import { PaisesService } from './paises.service';
export declare class PaisesController {
    private readonly svc;
    constructor(svc: PaisesService);
    findAll(): Promise<import("./pais.entity").Pais[]>;
    findOne(codigo: string): Promise<import("./pais.entity").Pais>;
}
