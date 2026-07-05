// src/scheduler/notification-scheduler.service.ts
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificacionConfig } from '../notificacion-config/notificacion-config.entity';
import { PushService } from '../notifications/push.service';
import { Fee } from '../fees/fee.entity';
import { GastoExtra } from '../gastos/gasto-extra.entity';
import { User, UserRole } from '../users/user.entity';
import { Receipt } from '../receipts/receipt.entity';

@Injectable()
export class NotificationSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(NotificationSchedulerService.name);

  constructor(
    @InjectRepository(NotificacionConfig)
    private readonly configRepo: Repository<NotificacionConfig>,
    @InjectRepository(Fee)
    private readonly feeRepo: Repository<Fee>,
    @InjectRepository(GastoExtra)
    private readonly gastoRepo: Repository<GastoExtra>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Receipt)
    private readonly receiptRepo: Repository<Receipt>,
    private readonly pushService: PushService,
  ) {}

  onModuleInit() {
    // Verificar cada 60 segundos
    setInterval(() => this.runScheduledNotifications(), 60_000);
    this.logger.log('✅ Notification scheduler iniciado (intervalo: 60s)');
  }

  async runScheduledNotifications() {
    const now    = new Date();
    const hora   = now.getHours();
    const minuto = now.getMinutes();
    const diaMes = now.getDate();
    const diaSemana = now.getDay(); // 0=Dom, 1=Lun...

    this.logger.log(`⏰ Revisando notificaciones — ${String(hora).padStart(2,'0')}:${String(minuto).padStart(2,'0')}`);

    const configs = await this.configRepo.find({
      where: { activo: true },
      relations: ['tipo'],
    });

    for (const config of configs) {
      if (!config.tipo?.activo) continue;
      if (!this.matchesCron(config.cronExpresion, now)) continue;

      try {
        const codigo = config.tipo.codigo;
        switch (codigo) {
          case 'vencimiento_pago':
            await this.processVencimientoPago(config); break;
          case 'gastos_generales':
            await this.processGastosGenerales(config); break;
          case 'recoleccion_medicion':
            await this.processRecoleccionMedicion(config); break;
          case 'vencimiento_servicio':
            await this.processVencimientoServicio(config, now); break;
          default:
            this.logger.warn(`Código de notificación desconocido: ${codigo}`);
        }
      } catch (err) {
        this.logger.error(
          `Error procesando notificación tipo=${config.tipo.codigo} edificio=${config.idEdificio}: ${err.message}`,
        );
      }
    }
  }

  // ── Evaluador de expresión cron ───────────────────────────────
  // Soporta los 5 campos estándar: minuto hora diaMes mes diaSemana
  // Solo evalúa valores simples (*) y números fijos — no rangos ni listas
  private matchesCron(cron: string, now: Date): boolean {
    try {
      const parts = cron.trim().split(/\s+/);
      if (parts.length !== 5) return false;

      const [cronMin, cronHour, cronDayMonth, cronMonth, cronDayWeek] = parts;

      const matches = (field: string, value: number): boolean => {
        if (field === '*') return true;
        // Lista: '1,15'
        if (field.includes(',')) return field.split(',').map(Number).includes(value);
        // Rango: '1-5'
        if (field.includes('-')) {
          const [start, end] = field.split('-').map(Number);
          return value >= start && value <= end;
        }
        // Valor simple
        return parseInt(field) === value;
      };

      return (
        matches(cronMin,      now.getMinutes()) &&
        matches(cronHour,     now.getHours())   &&
        matches(cronDayMonth, now.getDate())     &&
        matches(cronMonth,    now.getMonth() + 1) &&
        matches(cronDayWeek,  now.getDay())
      );
    } catch {
      return false;
    }
  }

  // ── 1. VENCIMIENTO DE PAGO → Propietarios ────────────────────
  private async processVencimientoPago(config: NotificacionConfig) {
    const offsetDate = new Date();
    offsetDate.setDate(offsetDate.getDate() - (config.diasOffset || 0));
    const offsetStr = offsetDate.toISOString().split('T')[0];

    const cuotas = await this.feeRepo
      .createQueryBuilder('f')
      .innerJoin('f.departamento', 'd')
      .innerJoin('d.edificio', 'e')
      .where('e.id = :idEdificio', { idEdificio: config.idEdificio })
      .andWhere("f.statusPago IN ('pendiente', 'parcial', 'vencido')")
      .andWhere('f.mensajeEnviado = true')
      .andWhere('CAST(f.fechaMensajeEnviado AS DATE) <= :offsetStr', { offsetStr })
      .select([
        'f.id', 'f.montoTotal', 'f.saldo', 'f.periodoMes', 'f.periodoAnio',
        'd.nrDepartamento', 'd.idPropietario',
      ])
      .getRawMany();

    for (const cuota of cuotas) {
      if (!cuota.d_id_propietario) continue;
      const usuario = await this.userRepo.findOne({
        where: { idPropietario: cuota.d_id_propietario, role: UserRole.PROPIETARIO, isActive: true },
      });
      if (!usuario) continue;

      const saldo = parseFloat(cuota.f_saldo || cuota.f_monto_total || 0);
      await this.pushService.sendToUser(usuario.id, {
        title: '💰 Recordatorio de pago pendiente',
        body:  `Tienes un saldo pendiente de S/. ${saldo.toFixed(2)} del período ${this.getMesLabel(cuota.f_periodo_mes)} ${cuota.f_periodo_anio}.`,
        url:   '/mis-pagos',
      });
      this.logger.log(`  → Push vencimiento_pago → usuario ${usuario.id}`);
    }
  }

  // ── 2. GASTOS GENERALES → Propietarios del edificio ──────────
  private async processGastosGenerales(config: NotificacionConfig) {
    const offsetDate = new Date();
    offsetDate.setDate(offsetDate.getDate() - (config.diasOffset || 0));

    const gastos = await this.gastoRepo
      .createQueryBuilder('g')
      .where('g.idEdificio = :idEdificio', { idEdificio: config.idEdificio })
      .andWhere('g.createdAt <= :offsetDate', { offsetDate })
      .andWhere("g.status != 'eliminado'")
      .getMany();

    for (const gasto of gastos) {
      const deptos = await this.feeRepo.query(
        `SELECT d.id, d.id_propietario FROM departamentos d
         WHERE d.id_edificio = $1 AND d.status = 'activo'`,
        [config.idEdificio],
      );

      for (const depto of deptos) {
        if (!depto.id_propietario) continue;
        const usuario = await this.userRepo.findOne({
          where: { idPropietario: depto.id_propietario, role: UserRole.PROPIETARIO, isActive: true },
        });
        if (!usuario) continue;

        await this.pushService.sendToUser(usuario.id, {
          title: '🏢 Gasto general registrado',
          body:  `Se registró: "${gasto.descripcion}" por S/. ${parseFloat(gasto.montoGasto as any).toFixed(2)}.`,
          url:   '/mis-pagos',
        });
        this.logger.log(`  → Push gastos_generales → usuario ${usuario.id}`);
      }
    }
  }

  // ── 3. RECOLECCIÓN DE MEDICIÓN → Gestión / Admin ─────────────
  private async processRecoleccionMedicion(config: NotificacionConfig) {
    const usuarios = await this.getUsuariosGestionEdificio(config.idEdificio);
    for (const usuario of usuarios) {
      await this.pushService.sendToUser(usuario.id, {
        title: '📊 Recordatorio: Registro de mediciones',
        body:  'Hoy es el día de registrar las lecturas de medidores.',
        url:   '/readings/new',
      });
      this.logger.log(`  → Push recoleccion_medicion → usuario ${usuario.id}`);
    }
  }

  // ── 4. VENCIMIENTO DE SERVICIO → Gestión / Admin ─────────────
  private async processVencimientoServicio(config: NotificacionConfig, now: Date) {
    const hoy = now.toISOString().split('T')[0];

    const recibos = await this.receiptRepo
      .createQueryBuilder('r')
      .innerJoin('r.servicio', 's')
      .where('s.idEdificio = :idEdificio', { idEdificio: config.idEdificio })
      .andWhere('CAST(r.fechaVencimiento AS DATE) = :hoy', { hoy })
      .select(['r.id', 'r.periodoMes', 'r.periodoAnio', 's.nombreServicio'])
      .getRawMany();

    if (recibos.length === 0) return;
    const usuarios = await this.getUsuariosGestionEdificio(config.idEdificio);

    for (const recibo of recibos) {
      for (const usuario of usuarios) {
        await this.pushService.sendToUser(usuario.id, {
          title: `⚠️ Vence hoy: ${recibo.s_nombre_servicio}`,
          body:  `El servicio "${recibo.s_nombre_servicio}" vence hoy. Revisa el recibo.`,
          url:   '/receipts',
        });
      }
      this.logger.log(`  → Push vencimiento_servicio recibo ${recibo.r_id}`);
    }
  }

  // ── Helpers ───────────────────────────────────────────────────
  private async getUsuariosGestionEdificio(idEdificio: string): Promise<User[]> {
    // Obtener el grupo del edificio
    const edificio = await this.feeRepo.query(
      `SELECT e.id_grupo FROM edificios e WHERE e.id = $1`, [idEdificio]
    );
    if (!edificio.length) return [];
    const idGrupo = edificio[0].id_grupo;

    return this.userRepo
      .createQueryBuilder('u')
      .where('u.idGrupo = :idGrupo', { idGrupo })
      .andWhere('u.role IN (:...roles)', { roles: [UserRole.GESTION, UserRole.ADMINISTRADOR] })
      .andWhere('u.isActive = true')
      .getMany();
  }

  private getMesLabel(mes: number): string {
    const MESES = ['','Enero','Febrero','Marzo','Abril','Mayo','Junio',
      'Julio','Agosto','Setiembre','Octubre','Noviembre','Diciembre'];
    return MESES[mes] || String(mes);
  }
}
