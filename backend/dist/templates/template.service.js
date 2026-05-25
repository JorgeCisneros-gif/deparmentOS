"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemplateService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const template_entity_1 = require("./template.entity");
const MESES = [
    '', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Setiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
function render(cuerpo, vars) {
    return cuerpo.replace(/\{\{(\w+)\}\}/g, (_, key) => {
        const val = vars[key];
        return val !== undefined && val !== null ? String(val) : '';
    });
}
const VARIABLES_POR_TIPO = {
    [template_entity_1.TemplateTipo.CUOTA_SERVICIOS]: [
        'propietario', 'depto', 'edificio', 'periodo', 'mes', 'anio',
        'm3', 'precio_m3', 'monto_agua', 'monto_luz', 'monto_internet',
        'monto_limpieza', 'monto_otros', 'ajuste', 'monto_total',
        'fecha_vencimiento', 'status_pago',
    ],
    [template_entity_1.TemplateTipo.RECORDATORIO_PAGO]: [
        'propietario', 'depto', 'edificio', 'periodo', 'mes', 'anio',
        'monto_total', 'fecha_vencimiento', 'status_pago',
    ],
    [template_entity_1.TemplateTipo.LIMPIEZA]: [
        'propietario', 'depto', 'edificio', 'periodo', 'mes', 'anio',
        'dias_trabajados', 'ambientes', 'costo_dia',
        'monto_total_limpieza', 'cuota_depto', 'nro_deptos',
    ],
    [template_entity_1.TemplateTipo.BIENVENIDA]: [
        'propietario', 'depto', 'edificio', 'mensaje_libre',
    ],
    [template_entity_1.TemplateTipo.AVISO_GENERAL]: [
        'propietario', 'depto', 'edificio', 'periodo', 'mensaje_libre',
    ],
};
let TemplateService = class TemplateService {
    constructor(repo) {
        this.repo = repo;
    }
    async create(dto, userId) {
        if (dto.esDefault) {
            await this.repo.update({ idEdificio: dto.idEdificio, tipo: dto.tipo, esDefault: true }, { esDefault: false });
        }
        return this.repo.save(this.repo.create({ ...dto, createdBy: userId }));
    }
    findAll(idEdificio, tipo) {
        const where = { idEdificio, activo: true };
        if (tipo)
            where.tipo = tipo;
        return this.repo.find({ where, order: { esDefault: 'DESC', nombre: 'ASC' } });
    }
    async findOne(id) {
        const t = await this.repo.findOne({ where: { id } });
        if (!t)
            throw new common_1.NotFoundException('Plantilla no encontrada');
        return t;
    }
    async findDefault(idEdificio, tipo) {
        return this.repo.findOne({ where: { idEdificio, tipo, esDefault: true, activo: true } });
    }
    async update(id, dto) {
        const t = await this.findOne(id);
        if (dto.esDefault) {
            await this.repo.update({ idEdificio: t.idEdificio, tipo: t.tipo, esDefault: true }, { esDefault: false });
        }
        Object.assign(t, dto);
        return this.repo.save(t);
    }
    async deactivate(id) {
        const t = await this.findOne(id);
        t.activo = false;
        await this.repo.save(t);
    }
    getVariables(tipo) {
        if (tipo)
            return VARIABLES_POR_TIPO[tipo] || [];
        return VARIABLES_POR_TIPO;
    }
    async preview(id) {
        const template = await this.findOne(id);
        const ejemplos = {
            propietario: 'Angela Felipa', depto: '201', edificio: 'Edificio Carlos Izaguirre',
            periodo: 'Marzo 2024', mes: 'Marzo', anio: '2024',
            m3: '16.38', precio_m3: '3.61', monto_agua: '59.12',
            monto_luz: '4.75', monto_internet: '3.00', monto_limpieza: '36.00',
            monto_otros: '0.00', ajuste: '0.00', monto_total: '102.87',
            fecha_vencimiento: '24 de Marzo', status_pago: 'pendiente',
            dias_trabajados: '9', ambientes: 'Edificio Principal y Cochera',
            costo_dia: '40.00', monto_total_limpieza: '360.00',
            cuota_depto: '36.00', nro_deptos: '10',
            mensaje_libre: '[Texto del comunicado aquí]',
        };
        return {
            cuerpo: template.cuerpo,
            renderizado: render(template.cuerpo, ejemplos),
        };
    }
    async renderForOne(dto) {
        const template = await this.findOne(dto.templateId);
        const vars = await this.resolveVars(template.tipo, dto);
        return {
            template: { id: template.id, nombre: template.nombre, tipo: template.tipo },
            depto: String(vars.depto || ''),
            propietario: String(vars.propietario || ''),
            telefono: String(vars['_telefono'] || ''),
            mensajeTexto: render(template.cuerpo, vars),
            variablesUsadas: vars,
        };
    }
    async renderForAll(dto) {
        const template = await this.findOne(dto.templateId);
        const deptos = await this.repo.query(`SELECT d.id, d.nr_departamento, p.nombre, p.telefono
       FROM departamentos d
       LEFT JOIN propietarios p ON p.id = d.id_propietario
       WHERE d.id_edificio = $1 AND d.status = 'activo'
       ORDER BY d.nr_departamento`, [dto.idEdificio]);
        const mensajes = await Promise.all(deptos.map(async (depto) => {
            const vars = await this.resolveVars(template.tipo, {
                ...dto,
                departamentoId: depto.id,
            }, {
                depto: depto.nr_departamento,
                propietario: depto.nombre || 'Vecino/a',
                _telefono: depto.telefono || '',
            });
            return {
                depto: depto.nr_departamento,
                propietario: depto.nombre || 'Vecino/a',
                telefono: depto.telefono || '',
                mensajeTexto: render(template.cuerpo, vars),
            };
        }));
        return {
            template: { id: template.id, nombre: template.nombre, tipo: template.tipo },
            totalDeptos: mensajes.length,
            mensajes,
        };
    }
    async resolveVars(tipo, dto, overrides = {}) {
        const vars = { ...overrides };
        if (dto.variablesExtra)
            Object.assign(vars, dto.variablesExtra);
        if (dto.feeId && [template_entity_1.TemplateTipo.CUOTA_SERVICIOS, template_entity_1.TemplateTipo.RECORDATORIO_PAGO].includes(tipo)) {
            const [feeData] = await this.repo.query(`SELECT
           f.id, f.periodo_mes, f.periodo_anio,
           f.monto_agua, f.monto_luz, f.monto_internet,
           f.monto_limpieza, f.monto_otros, f.ajuste_mes_anterior,
           f.monto_total, f.fecha_vencimiento, f.status_pago,
           d.nr_departamento,
           e.nombre AS edificio_nombre,
           p.nombre AS prop_nombre, p.telefono,
           md.m3_consumido, rs.precio_m3
         FROM cuotas_departamento f
         JOIN departamentos d ON d.id = f.id_departamento
         JOIN edificios e ON e.id = d.id_edificio
         LEFT JOIN propietarios p ON p.id = d.id_propietario
         LEFT JOIN mediciones_departamento md ON md.id_departamento = d.id
           AND md.id_recibo IN (
             SELECT rs2.id FROM recibos_servicio rs2
             JOIN servicios s ON s.id = rs2.id_servicio AND s.tipo = 'agua'
             WHERE rs2.periodo_mes = f.periodo_mes AND rs2.periodo_anio = f.periodo_anio
           )
         LEFT JOIN recibos_servicio rs ON rs.id = md.id_recibo
         WHERE f.id = $1
         LIMIT 1`, [dto.feeId]);
            if (feeData) {
                const mes = MESES[feeData.periodo_mes];
                Object.assign(vars, {
                    propietario: feeData.prop_nombre || 'Vecino/a',
                    depto: feeData.nr_departamento,
                    edificio: feeData.edificio_nombre,
                    periodo: `${mes} ${feeData.periodo_anio}`,
                    mes,
                    anio: feeData.periodo_anio,
                    m3: feeData.m3_consumido ? parseFloat(feeData.m3_consumido).toFixed(3) : '0',
                    precio_m3: feeData.precio_m3 ? parseFloat(feeData.precio_m3).toFixed(4) : '0',
                    monto_agua: parseFloat(feeData.monto_agua || 0).toFixed(2),
                    monto_luz: parseFloat(feeData.monto_luz || 0).toFixed(2),
                    monto_internet: parseFloat(feeData.monto_internet || 0).toFixed(2),
                    monto_limpieza: parseFloat(feeData.monto_limpieza || 0).toFixed(2),
                    monto_otros: parseFloat(feeData.monto_otros || 0).toFixed(2),
                    ajuste: parseFloat(feeData.ajuste_mes_anterior || 0).toFixed(2),
                    monto_total: parseFloat(feeData.monto_total || 0).toFixed(2),
                    fecha_vencimiento: feeData.fecha_vencimiento || '',
                    status_pago: feeData.status_pago,
                    _telefono: feeData.telefono || '',
                });
            }
        }
        if (dto.cleaningRecordId && tipo === template_entity_1.TemplateTipo.LIMPIEZA) {
            const [recData] = await this.repo.query(`SELECT
           r.periodo_mes, r.periodo_anio, r.dias_trabajados,
           r.ambientes_ids, r.monto_total, r.costo_base,
           prov.costo_por_dia,
           e.nombre AS edificio_nombre,
           (SELECT COUNT(*) FROM departamentos WHERE id_edificio = r.id_edificio AND status = 'activo') AS nro_deptos
         FROM registros_limpieza r
         JOIN proveedores_limpieza prov ON prov.id = r.id_proveedor
         JOIN edificios e ON e.id = r.id_edificio
         WHERE r.id = $1`, [dto.cleaningRecordId]);
            if (recData) {
                let ambientesStr = '';
                if (recData.ambientes_ids?.length) {
                    const ambientes = await this.repo.query(`SELECT nombre FROM ambientes_limpieza WHERE id = ANY($1) ORDER BY orden`, [recData.ambientes_ids]);
                    ambientesStr = ambientes.map((a) => a.nombre).join(' y ');
                }
                const nroDeptos = parseInt(recData.nro_deptos) || 1;
                const cuotaDepto = (parseFloat(recData.monto_total) / nroDeptos).toFixed(2);
                const mes = MESES[recData.periodo_mes];
                if (dto.departamentoId) {
                    const [deptoData] = await this.repo.query(`SELECT d.nr_departamento, p.nombre, p.telefono
             FROM departamentos d LEFT JOIN propietarios p ON p.id = d.id_propietario
             WHERE d.id = $1`, [dto.departamentoId]);
                    if (deptoData) {
                        vars.propietario = deptoData.nombre || 'Vecino/a';
                        vars.depto = deptoData.nr_departamento;
                        vars._telefono = deptoData.telefono || '';
                    }
                }
                Object.assign(vars, {
                    edificio: recData.edificio_nombre,
                    periodo: `${mes} ${recData.periodo_anio}`,
                    mes,
                    anio: recData.periodo_anio,
                    dias_trabajados: recData.dias_trabajados,
                    ambientes: ambientesStr,
                    costo_dia: parseFloat(recData.costo_por_dia).toFixed(2),
                    monto_total_limpieza: parseFloat(recData.monto_total).toFixed(2),
                    cuota_depto: cuotaDepto,
                    nro_deptos: nroDeptos,
                });
            }
        }
        if (dto.departamentoId &&
            [template_entity_1.TemplateTipo.BIENVENIDA, template_entity_1.TemplateTipo.AVISO_GENERAL].includes(tipo) &&
            !vars.propietario) {
            const [deptoData] = await this.repo.query(`SELECT d.nr_departamento, e.nombre AS edificio_nombre,
                p.nombre AS prop_nombre, p.telefono
         FROM departamentos d
         JOIN edificios e ON e.id = d.id_edificio
         LEFT JOIN propietarios p ON p.id = d.id_propietario
         WHERE d.id = $1`, [dto.departamentoId]);
            if (deptoData) {
                Object.assign(vars, {
                    propietario: deptoData.prop_nombre || 'Vecino/a',
                    depto: deptoData.nr_departamento,
                    edificio: deptoData.edificio_nombre,
                    _telefono: deptoData.telefono || '',
                });
            }
        }
        return vars;
    }
};
exports.TemplateService = TemplateService;
exports.TemplateService = TemplateService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(template_entity_1.MessageTemplate)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], TemplateService);
//# sourceMappingURL=template.service.js.map