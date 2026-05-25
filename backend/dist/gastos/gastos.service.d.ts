import { Repository } from 'typeorm';
import { GastoExtra } from './gasto-extra.entity';
import { PagoGasto } from './pago-gasto.entity';
import { Department } from '../departments/department.entity';
import { CreateGastoDto, UpdateGastoDto, CreatePagoGastoDto } from './gastos.dto';
export declare class GastosService {
    private readonly gastoRepo;
    private readonly pagoRepo;
    private readonly deptRepo;
    private readonly logger;
    constructor(gastoRepo: Repository<GastoExtra>, pagoRepo: Repository<PagoGasto>, deptRepo: Repository<Department>);
    findAll(idEdificio: string, estado?: string): Promise<any[]>;
    findOne(id: string): Promise<any>;
    create(dto: CreateGastoDto): Promise<GastoExtra>;
    update(id: string, dto: UpdateGastoDto): Promise<GastoExtra>;
    cerrar(id: string): Promise<GastoExtra>;
    anular(id: string): Promise<GastoExtra>;
    getPagos(idGastoExtra: string): Promise<PagoGasto[]>;
    registrarPago(dto: CreatePagoGastoDto, comprobanteUrl?: string): Promise<PagoGasto>;
    deletePago(id: string): Promise<{
        deleted: boolean;
    }>;
    updatePagoComprobante(pagoId: string, comprobanteUrl: string): Promise<PagoGasto>;
    private _getDeptosConEstado;
}
