import { GastosService } from './gastos.service';
import { CreateGastoDto, UpdateGastoDto } from './gastos.dto';
import { ImageUploadService } from '../shared/image-upload.service';
export declare class GastosController {
    private readonly svc;
    private readonly imgSvc;
    private readonly logger;
    constructor(svc: GastosService, imgSvc: ImageUploadService);
    findAll(buildingId: string, estado?: string): Promise<any[]>;
    findOne(id: string): Promise<any>;
    create(dto: CreateGastoDto): Promise<import("./gasto-extra.entity").GastoExtra>;
    update(id: string, dto: UpdateGastoDto): Promise<import("./gasto-extra.entity").GastoExtra>;
    cerrar(id: string): Promise<import("./gasto-extra.entity").GastoExtra>;
    anular(id: string): Promise<import("./gasto-extra.entity").GastoExtra>;
    getPagos(id: string): Promise<import("./pago-gasto.entity").PagoGasto[]>;
    registrarPago(req: any): Promise<import("./pago-gasto.entity").PagoGasto>;
    deletePago(id: string): Promise<{
        deleted: boolean;
    }>;
    uploadComprobante(id: string, body: {
        base64: string;
        filename: string;
    }): Promise<import("./pago-gasto.entity").PagoGasto>;
}
