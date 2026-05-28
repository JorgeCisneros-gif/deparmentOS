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

  async create(dto: CreateUserDto, creatorRole?: UserRole, creatorAccountId?: string): Promise<User> {
    const exists = await this.repo.findOne({ where: { email: dto.email } });
    if (exists) throw new ConflictException('El email ya está registrado');

    // ── Restricciones según quién crea ──────────────────────
    if (creatorRole === UserRole.ADMINISTRADOR) {
      // Admin solo puede crear gestion y propietario dentro de su cuenta
      if (![UserRole.GESTION, UserRole.PROPIETARIO].includes(dto.role as UserRole)) {
        throw new ForbiddenException('El administrador solo puede crear usuarios de tipo gestión o propietario');
      }
      // Forzar que el usuario creado pertenezca a la misma cuenta
      dto.idAccount = creatorAccountId;
    }

    // ── Validaciones por rol ─────────────────────────────────
    if (dto.role === UserRole.PROPIETARIO && !dto.idDepartamento) {
      throw new BadRequestException('El propietario debe tener un idDepartamento asignado');
    }

    if (dto.role === UserRole.ADMINISTRADOR && !dto.idAccount) {
      throw new BadRequestException('El administrador debe estar asociado a una cuenta');
    }

    if (dto.role === UserRole.GESTION && !dto.idAccount) {
      throw new BadRequestException('El usuario de gestión debe estar asociado a una cuenta');
    }

    // Auto-resolver idPropietario
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
      idAccount:      dto.idAccount      || null,
      idEdificio:     dto.idEdificio     || null,
      idDepartamento: dto.idDepartamento || null,
      idPropietario,
      isActive:       true,
    });
    return this.repo.save(user);
  }
  async updateLastLogin(id: string): Promise<void> {
    await this.repo.update(id, { lastLogin: new Date() });
    }
  async findAll(role?: UserRole, accountId?: string): Promise<User[]> {
    const where: any = {};
    if (role)      where.role      = role;
    if (accountId) where.idAccount = accountId;

    return this.repo.find({ where, order: { createdAt: 'DESC' } });
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

  // Reset directo de contraseña (por supervisor o admin de cuenta)
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
