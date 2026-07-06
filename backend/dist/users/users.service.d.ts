import { Repository } from 'typeorm';
import { User, UserRole } from './user.entity';
import { CreateUserDto, UpdateUserDto, ChangePasswordDto } from './users.dto';
export declare class UsersService {
    private readonly repo;
    constructor(repo: Repository<User>);
    create(dto: CreateUserDto, creatorRole?: UserRole, creatorGrupoId?: string): Promise<User>;
    findAll(role?: UserRole, idGrupo?: string): Promise<User[]>;
    findOne(id: string): Promise<User>;
    findByEmail(email: string): Promise<User | null>;
    update(id: string, dto: UpdateUserDto): Promise<User>;
    changePassword(id: string, dto: ChangePasswordDto): Promise<void>;
    resetPassword(id: string, newPassword: string): Promise<void>;
    deactivate(id: string): Promise<void>;
    activate(id: string): Promise<void>;
    updateLastLogin(id: string): Promise<void>;
    updateRefreshToken(id: string, token: string | null): Promise<void>;
    validateRefreshToken(id: string, token: string): Promise<boolean>;
}
