"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
const bcrypt = __importStar(require("bcrypt"));
const user_entity_1 = require("./user.entity");
let UsersService = class UsersService {
    constructor(repo) {
        this.repo = repo;
    }
    async create(dto, creatorRole, creatorGrupoId) {
        const exists = await this.repo.findOne({ where: { email: dto.email } });
        if (exists)
            throw new common_1.ConflictException('El email ya está registrado');
        if (creatorRole === user_entity_1.UserRole.ADMINISTRADOR) {
            if (![user_entity_1.UserRole.GESTION, user_entity_1.UserRole.PROPIETARIO].includes(dto.role)) {
                throw new common_1.ForbiddenException('El administrador solo puede crear usuarios de tipo gestión o propietario');
            }
            dto.idGrupo = creatorGrupoId;
        }
        if (dto.role === user_entity_1.UserRole.PROPIETARIO && !dto.idDepartamento) {
            throw new common_1.BadRequestException('El propietario debe tener un idDepartamento asignado');
        }
        if (dto.role === user_entity_1.UserRole.ADMINISTRADOR && !dto.idGrupo) {
            throw new common_1.BadRequestException('El administrador debe estar asociado a un grupo');
        }
        if (dto.role === user_entity_1.UserRole.GESTION && !dto.idGrupo) {
            throw new common_1.BadRequestException('El usuario de gestión debe estar asociado a un grupo');
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
            idGrupo: dto.idGrupo || null,
            idEdificio: dto.idEdificio || null,
            idDepartamento: dto.idDepartamento || null,
            idPropietario,
            isActive: true,
        });
        return this.repo.save(user);
    }
    async findAll(role, idGrupo) {
        const qb = this.repo.createQueryBuilder('u');
        if (role)
            qb.andWhere('u.role = :role', { role });
        if (idGrupo) {
            qb.andWhere('u.id_grupo = :idGrupo', { idGrupo });
            qb.andWhere('u.role != :supRole', { supRole: user_entity_1.UserRole.SUPERVISOR });
        }
        return qb.orderBy('u.created_at', 'DESC').getMany();
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
    async resetPassword(id, newPassword) {
        const user = await this.findOne(id);
        user.passwordHash = await bcrypt.hash(newPassword, 10);
        await this.repo.save(user);
    }
    async deactivate(id) {
        const user = await this.findOne(id);
        user.isActive = false;
        await this.repo.save(user);
    }
    async activate(id) {
        const user = await this.findOne(id);
        user.isActive = true;
        await this.repo.save(user);
    }
    async updateLastLogin(id) {
        await this.repo.update(id, { lastLogin: new Date() });
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