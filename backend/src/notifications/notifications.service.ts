// src/notifications/notifications.service.ts
import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Fee, MontoServicioItem } from '../fees/fee.entity';
import { MessageTemplate, DEFAULT_TEMPLATE, CustomVariable } from './message-template.entity';

const MESES = ['','Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Setiembre','Octubre','Noviembre','Diciembre'];

const TIPO_EMOJI: Record<string, string> = {
  agua:'💧', agua_comun:'🪣', luz:'💡', internet:'📡',
  limpieza:'🧹', mantenimiento:'🔧', otro:'📋', ajuste:'🔄',
};

const SYSTEM_VARS = [
  { variable: '{edificio}',        descripcion: 'Nombre del edificio',                       tipo: 'sistema' },
  { variable: '{depto}',           descripcion: 'Número de departamento',                    tipo: 'sistema' },
  { variable: '{periodo}',         descripcion: 'Mes y año (ej: Enero 2026)',                tipo: 'sistema' },
  { variable: '{lineas_desglose}', descripcion: 'Todas las líneas de servicios con montos',  tipo: 'sistema' },
  { variable: '{total}',           descripcion: 'Monto total a pagar',                       tipo: 'sistema' },
  { variable: '{vencimiento}',     descripcion: 'Fecha de vencimiento',                      tipo: 'sistema' },
  { variable: '{cuentas}',         descripcion: 'Cuentas bancarias del edificio',            tipo: 'sistema' },
  { variable: '{m3}',              descripcion: 'M³ consumidos de agua (si tiene medición)', tipo: 'sistema' },
  { variable: '{precio_m3}',       descripcion: 'Precio por m³ del agua',                   tipo: 'sistema' },
];

const SVC_VARS_BASE = [
  { tipo: 'agua',          emoji: '💧', label: 'Agua' },
  { tipo: 'agua_comun',    emoji: '🪣', label: 'Agua áreas comunes' },
  { tipo: 'luz',           emoji: '💡', label: 'Luz' },
  { tipo: 'internet',      emoji: '📡', label: 'Internet' },
  { tipo: 'limpieza',      emoji: '🧹', label: 'Limpieza' },
  { tipo: 'mantenimiento', emoji: '🔧', label: 'Mantenimiento' },
  { tipo: 'otro',          emoji: '📋', label: 'Otro servicio' },
];

export interface MessagePayload {
  depto: string; propietario: string; telefono: string
  mensajeTexto: string
  desglose: {
    lineas: Array<{ key: string; label: string; monto: number; tipo: string }>
    total: number; m3Consumido?: number; precioM3?: number
  }
  periodo: string; fechaVencimiento: string; mensajeEnviado: boolean
}

