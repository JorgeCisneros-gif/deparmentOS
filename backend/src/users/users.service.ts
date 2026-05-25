// src/users/users.service.ts
import {
  Injectable, NotFoundException, ConflictException, BadRequestException,
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

  async create(dto: CreateUserDto): Promise<User> {
    const exists = await this.repo.findOne({ where: { email: dto.email } });
    if (exists) throw new ConflictException('El email ya está registrado');

    // Validaciones de rol
    if (dto.role === UserRole.SUPERVISOR && !dto.idEdificio) {
      throw new BadRequestException('El supervisor debe tener un idEdificio asignado');
    }
    if (dto.role === UserRole.ADMINISTRADOR && !dto.idEdificio) {
      throw new BadRequestException('El administrador debe tener un idEdificio asignado');
    }
    if (dto.role === UserRole.PROPIETARIO && !dto.idDepartamento) {
      throw new BadRequestException('El propietario debe tener un idDepartamento asignado');
    }

    // Auto-resolver idPropietario desde el departamento si no se envió
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
      email:           dto.email,
      passwordHash,
      role:            dto.role,
      idEdificio:      dto.idEdificio      || null,
      idDepartamento:  dto.idDepartamento  || null,
      idPropietario,
      isActive:        true,
    });
    return this.repo.save(user);
  }

  async findAll(role?: UserRole): Promise<User[]> {
    return this.repo.find({
      where: role ? { role } : {},
      order: { createdAt: 'DESC' },
    });
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
