// src/users/users.service.ts
import {
  Injectable, NotFoundException, ConflictException,
  BadRequestException, ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from './user.entity';
import { CreateUserDto, UpdateUserDto, ChangePasswordDto } from './users.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
  ) {}

  async create(dto: CreateUserDto, creatorRole?: UserRole, creatorGrupoId?: string): Promise<User> {
    const exists = await this.repo.findOne({ where: { email: dto.email } });
    if (exists) throw new ConflictException('El email ya está registrado');

    // ── Restricciones según quién crea ──────────────────────
    if (creatorRole === UserRole.ADMINISTRADOR) {
      // Admin solo puede crear gestion y propietario dentro de su grupo
      if (![UserRole.GESTION, UserRole.PROPIETARIO].includes(dto.role as UserRole)) {
        throw new ForbiddenException('El administrador solo puede crear usuarios de tipo gestión o propietario');
      }
      // Forzar que el usuario creado pertenezca al mismo grupo
      dto.idGrupo = creatorGrupoId;
    }

    // ── Validaciones por rol ─────────────────────────────────
    if (dto.role === UserRole.PROPIETARIO && !dto.idDepartamento) {
      throw new BadRequestException('El propietario debe tener un idDepartamento asignado');
    }

    if (dto.role === UserRole.ADMINISTRADOR && !dto.idGrupo) {
      throw new BadRequestException('El administrador debe estar asociado a un grupo');
    }

    if (dto.role === UserRole.GESTION && !dto.idGrupo) {
      throw new BadRequestException('El usuario de gestión debe estar asociado a un grupo');
    }

    // Auto-resolver idPropietario desde el departamento
    let idPropietario = dto.idPropietario || null;
    if (dto.role === UserRole.PROPIETARIO && dto.idDepartamento && !idPropietario) {
      const deptData = await this.repo.query(
        `SELECT id_propietario FROM departamentos WHERE id = $1 LIMIT 1`,
        [dto.idDepartamento],
      );
      if (deptData[0]?.id_propietario) {
        idPropietario = deptData[0].id_propietario;
      }
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = this.repo.create({
      email:          dto.email,
      passwordHash,
      role:           dto.role,
      idGrupo:        dto.idGrupo        || null,
      idEdificio:     dto.idEdificio     || null,
      idDepartamento: dto.idDepartamento || null,
      idPropietario,
      isActive:       true,
    });
    return this.repo.save(user);
  }

  // idGrupo filtra por grupo — undefined = supervisor ve todos
  async findAll(role?: UserRole, idGrupo?: string): Promise<User[]> {
    const qb = this.repo.createQueryBuilder('u');

    if (role) qb.andWhere('u.role = :role', { role });

    if (idGrupo) {
      // Admin ve solo usuarios de su grupo (excluye al supervisor)
      qb.andWhere('u.id_grupo = :idGrupo', { idGrupo });
      qb.andWhere('u.role != :supRole', { supRole: UserRole.SUPERVISOR });
    }

    return qb.orderBy('u.created_at', 'DESC').getMany();
  }

  async findOne(id: string): Promise<User> {
    const user = await this.repo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.repo.findOne({ where: { email } });
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);
    if (dto.password) {
      (dto as any).passwordHash = await bcrypt.hash(dto.password, 10);
      delete dto.password;
    }
    Object.assign(user, dto);
    return this.repo.save(user);
  }

  async changePassword(id: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.findOne(id);
    const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!valid) throw new BadRequestException('Contraseña actual incorrecta');
    user.passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.repo.save(user);
  }

  async resetPassword(id: string, newPassword: string): Promise<void> {
    const user = await this.findOne(id);
    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await this.repo.save(user);
  }

  async deactivate(id: string): Promise<void> {
    const user = await this.findOne(id);
    user.isActive = false;
    await this.repo.save(user);
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.repo.update(id, { lastLogin: new Date() });
  }

  async updateRefreshToken(id: string, token: string | null): Promise<void> {
    const hashed = token ? await bcrypt.hash(token, 10) : null;
    await this.repo.update(id, { refreshToken: hashed });
  }

  async validateRefreshToken(id: string, token: string): Promise<boolean> {
    const user = await this.findOne(id);
    if (!user.refreshToken) return false;
    return bcrypt.compare(token, user.refreshToken);
  }
}
