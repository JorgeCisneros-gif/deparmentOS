// src/scheduler/notification-scheduler.service.ts
// Scheduler de notificaciones — lee configuraciones de notificacion_config
// y ejecuta los envíos push correspondientes cada hora en punto.
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { NotificacionConfig, TipoNotificacion, DestinatariosGestion } from '../notificacion-config/notificacion-config.entity';
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

  // ── Inicia el intervalo al arrancar el módulo ────────────────
  onModuleInit() {
    // Verificar cada 60 segundos si corresponde ejecutar
    setInterval(() => this.runScheduledNotifications(), 60_000);
    this.logger.log('✅ Notification scheduler iniciado');
  }

  async runScheduledNotifications() {
    const now    = new Date();
    const hora   = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    const diaMes = now.getDate();

    this.logger.log(`⏰ Revisando notificaciones programadas — ${hora}`);

    // Obtener todas las configs activas
    const configs = await this.configRepo.find({
      where: { activo: true },
      relations: ['grupo'],
    });

    for (const config of configs) {
      // Solo procesar si la hora coincide (HH:MM)
      if (config.horaEnvio.substring(0, 5) !== hora) continue;

      try {
        switch (config.tipo) {
          case TipoNotificacion.VENCIMIENTO_PAGO:
            await this.processVencimientoPago(config);
            break;
          case TipoNotificacion.GASTOS_GENERALES:
            await this.processGastosGenerales(config);
            break;
          case TipoNotificacion.RECOLECCION_MEDICION:
            if (config.diaMes === diaMes) {
              await this.processRecoleccionMedicion(config);
            }
            break;
          case TipoNotificacion.VENCIMIENTO_SERVICIO:
            await this.processVencimientoServicio(config, now);
            break;
        }
      } catch (err) {
        this.logger.error(
          `Error procesando notificación tipo=${config.tipo} grupo=${config.idGrupo}: ${err.message}`,
        );
      }
    }
  }

  // ── 1. VENCIMIENTO DE PAGO → Propietarios ────────────────────
  // Envía push a propietarios con cuotas pendientes cuya fecha de envío
  // del mensaje fue hace >= diasOffset días y aún no pagaron.
  private async processVencimientoPago(config: NotificacionConfig) {
    const offsetDate = new Date();
    offsetDate.setDate(offsetDate.getDate() - (config.diasOffset || 0));
    const offsetStr = offsetDate.toISOString().split('T')[0];

    // Cuotas pendientes del grupo con mensaje enviado hace >= diasOffset
    const cuotas = await this.feeRepo
      .createQueryBuilder('f')
      .innerJoin('f.departamento', 'd')
      .innerJoin('d.edificio', 'e')
      .innerJoin('e.grupo', 'g')
      .where('g.id = :idGrupo', { idGrupo: config.idGrupo })
      .andWhere("f.statusPago IN ('pendiente', 'parcial', 'vencido')")
      .andWhere('f.mensajeEnviado = true')
      .andWhere('f.fechaMensajeEnviado <= :offsetStr', { offsetStr })
      .select([
        'f.id', 'f.montoTotal', 'f.saldo', 'f.periodoMes', 'f.periodoAnio',
        'd.nrDepartamento', 'd.idPropietario',
      ])
      .getRawMany();

    for (const cuota of cuotas) {
      if (!cuota.d_id_propietario) continue;

      // Buscar usuario propietario vinculado
      const usuario = await this.userRepo.findOne({
        where: {
          idPropietario: cuota.d_id_propietario,
          role: UserRole.PROPIETARIO,
          isActive: true,
        },
      });
      if (!usuario) continue;

      const saldo = parseFloat(cuota.f_saldo || cuota.f_monto_total || 0);
      await this.pushService.sendToUser(usuario.id, {
        title: '💰 Recordatorio de pago pendiente',
        body:  `Tienes un saldo pendiente de S/. ${saldo.toFixed(2)} del período ${this.getMesLabel(cuota.f_periodo_mes)} ${cuota.f_periodo_anio}. Por favor regulariza tu pago.`,
        url:   '/mis-pagos',
      });

      this.logger.log(`  → Push vencimiento_pago enviado a usuario ${usuario.id}`);
    }
  }

  // ── 2. GASTOS GENERALES → Propietarios afectados ─────────────
  // Envía push a propietarios de departamentos afectados por gastos
  // creados hace >= diasOffset días y aún no notificados por push.
  private async processGastosGenerales(config: NotificacionConfig) {
    const offsetDate = new Date();
    offsetDate.setDate(offsetDate.getDate() - (config.diasOffset || 0));

    // Gastos creados hace >= diasOffset días, no eliminados
    const gastos = await this.gastoRepo
      .createQueryBuilder('g')
      .innerJoin('g.edificio', 'e')
      .innerJoin('e.grupo', 'gr')
      .where('gr.id = :idGrupo', { idGrupo: config.idGrupo })
      .andWhere('g.createdAt <= :offsetDate', { offsetDate })
      .andWhere("g.status != 'eliminado'")
      .getMany();

    for (const gasto of gastos) {
      // Buscar departamentos afectados (todos los del edificio o los asignados)
      const deptos = await this.feeRepo.query(
        `SELECT DISTINCT d.id, d.id_propietario
         FROM departamentos d
         WHERE d.id_edificio = $1 AND d.status = 'activo'`,
        [gasto.idEdificio],
      );

      for (const depto of deptos) {
        if (!depto.id_propietario) continue;

        const usuario = await this.userRepo.findOne({
          where: {
            idPropietario: depto.id_propietario,
            role: UserRole.PROPIETARIO,
            isActive: true,
          },
        });
        if (!usuario) continue;

        await this.pushService.sendToUser(usuario.id, {
          title: '🏢 Nuevo gasto general en tu edificio',
          body:  `Se ha registrado un gasto: "${gasto.descripcion}" por S/. ${parseFloat(gasto.montoGasto as any).toFixed(2)}. Revisa tu estado de cuenta.`,
          url:   '/mis-pagos',
        });

        this.logger.log(`  → Push gastos_generales enviado a usuario ${usuario.id}`);
      }
    }
  }

  // ── 3. RECOLECCIÓN DE MEDICIÓN → Gestión / Admin ─────────────
  // Notifica el día del mes configurado para recordar registrar mediciones.
  private async processRecoleccionMedicion(config: NotificacionConfig) {
    const usuarios = await this.getUsuariosGestion(
      config.idGrupo,
      config.destinatariosGestion,
    );

    for (const usuario of usuarios) {
      await this.pushService.sendToUser(usuario.id, {
        title: '📊 Recordatorio: Registro de mediciones',
        body:  'Hoy es el día de registrar las lecturas de medidores. Ingresa a Nueva Medición para comenzar.',
        url:   '/readings/new',
      });
      this.logger.log(`  → Push recoleccion_medicion enviado a usuario ${usuario.id}`);
    }
  }

  // ── 4. VENCIMIENTO DE SERVICIO → Gestión / Admin ─────────────
  // Envía push cuando un recibo tiene fecha de vencimiento hoy.
  private async processVencimientoServicio(config: NotificacionConfig, now: Date) {
    const hoy = now.toISOString().split('T')[0];

    // Recibos con fecha de vencimiento hoy, del grupo
    const recibos = await this.receiptRepo
      .createQueryBuilder('r')
      .innerJoin('r.servicio', 's')
      .innerJoin('s.edificio', 'e')
      .innerJoin('e.grupo', 'g')
      .where('g.id = :idGrupo', { idGrupo: config.idGrupo })
      .andWhere('CAST(r.fechaVencimiento AS DATE) = :hoy', { hoy })
      .select(['r.id', 'r.periodoMes', 'r.periodoAnio', 's.nombreServicio', 'e.nombre'])
      .getMany();

    if (recibos.length === 0) return;

    const usuarios = await this.getUsuariosGestion(
      config.idGrupo,
      config.destinatariosGestion,
    );

    for (const recibo of recibos) {
      const svc     = (recibo as any).servicio;
      const edificio = (recibo as any).servicio?.edificio;

      for (const usuario of usuarios) {
        await this.pushService.sendToUser(usuario.id, {
          title: `⚠️ Vence hoy: ${svc?.nombreServicio || 'Servicio'}`,
          body:  `El servicio "${svc?.nombreServicio}" del edificio "${edificio?.nombre}" vence hoy. Revisa el estado del recibo.`,
          url:   '/receipts',
        });
      }
      this.logger.log(`  → Push vencimiento_servicio para recibo ${recibo.id}`);
    }
  }

  // ── Helper: obtener usuarios de gestión según config ─────────
  private async getUsuariosGestion(
    idGrupo: string,
    destinatarios: DestinatariosGestion | null,
  ): Promise<User[]> {
    const roles: UserRole[] = [];

    if (!destinatarios || destinatarios === DestinatariosGestion.AMBOS) {
      roles.push(UserRole.GESTION, UserRole.ADMINISTRADOR);
    } else if (destinatarios === DestinatariosGestion.GESTION) {
      roles.push(UserRole.GESTION);
    } else if (destinatarios === DestinatariosGestion.ADMINISTRADOR) {
      roles.push(UserRole.ADMINISTRADOR);
    }

    return this.userRepo
      .createQueryBuilder('u')
      .where('u.idGrupo = :idGrupo', { idGrupo })
      .andWhere('u.role IN (:...roles)', { roles })
      .andWhere('u.isActive = true')
      .getMany();
  }

  // ── Helper: nombre del mes ────────────────────────────────────
  private getMesLabel(mes: number): string {
    const MESES = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Setiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return MESES[mes] || String(mes);
  }
}
