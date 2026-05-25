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
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const bcrypt = require("bcrypt");
const user_entity_1 = require("./user.entity");
let UsersService = class UsersService {
    constructor(repo) {
        this.repo = repo;
    }
    async create(dto) {
        const exists = await this.repo.findOne({ where: { email: dto.email } });
        if (exists)
            throw new common_1.ConflictException('El email ya está registrado');
        if (dto.role === user_entity_1.UserRole.SUPERVISOR && !dto.idEdificio) {
            throw new common_1.BadRequestException('El supervisor debe tener un idEdificio asignado');
        }
        if (dto.role === user_entity_1.UserRole.ADMINISTRADOR && !dto.idEdificio) {
            throw new common_1.BadRequestException('El administrador debe tener un idEdificio asignado');
        }
        if (dto.role === user_entity_1.UserRole.PROPIETARIO && !dto.idDepartamento) {
            throw new common_1.BadRequestException('El propietario debe tener un idDepartamento asignado');
        }
        let idPropietario = dto.idPropietario || null;
        if (dto.role === user_entity_1.UserRole.PROPIETARIO && dto.idDepartamento && !idPropietario) {
            const deptData = await this.repo.query(`SELECT id_propietario FROM departamentos WHERE id = $1 LIMIT 1`, [dto.idDepartamento]);
            if (deptData[0]?.id_propietario) {
                idPropietario = deptData[0].id_propietario;
            }
        }
        const passwordHash = await bcrypt.hash(dto.password, 10);
        const user = this.repo.create({
            email: dto.email,
            passwordHash,
            role: dto.role,
            idEdificio: dto.idEdificio || null,
            idDepartamento: dto.idDepartamento || null,
            idPropietario,
            isActive: true,
        });
        return this.repo.save(user);
    }
    async findAll(role) {
        return this.repo.find({
            where: role ? { role } : {},
            order: { createdAt: 'DESC' },
        });
    }
    async findOne(id) {
        const user = await this.repo.findOne({ where: { id } });
        if (!user)
            throw new common_1.NotFoundException('Usuario no encontrado');
        return user;
    }
    async findByEmail(email) {
        return this.repo.findOne({ where: { email } });
    }
    async update(id, dto) {
        const user = await this.findOne(id);
        if (dto.password) {
            dto.passwordHash = await bcrypt.hash(dto.password, 10);
            delete dto.password;
        }
        Object.assign(user, dto);
        return this.repo.save(user);
    }
    async changePassword(id, dto) {
        const user = await this.findOne(id);
        const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
        if (!valid)
            throw new common_1.BadRequestException('Contraseña actual incorrecta');
        user.passwordHash = await bcrypt.hash(dto.newPassword, 10);
        await this.repo.save(user);
    }
    async deactivate(id) {
        const user = await this.findOne(id);
        user.isActive = false;
        await this.repo.save(user);
    }
    async updateRefreshToken(id, token) {
        const hashed = token ? await bcrypt.hash(token, 10) : null;
        await this.repo.update(id, { refreshToken: hashed });
    }
    async validateRefreshToken(id, token) {
        const user = await this.findOne(id);
        if (!user.refreshToken)
            return false;
        return bcrypt.compare(token, user.refreshToken);
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], UsersService);
//# sourceMappingURL=users.service.js.map