// src/config/app-config.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppConfig } from './app-config.entity';

@Injectable()
export class AppConfigService {
  constructor(
    @InjectRepository(AppConfig)
    private readonly repo: Repository<AppConfig>,
  ) {}

  // Devuelve toda la config como un objeto plano { clave: valor }
  async getAll(): Promise<Record<string, any>> {
    const rows = await this.repo.find();
    return rows.reduce((acc, row) => {
      acc[row.clave] = row.valor;
      return acc;
    }, {} as Record<string, any>);
  }

  async getOne(clave: string): Promise<any> {
    const row = await this.repo.findOne({ where: { clave } });
    return row?.valor ?? null;
  }

  async set(clave: string, valor: any): Promise<void> {
    const existing = await this.repo.findOne({ where: { clave } });
    if (existing) {
      existing.valor = valor;
      await this.repo.save(existing);
    } else {
      await this.repo.save(this.repo.create({ clave, valor }));
    }
  }
}
