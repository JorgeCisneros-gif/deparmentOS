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
exports.PropietariosService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const propietario_entity_1 = require("./propietario.entity");
let PropietariosService = class PropietariosService {
    constructor(repo) {
        this.repo = repo;
    }
    async create(dto) {
        const { idDepartamento, ...propData } = dto;
        const entity = this.repo.create(propData);
        const saved = await this.repo.save(entity);
        if (idDepartamento) {
            await this.repo.query(`UPDATE departamentos SET id_propietario = $1 WHERE id = $2`, [saved.id, idDepartamento]);
        }
        return saved;
    }
    findAll(status) {
        const where = status ? { status } : {};
        return this.repo.find({ where, order: { nombre: 'ASC' } });
    }
    async findOne(id) {
        const p = await this.repo.findOne({ where: { id } });
        if (!p)
            throw new common_1.NotFoundException('Propietario no encontrado');
        return p;
    }
    async update(id, dto) {
        const p = await this.findOne(id);
        Object.assign(p, dto);
        return this.repo.save(p);
    }
    async deactivate(id) {
        const p = await this.findOne(id);
        p.status = 'inactivo';
        return this.repo.save(p);
    }
    async findAllWithDept(idEdificio) {
        let sql = `
      SELECT
        p.id, p.nombre, p.telefono, p.correo, p.banco, p.tipo_pago,
        p.status, p.observacion, p.created_at,
        d.id AS depto_id, d.nr_departamento, d.piso,
        e.id AS edificio_id, e.nombre AS edificio_nombre
      FROM propietarios p
      LEFT JOIN departamentos d ON d.id_propietario = p.id
      LEFT JOIN edificios e ON e.id = d.id_edificio
    `;
        const params = [];
        if (idEdificio) {
            sql += ` WHERE e.id = $1`;
            params.push(idEdificio);
        }
        sql += ` ORDER BY p.nombre ASC`;
        return this.repo.query(sql, params);
    }
};
exports.PropietariosService = PropietariosService;
exports.PropietariosService = PropietariosService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(propietario_entity_1.Propietario)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], PropietariosService);
//# sourceMappingURL=propietarios.service.js.map