export interface UpdateFeeForMessageDto {
  montosServicios?:   Record<string, { monto: number }>
  fechaVencimiento?:  string
  ajusteMesAnterior?: number
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Fee)             private readonly feeRepo: Repository<Fee>,
    @InjectRepository(MessageTemplate) private readonly templateRepo: Repository<MessageTemplate>,
  ) {}

  // ── Variables ─────────────────────────────────────────────────

  getSystemVariables() { return SYSTEM_VARS; }

  getServiceVariables() {
    return SVC_VARS_BASE.map(s => ({
      variable:    `{svc_${s.tipo}}`,
      descripcion: `Monto de ${s.label} del departamento`,
      tipo:        'servicio',
      emoji:       s.emoji,
    }));
  }

  async getAllVariables(idEdificio: string) {
    const tpl = await this.getTemplate(idEdificio);
    const customVars = (tpl.customVariables || []).map(cv => ({
      variable:    `{${cv.nombre}}`,
      descripcion: cv.descripcion || `Calculado: ${cv.formula}`,
      tipo:        'personalizada',
      formula:     cv.formula,
    }));
    return { sistema: SYSTEM_VARS, servicios: this.getServiceVariables(), personalizadas: customVars };
  }

  // ── Variables personalizadas ──────────────────────────────────

  async getCustomVariables(idEdificio: string): Promise<CustomVariable[]> {
    const tpl = await this.getTemplate(idEdificio);
    return tpl.customVariables || [];
  }

  async saveCustomVariables(idEdificio: string, variables: CustomVariable[]): Promise<CustomVariable[]> {
    const nombres = variables.map(v => v.nombre.toLowerCase().trim());
    if (new Set(nombres).size !== nombres.length) {
      throw new BadRequestException('Los nombres de variables deben ser únicos');
    }
    for (const v of variables) {
      if (!/^[a-z0-9_]+$/i.test(v.nombre)) throw new BadRequestException(`Nombre inválido: "${v.nombre}".`);
      if (!v.formula?.trim()) throw new BadRequestException(`La variable "${v.nombre}" necesita una fórmula`);
    }
    const tpl = await this.getTemplate(idEdificio);
    tpl.customVariables = variables.map(v => ({ nombre: v.nombre.trim(), formula: v.formula.trim(), descripcion: v.descripcion?.trim() || '' }));
    await this.templateRepo.save(tpl);
    return tpl.customVariables;
  }

  // ── Evaluar fórmula ───────────────────────────────────────────

  private evaluateFormula(formula: string, values: Record<string, number>): number {
    let expr = formula;

    // LOG: mostrar fórmula y valores disponibles antes de reemplazar
    this.logger.debug(`[FORMULA] Original: "${formula}"`);
    this.logger.debug(`[FORMULA] Valores disponibles: ${JSON.stringify(values)}`);

    for (const [key, val] of Object.entries(values)) {
      expr = expr.replace(new RegExp(`\\{${key}\\}`, 'g'), String(val));
    }

    // Variables no encontradas → reemplazar con 0 para no romper la fórmula
    expr = expr.replace(/\{[a-z0-9_]+\}/g, '0');

    this.logger.debug(`[FORMULA] Expresión después de reemplazar: "${expr}"`);

    if (!/^[\d\s\+\-\.\(\)]+$/.test(expr)) {
      this.logger.warn(`[FORMULA] Expresión inválida tras limpieza: "${expr}"`);
      return 0;
    }
    try {
      // eslint-disable-next-line no-eval
      const result = eval(expr);
      this.logger.debug(`[FORMULA] Resultado: ${result}`);
      return typeof result === 'number' && isFinite(result) ? parseFloat(result.toFixed(2)) : 0;
    } catch (e) {
      this.logger.error(`[FORMULA] Error evaluando: ${e.message}`);
      return 0;
    }
  }

  // ── Plantillas ────────────────────────────────────────────────

  async getTemplate(idEdificio: string): Promise<MessageTemplate> {
    let tpl = await this.templateRepo.findOne({ where: { idEdificio } });
    if (!tpl) {
      // Generar plantilla inteligente según los servicios del edificio
      const templateText = await this.buildDefaultTemplate(idEdificio);
      tpl = await this.templateRepo.save(
        this.templateRepo.create({ idEdificio, nombre: 'Plantilla principal', templateText, tipo: 'cuota_servicios', customVariables: [] }),
      );
    }
    return tpl;
  }

  // Construye la plantilla base según los servicios configurados en el edificio.
  // Solo incluye variables que realmente existen para ese edificio.
  private async buildDefaultTemplate(idEdificio: string): Promise<string> {
    const servicios = await this.templateRepo.query(
      `SELECT s.tipo, s.nombre_servicio, s.modo_calculo, s.unidad_medida
       FROM servicios s WHERE s.id_edificio = $1 AND s.activo = true`,
      [idEdificio],
    );

    const tieneMedicion  = servicios.some((s: any) => s.modo_calculo === 'por_consumo_m3');
    const tieneAgua      = servicios.some((s: any) => s.tipo === 'agua');
    const tieneAlicuota  = servicios.some((s: any) => s.modo_calculo === 'porcentaje_alicuota');
    const edificioData   = await this.templateRepo.query(
      `SELECT cuenta_bcp, cuenta_bbva FROM edificios WHERE id = $1`, [idEdificio]
    );
    const tieneCuentas   = edificioData[0]?.cuenta_bcp || edificioData[0]?.cuenta_bbva;

    let template = `🏢 *{edificio}* — Depto *{depto}*

Buenas, le comunicamos su cuota de *{periodo}*:

`;

    // Desglose de servicios
    template += `{lineas_desglose}

`;

    // Info de medición si aplica
    if (tieneMedicion && tieneAgua) {
      template += `💧 Consumo: {m3} m³ · Precio: S/. {precio_m3}/m³
`;
    }

    // Nota para alícuota
    if (tieneAlicuota) {
      template += `📊 Incluye servicios por alícuota proporcional
`;
    }

    template += `
*TOTAL: S/. {total}*
📅 Vence: {vencimiento}

`;

    if (tieneCuentas) {
      template += `{cuentas}`;
    }

    template += `Por favor envíe el comprobante de pago al confirmar.
¡Gracias! 🙏`;

    return template;
  }

  async saveTemplate(idEdificio: string, templateText: string, nombre?: string): Promise<MessageTemplate> {
    let tpl = await this.templateRepo.findOne({ where: { idEdificio } });
    if (tpl) { tpl.templateText = templateText; if (nombre) tpl.nombre = nombre; return this.templateRepo.save(tpl); }
    return this.templateRepo.save(this.templateRepo.create({ idEdificio, templateText, nombre: nombre || 'Plantilla principal', tipo: 'cuota_servicios', customVariables: [] }));
  }

  async resetTemplate(idEdificio: string): Promise<MessageTemplate> {
    const smart = await this.buildDefaultTemplate(idEdificio);
    return this.saveTemplate(idEdificio, smart);
  }

  // ── Editar cuota ──────────────────────────────────────────────

  async updateFeeForMessage(feeId: string, dto: UpdateFeeForMessageDto): Promise<Fee> {
    const fee = await this.feeRepo.findOne({ where: { id: feeId } });
    if (!fee) throw new NotFoundException('Cuota no encontrada');
    if (dto.fechaVencimiento !== undefined) fee.fechaVencimiento = dto.fechaVencimiento;
    if (dto.ajusteMesAnterior !== undefined) fee.ajusteMesAnterior = dto.ajusteMesAnterior;
    if (dto.montosServicios) {
      const current = { ...(fee.montosServicios || {}) };
      for (const [key, update] of Object.entries(dto.montosServicios)) {
        if (current[key]) current[key] = { ...current[key], monto: parseFloat(update.monto.toFixed(2)) };
      }
      fee.montosServicios = current;
      const suma = Object.values(fee.montosServicios).reduce((s, item) => s + (item.monto || 0), 0);
      fee.montoTotal = parseFloat((suma + (parseFloat(fee.ajusteMesAnterior as any) || 0)).toFixed(2));
    }
    return this.feeRepo.save(fee);
  }

  // ── Generar mensaje ───────────────────────────────────────────

  async generateMessageForFee(feeId: string): Promise<MessagePayload> {
    const fee = await this.feeRepo
      .createQueryBuilder('f').leftJoinAndSelect('f.departamento', 'd')
      .where('f.id = :feeId', { feeId }).getOne();
    if (!fee) throw new NotFoundException('Cuota no encontrada');

    const [propData, edificioData, medicionData] = await Promise.all([
      this.feeRepo.query(`SELECT p.nombre, p.telefono FROM propietarios p INNER JOIN departamentos d ON d.id_propietario = p.id WHERE d.id = $1 LIMIT 1`, [fee.idDepartamento]),
      this.feeRepo.query(`SELECT e.id, e.nombre, e.cuenta_bbva, e.cuenta_bcp FROM edificios e INNER JOIN departamentos d ON d.id_edificio = e.id WHERE d.id = $1 LIMIT 1`, [fee.idDepartamento]),
      this.feeRepo.query(`SELECT md.m3_consumido, rs.precio_m3 FROM mediciones_departamento md INNER JOIN recibos_servicio rs ON rs.id = md.id_recibo INNER JOIN servicios s ON s.id = rs.id_servicio WHERE md.id_departamento = $1 AND rs.periodo_mes = $2 AND rs.periodo_anio = $3 AND s.tipo = 'agua' LIMIT 1`, [fee.idDepartamento, fee.periodoMes, fee.periodoAnio]),
    ]);

    const prop = propData[0] || {}; const edificio = edificioData[0] || {}; const medicion = medicionData[0] || {};
    const depto   = fee.departamento?.nrDepartamento || '---';
    const periodo = `${MESES[fee.periodoMes]} ${fee.periodoAnio}`;
    const total   = parseFloat(fee.montoTotal as any) || 0;
    const ajuste  = parseFloat(fee.ajusteMesAnterior as any) || 0;
    const m3      = medicion.m3_consumido ? parseFloat(medicion.m3_consumido) : null;
    const precioM3 = medicion.precio_m3  ? parseFloat(medicion.precio_m3)    : null;

    const montosServicios: Record<string, MontoServicioItem> = fee.montosServicios || {};

    // ── LOG: contenido del JSONB montosServicios ─────────────────
    this.logger.debug(`[MSG] Depto ${depto} — montosServicios RAW:`);
    for (const [key, item] of Object.entries(montosServicios)) {
      this.logger.debug(`  key="${key}" | tipo="${item.tipo}" | nombre="${item.nombre}" | monto=${item.monto}`);
    }

    const lineas = Object.entries(montosServicios)
      .filter(([, item]) => item.monto !== 0)
      .map(([key, item]) => ({ key, label: item.nombre, monto: item.monto, tipo: item.tipo }));
    if (ajuste !== 0) lineas.push({ key:'ajuste', label:'Ajuste mes anterior', monto: ajuste, tipo:'ajuste' });

    const cuentas: string[] = [];
    if (edificio.cuenta_bcp)  cuentas.push(`BCP: ${edificio.cuenta_bcp}`);
    if (edificio.cuenta_bbva) cuentas.push(`BBVA: ${edificio.cuenta_bbva}`);
    const cuentasStr = cuentas.length > 0 ? `💳 Transferencia: ${cuentas.join(' | ')}\n\n` : '';

    const lineasTexto = lineas.map(l => {
      const emoji = TIPO_EMOJI[l.tipo] || '📋';
      const extra = l.tipo === 'agua' && m3 ? ` (${m3.toFixed(3)} m³)` : '';
      const signo = l.tipo === 'ajuste' && l.monto > 0 ? '+' : '';
      return `${emoji} ${l.label}${extra}: S/. ${signo}${l.monto.toFixed(2)}`;
    }).join('\n');

    // ── Construir mapa de valores numéricos ──────────────────────
    const numericValues: Record<string, number> = { total, ajuste };

    for (const [, item] of Object.entries(montosServicios)) {
      const varKey = `svc_${item.tipo}`;
      numericValues[varKey] = (numericValues[varKey] || 0) + item.monto;
    }
    if (m3)       numericValues['m3']        = m3;
    if (precioM3) numericValues['precio_m3'] = precioM3;

    // ── LOG: mapa de valores antes de evaluar custom vars ────────
    this.logger.debug(`[MSG] numericValues antes de custom vars: ${JSON.stringify(numericValues)}`);

    const tpl = edificio.id ? await this.getTemplate(edificio.id) : null;
    const templateText    = tpl?.templateText    || DEFAULT_TEMPLATE;
    const customVariables = tpl?.customVariables || [];

    // ── LOG: variables personalizadas cargadas ───────────────────
    this.logger.debug(`[MSG] customVariables: ${JSON.stringify(customVariables)}`);

    for (const cv of customVariables) {
      const resultado = this.evaluateFormula(cv.formula, numericValues);
      this.logger.debug(`[MSG] Variable personalizada "${cv.nombre}" = ${resultado} (formula: "${cv.formula}")`);
      numericValues[cv.nombre] = resultado;
    }

    // Aplicar variables a la plantilla
    let mensajeTexto = templateText
      .replace('{edificio}',        edificio.nombre || 'Edificio')
      .replace('{depto}',           depto)
      .replace('{periodo}',         periodo)
      .replace('{lineas_desglose}', lineasTexto)
      .replace('{total}',           total.toFixed(2))
      .replace('{vencimiento}',     fee.fechaVencimiento ? new Date(fee.fechaVencimiento).toLocaleDateString('es-PE', { day:'2-digit', month:'2-digit', year:'numeric' }) : 'por confirmar')
      .replace('{cuentas}',         cuentasStr)
      .replace('{m3}',              m3 ? m3.toFixed(3) : '—')
      .replace('{precio_m3}',       precioM3 ? precioM3.toFixed(4) : '—');

    for (const [key, val] of Object.entries(numericValues)) {
      mensajeTexto = mensajeTexto.replace(new RegExp(`\\{${key}\\}`, 'g'), val.toFixed(2));
    }

    mensajeTexto = mensajeTexto.replace(/\{svc_[a-z_]+\}/g, '0.00');
    mensajeTexto = mensajeTexto.replace(/\{[a-z_]+\}/g, '');

    return {
      depto, propietario: prop.nombre || 'Sin nombre', telefono: prop.telefono || 'Sin teléfono',
      mensajeTexto,
      desglose: { lineas, total, ...(m3 !== null && { m3Consumido: m3 }), ...(precioM3 !== null && { precioM3 }) },
      periodo, fechaVencimiento: fee.fechaVencimiento || '', mensajeEnviado: fee.mensajeEnviado,
    };
  }

  async generateMessagesForPeriod(idEdificio: string, periodoMes: number, periodoAnio: number) {
    const fees = await this.feeRepo
      .createQueryBuilder('f').leftJoin('f.departamento','d').leftJoin('d.edificio','e')
      .where('e.id = :idEdificio', { idEdificio })
      .andWhere('f.periodo_mes = :mes', { mes: periodoMes })
      .andWhere('f.periodo_anio = :anio', { anio: periodoAnio })
      .orderBy('d.nrDepartamento','ASC').getMany();
    if (!fees.length) throw new BadRequestException(`No hay cuotas calculadas para ${periodoMes}/${periodoAnio}.`);
    const mensajes = await Promise.all(fees.map(f => this.generateMessageForFee(f.id)));
    return { totalDeptos: fees.length, mensajesGenerados: mensajes.length, mensajes };
  }

  async confirmMessageSent(feeId: string, supervisorId: string, fechaMensajeEnviado?: string) {
  const fee = await this.feeRepo.findOne({ where: { id: feeId } });
  if (!fee) throw new NotFoundException('Cuota no encontrada');
  if (fee.mensajeEnviado) return {
    mensaje: 'Ya confirmado.',
    pagoHabilitado: true,
    cuota: { id: fee.id, mensajeEnviado: true, fechaMensajeEnviado: fee.fechaMensajeEnviado, statusPago: fee.statusPago },
  };
 
  fee.mensajeEnviado = true;
 
  // Usar la fecha ingresada manualmente, si no, usar la fecha actual
  fee.fechaMensajeEnviado = fechaMensajeEnviado
    ? new Date(fechaMensajeEnviado)
    : new Date();
 
  fee.mensajeEnviadoPor = supervisorId;
  await this.feeRepo.save(fee);
 
  return {
    mensaje: '✅ Mensaje confirmado. El pago ya está habilitado.',
    pagoHabilitado: true,
    cuota: {
      id: fee.id,
      mensajeEnviado: true,
      fechaMensajeEnviado: fee.fechaMensajeEnviado,
      statusPago: fee.statusPago,
    },
  };
}

  async confirmAllMessagesSent(idEdificio: string, periodoMes: number, periodoAnio: number, supervisorId: string) {
    const fees = await this.feeRepo
      .createQueryBuilder('f').leftJoin('f.departamento','d').leftJoin('d.edificio','e')
      .where('e.id = :idEdificio', { idEdificio })
      .andWhere('f.periodo_mes = :mes', { mes: periodoMes })
      .andWhere('f.periodo_anio = :anio', { anio: periodoAnio }).getMany();
    let confirmados=0, yaConfirmados=0;
    for (const fee of fees) {
      if (fee.mensajeEnviado) { yaConfirmados++; continue; }
      fee.mensajeEnviado=true; fee.fechaMensajeEnviado=new Date(); fee.mensajeEnviadoPor=supervisorId;
      await this.feeRepo.save(fee); confirmados++;
    }
    return { confirmados, yaConfirmados };
  }
}
