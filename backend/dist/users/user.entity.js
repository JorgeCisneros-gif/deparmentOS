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
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = exports.UserRole = void 0;
const typeorm_1 = require("typeorm");
const class_transformer_1 = require("class-transformer");
const grupo_entity_1 = require("../grupos/grupo.entity");
var UserRole;
(function (UserRole) {
    UserRole["SUPERVISOR"] = "supervisor";
    UserRole["ADMINISTRADOR"] = "administrador";
    UserRole["GESTION"] = "gestion";
    UserRole["PROPIETARIO"] = "propietario";
})(UserRole || (exports.UserRole = UserRole = {}));
let User = class User {
};
exports.User = User;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], User.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true, length: 150 }),
    __metadata("design:type", String)
], User.prototype, "email", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'password_hash' }),
    (0, class_transformer_1.Exclude)(),
    __metadata("design:type", String)
], User.prototype, "passwordHash", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: UserRole, default: UserRole.PROPIETARIO }),
    __metadata("design:type", String)
], User.prototype, "role", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'id_grupo', nullable: true }),
    __metadata("design:type", String)
], User.prototype, "idGrupo", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => grupo_entity_1.Grupo, g => g.usuarios, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'id_grupo' }),
    __metadata("design:type", grupo_entity_1.Grupo)
], User.prototype, "grupo", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'id_edificio', nullable: true }),
    __metadata("design:type", String)
], User.prototype, "idEdificio", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'id_departamento', nullable: true }),
    __metadata("design:type", String)
], User.prototype, "idDepartamento", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'id_propietario', nullable: true }),
    __metadata("design:type", String)
], User.prototype, "idPropietario", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_active', default: true }),
    __metadata("design:type", Boolean)
], User.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'last_login', nullable: true }),
    __metadata("design:type", Date)
], User.prototype, "lastLogin", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'refresh_token', nullable: true }),
    (0, class_transformer_1.Exclude)(),
    __metadata("design:type", String)
], User.prototype, "refreshToken", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'id_account', nullable: true }),
    __metadata("design:type", String)
], User.prototype, "idAccount", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], User.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], User.prototype, "updatedAt", void 0);
exports.User = User = __decorate([
    (0, typeorm_1.Entity)('users')
], User);
//# sourceMappingURL=user.entity.js.map