import { Repository } from 'typeorm';
import { User, UserRole } from './user.entity';
import { CreateUserDto, UpdateUserDto, ChangePasswordDto } from './users.dto';
export declare class UsersService {
    private readonly repo;
    constructor(repo: Repository<User>);
    create(dto: CreateUserDto): Promise<User>;
    findAll(role?: UserRole): Promise<User[]>;
    findOne(id: string): Promise<User>;
    findByEmail(email: string): Promise<User | null>;
    update(id: string, dto: UpdateUserDto): Promise<User>;
    changePassword(id: string, dto: ChangePasswordDto): Promise<void>;
    deactivate(id: string): Promise<void>;
    updateRefreshToken(id: string, token: string | null): Promise<void>;
    validateRefreshToken(id: string, token: string): Promise<boolean>;
}
