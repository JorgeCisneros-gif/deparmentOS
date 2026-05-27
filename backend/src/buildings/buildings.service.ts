// src/buildings/buildings.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Building } from './building.entity';
import { CreateBuildingDto, UpdateBuildingDto } from './buildings.dto';

@Injectable()
export class BuildingsService {
  constructor(
    @InjectRepository(Building)
    private readonly repo: Repository<Building>,
  ) {}

  create(dto: CreateBuildingDto) {
    return this.repo.save(this.repo.create(dto));
  }

  // accountId filtra por cuenta — undefined = supervisor ve todos
  findAll(accountId?: string) {
    const where = accountId ? { idAccount: accountId } : {};
    return this.repo.find({ where, order: { nombre: 'ASC' } });
  }

  async findOne(id: string) {
    const b = await this.repo.findOne({
      where: { id },
      relations: ['departamentos', 'servicios'],
    });
    if (!b) throw new NotFoundException('Edificio no encontrado');
    return b;
  }

  async update(id: string, dto: UpdateBuildingDto) {
    const b = await this.findOne(id);
    Object.assign(b, dto);
    return this.repo.save(b);
  }

  async remove(id: string) {
    const b = await this.findOne(id);
    await this.repo.remove(b);
    return { message: 'Edificio eliminado' };
  }
}
