import { useEffect, useState, useCallback } from 'react'
import api from '../services/api'
import { useTz } from '../store/timezone.store'
import toast from 'react-hot-toast'
import {
  CheckCircle2, AlertCircle, Clock, MessageSquare, CreditCard,
  ChevronLeft, ChevronRight, Loader2, X, Send, Upload,
  Copy, Check, Droplets, Zap, Wifi, Brush, Wrench, ReceiptText,
  RefreshCw, Lock, WifiOff, ZoomIn, ShieldCheck, XCircle,
} from 'lucide-react'
import BuildingSelector from '../components/common/BuildingSelector'
import { useConfigStore } from '../store/config.store'

// ── Tipos ─────────────────────────────────────────────────────

interface Building { id: string; nombre: string }

interface PagoItem {
  id: string; monto: number; montoCancelado?: number; tipoPago: string; fechaPago: string
  referencia?: string; comprobanteUrl?: string; estadoPago?: string; banco?: string
}

interface DesgloseItem {
  tipo: string; label: string; monto: number; activo: boolean
}

interface DeptoCobro {
  feeId: string; depto: string; idDepartamento: string
  montoAgua: number; montoAguaComun: number; montoLuz: number
  montoInternet: number; montoLimpieza: number; montoOtros: number
  ajuste: number; montoTotal: number
  statusPago: 'pendiente' | 'pagado' | 'parcial' | 'vencido'
  mensajeEnviado: boolean; fechaMensajeEnviado?: string
  totalPagado: number; saldo: number
  desglose: DesgloseItem[]
  pagos: PagoItem[]
  medicion?: { idMeterImage: string; ocrValor: string; confianza: number } | null
  fechaVencimiento?: string
}

interface PeriodSummary {
  resumen: {
    totalDeptos: number; pagados: number; pendientes: number
    mensajesEnviados: number; montoPendiente: number; periodoCerrado: boolean
  }
  serviciosEdificio: { id: string; tipo: string; nombre: string; activo: boolean }[]
  departamentos: DeptoCobro[]
}

// ── Config visual ─────────────────────────────────────────────

const MESES = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Setiembre', 'Octubre', 'Noviembre', 'Diciembre']

const STATUS_CONFIG = {
  pendiente: { label: 'Pendiente', color: 'var(--accent)',  bg: 'var(--accent-dim)',      Icon: Clock },
  parcial:   { label: 'Parcial',   color: '#a78bfa',        bg: 'rgba(167,139,250,0.1)',  Icon: AlertCircle },
  pagado:    { label: 'Pagado',    color: 'var(--green)',   bg: 'var(--green-dim)',        Icon: CheckCircle2 },
  vencido:   { label: 'Vencido',   color: '#f87171',        bg: 'rgba(248,113,113,0.1)',  Icon: AlertCircle },
}

const TIPO_ICON: Record<string, any> = {
  agua: Droplets, agua_comun: Droplets, luz: Zap, internet: Wifi,
  limpieza: Brush, mantenimiento: Wrench, otro: ReceiptText, ajuste: ReceiptText,
}
const TIPO_COLOR: Record<string, string> = {
  agua: '#4a9eff', agua_comun: '#4a9eff', luz: 'var(--accent)', internet: 'var(--green)',
  limpieza: '#a78bfa', mantenimiento: '#fb923c', otro: '#94a3b8', ajuste: '#94a3b8',
}

// ── Componente principal ──────────────────────────────────────

export default function CobrosPage() {
  const { fmt, fmtDT } = useTz()
  const [selBuilding, setSelBuilding] = useState('')
  const [mes, setMes]               = useState(new Date().getMonth() + 1)
  const [anio, setAnio]             = useState(new Date().getFullYear())
  const [data, setData]             = useState<PeriodSummary | null>(null)
  const [loading, setLoading]       = useState(false)
  const [calculating, setCalculating] = useState(false)
  const [modalMsg, setModalMsg]     = useState<DeptoCobro | null>(null)
  const [modalPago, setModalPago]         = useState<DeptoCobro | null>(null)
  const [modalVerificar, setModalVerificar] = useState<DeptoCobro | null>(null)
  const [pagosEspera, setPagosEspera]       = useState<any[]>([])
  const [msgData, setMsgData]       = useState<any>(null)
  const [msgLoading, setMsgLoading] = useState(false)

  useEffect(() => { if (selBuilding) load() }, [selBuilding, mes, anio])

  const loadPagosEspera = async () => {
    try {
      const { data: pending } = await api.get('/payments/pending-approval')
      setPagosEspera(pending || [])
    } catch {}
  }

  const load = useCallback(async () => {
    setLoading(true); setData(null)
    try {
      const { data: res } = await api.get('/payments/period-summary', {
        params: { buildingId: selBuilding, month: mes, year: anio },
      })
      setData(res)
    } catch (e: any) {
      if (e?.response?.status !== 404) toast.error(e?.response?.data?.message || 'Error cargando cobros')
    } finally { setLoading(false) }
  }, [selBuilding, mes, anio])

  const calculateFees = async () => {
    setCalculating(true)
    try {
      await api.post('/fees/calculate', {
        idEdificio: selBuilding, periodoMes: mes, periodoAnio: anio,
        fechaVencimiento: new Date(anio, mes, 10).toISOString().split('T')[0],
      })
      toast.success('Cuotas calculadas')
      await load()
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Error calculando') }
    finally { setCalculating(false) }
  }

  const openMessage = async (depto: DeptoCobro) => {
    setModalMsg(depto); setMsgData(null); setMsgLoading(true)
    try {
      const { data } = await api.get(`/notifications/message/${depto.feeId}`)
      setMsgData(data)
    } catch { toast.error('Error generando mensaje') }
    finally { setMsgLoading(false) }
  }

  const aprobarPago = async (pagoId: string) => {
    try {
      await api.patch(`/payments/${pagoId}/approve`)
      toast.success('Pago aprobado')
      setModalVerificar(null)
      await load()
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Error aprobando') }
  }

  const rechazarPago = async (pagoId: string) => {
    try {
      await api.patch(`/payments/${pagoId}/reject`)
      toast.success('Pago rechazado')
      setModalVerificar(null)
      await load()
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Error') }
  }

  const confirmMessage = async (feeId: string, fechaMensajeEnviado?: string) => {
    try {
      // Confirmar envío — pasa la fecha para que se guarde en fecha_mensaje_enviado
      await api.post(`/notifications/confirm/${feeId}`, { fechaMensajeEnviado })
      toast.success('Mensaje confirmado — pago habilitado')
      setModalMsg(null); await load()
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Error confirmando') }
  }

  const navMes = (dir: number) => {
    let m = mes + dir, a = anio
    if (m > 12) { m = 1; a++ }; if (m < 1) { m = 12; a-- }
    setMes(m); setAnio(a)
  }

  const resumen  = data?.resumen
  const deptos   = data?.departamentos ?? []
  const hasData  = deptos.length > 0

  return (
    <div style={s.page}>
      <div style={s.header} className="fade-up">
        <div>
          <h1 style={s.title}>Cobros del Mes</h1>
          <p style={s.subtitle}>Gestiona mensajes, pagos y seguimiento por departamento</p>
        </div>
      </div>

      <div style={s.controls} className="fade-up">
        <div style={s.ctrlGroup}>
          <label style={s.ctrlLabel}>Edificio</label>
          <BuildingSelector value={selBuilding} onChange={setSelBuilding} label="EDIFICIO" autoSelect />
        </div>
        <div style={s.ctrlGroup}>
          <label style={s.ctrlLabel}>Período</label>
          <div style={s.mesNav}>
            <button onClick={() => navMes(-1)} style={s.navBtn}><ChevronLeft size={16} /></button>
            <span style={s.mesLabel}>{MESES[mes]} {anio}</span>
            <button onClick={() => navMes(1)} style={s.navBtn}><ChevronRight size={16} /></button>
          </div>
        </div>
        <button onClick={load} style={s.btnRefresh}><RefreshCw size={15} /></button>
      </div>

      {loading ? (
        <div style={s.loading}><Loader2 size={28} color="var(--accent)" style={{ animation: 'spin 0.8s linear infinite' }} /></div>
      ) : !hasData ? (
        <div style={s.emptyState} className="fade-up">
          <CreditCard size={48} color="var(--text-muted)" style={{ marginBottom: '1rem' }} />
          <h3 style={{ fontWeight: 600, marginBottom: '0.5rem' }}>No hay cuotas para {MESES[mes]} {anio}</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem', maxWidth: 380, textAlign: 'center' }}>
            Asegúrate de haber cargado los recibos y las mediciones del período.
          </p>
          <button onClick={calculateFees} disabled={calculating} style={s.btnPrimary}>
            {calculating ? <Loader2 size={15} style={{ animation: 'spin 0.8s linear infinite' }} /> : <CreditCard size={15} />}
            {calculating ? 'Calculando...' : 'Calcular cuotas del período'}
          </button>
        </div>
      ) : (
        <>
          <div style={s.progressCard} className="fade-up">
            <div style={s.progressHeader}>
              <div>
                <h3 style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                  {MESES[mes]} {anio} — {resumen!.pagados}/{resumen!.totalDeptos} departamentos pagados
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                  Pendiente: S/. {resumen!.montoPendiente.toFixed(2)} · Mensajes: {resumen!.mensajesEnviados}/{resumen!.totalDeptos}
                </p>
              </div>
              <button onClick={calculateFees} disabled={calculating} style={s.btnSecondary}>
                {calculating ? <Loader2 size={13} style={{ animation: 'spin 0.8s linear infinite' }} /> : <RefreshCw size={13} />}
                Recalcular
              </button>
            </div>
            <div style={s.progressBarBg}>
              <div style={{ ...s.progressBarFill, width: `${resumen!.totalDeptos > 0 ? (resumen!.pagados / resumen!.totalDeptos) * 100 : 0}%` }} />
            </div>
          </div>

          <div style={s.grid} className="fade-up">
            {deptos.map(d => (
              <DeptoCard key={d.feeId} depto={d}
                onMessage={() => openMessage(d)}
                onPago={() => setModalPago(d)}
              onVerificar={() => setModalVerificar(d)}
              />
            ))}
          </div>
        </>
      )}

      {modalMsg && (
        <MensajeModal depto={modalMsg} msgData={msgData} loading={msgLoading}
          onClose={() => setModalMsg(null)} onConfirm={(fechaEnvio: string) => confirmMessage(modalMsg.feeId, fechaEnvio)} />
      )}
      {modalVerificar && modalVerificar.pagos?.some((p: any) => p.estadoPago === 'pendiente_aprobacion') && (
        <VerificarPagoModal
          depto={modalVerificar}
          pago={modalVerificar.pagos.find((p: any) => p.estadoPago === 'pendiente_aprobacion')}
          onClose={() => setModalVerificar(null)}
          onAprobar={aprobarPago}
          onRechazar={rechazarPago}
        />
      )}
      {modalPago && (
        <PagoModal depto={modalPago}
          onClose={() => setModalPago(null)} onSaved={() => { setModalPago(null); load() }} />
      )}
    </div>
  )
}

// ── Card de departamento ──────────────────────────────────────

function DeptoCard({ depto, onMessage, onPago, onVerificar }: { depto: DeptoCobro; onMessage: () => void; onPago: () => void; onVerificar: () => void }) {
  const cfg    = STATUS_CONFIG[depto.statusPago]
  const Icon   = cfg.Icon
  const canPay = depto.mensajeEnviado && depto.statusPago !== 'pagado'
  const hasPendingApproval = depto.pagos?.some((p: any) => p.estadoPago === 'pendiente_aprobacion')

  return (
    <div style={{ ...s.card, borderTop: `3px solid ${cfg.color}` }}>
      <div style={s.cardHeader}>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.05rem' }}>Depto {depto.depto}</span>
        <span style={{ ...s.badge, background: cfg.bg, color: cfg.color, borderColor: `${cfg.color}40` }}>
          <Icon size={11} /> {cfg.label}
        </span>
      </div>

      {/* Desglose dinámico */}
      <div style={s.breakdown}>
        {depto.desglose.map((item, i) => {
          const IconComp = TIPO_ICON[item.tipo] || ReceiptText
          const color    = item.activo ? (TIPO_COLOR[item.tipo] || '#94a3b8') : 'var(--text-muted)'
          return (
            <div key={i} style={{ ...s.breakRow, opacity: item.activo ? 1 : 0.55 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)' }}>
                <IconComp size={11} color={color} />
                {item.label}
                {!item.activo && (
                  <span style={{ fontSize: '0.65rem', background: 'rgba(148,163,184,0.15)', border: '1px solid rgba(148,163,184,0.2)', borderRadius: 3, padding: '0 0.3rem', color: 'var(--text-muted)' }}>
                    inactivo
                  </span>
                )}
              </span>
              <span style={{ color: item.activo ? 'inherit' : 'var(--text-muted)', textDecoration: item.activo ? 'none' : 'line-through' }}>
                S/. {item.monto.toFixed(2)}
              </span>
            </div>
          )
        })}
        <div style={s.breakTotal}>
          <span>Total</span>
          <span style={{ fontWeight: 700, color: cfg.color }}>S/. {depto.montoTotal.toFixed(2)}</span>
        </div>
        {depto.totalPagado > 0 && depto.statusPago !== 'pagado' && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--green)' }}>
            <span>Pagado</span><span>S/. {depto.totalPagado.toFixed(2)}</span>
          </div>
        )}
      </div>

      <div style={s.actions}>
        <button onClick={onMessage} style={{ ...s.actionBtn, borderColor: depto.mensajeEnviado ? 'rgba(62,207,142,0.4)' : 'var(--border)', color: depto.mensajeEnviado ? 'var(--green)' : 'var(--text-secondary)' }}>
          {depto.mensajeEnviado ? <CheckCircle2 size={13} /> : <MessageSquare size={13} />}
          {depto.mensajeEnviado ? 'Enviado' : 'Ver mensaje'}
        </button>
        {hasPendingApproval ? (
          <button onClick={onVerificar} style={{ ...s.actionBtn, background: '#a78bfa', color: '#fff', borderColor: '#a78bfa', fontWeight: 600, cursor: 'pointer' }}>
            <ShieldCheck size={13} /> Verificar pago
          </button>
        ) : (
          <button onClick={onPago} disabled={!canPay} style={{ ...s.actionBtn, background: canPay ? 'var(--accent)' : 'var(--bg-elevated)', color: canPay ? '#0f1117' : 'var(--text-muted)', borderColor: canPay ? 'var(--accent)' : 'var(--border)', fontWeight: 600, cursor: canPay ? 'pointer' : 'not-allowed', opacity: canPay ? 1 : 0.5 }}>
            {!depto.mensajeEnviado ? <Lock size={13} /> : <CreditCard size={13} />} Pago
          </button>
        )}
      </div>
      {!depto.mensajeEnviado && (
        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
          🔒 Confirma el mensaje para habilitar el pago
        </p>
      )}
    </div>
  )
}

// ── Modal Mensaje ─────────────────────────────────────────────

function MensajeModal({ depto, msgData, loading, onClose, onConfirm }: any) {
  const [copied, setCopied]         = useState(false)
  const [confirming, setConfirming] = useState(false)
  // Fecha de envío del mensaje — se guarda en fecha_mensaje_enviado
  // Por defecto: hoy
  const todayStr = new Date().toISOString().split('T')[0]
  const [fechaEnvio, setFechaEnvio] = useState(todayStr)

  const copy = () => {
    if (!msgData?.mensajeTexto) return
    navigator.clipboard.writeText(msgData.mensajeTexto)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  const handleConfirm = async () => {
    setConfirming(true); await onConfirm(fechaEnvio); setConfirming(false)
  }

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={e => e.stopPropagation()} className="fade-up">
        <div style={s.modalHeader}>
          <h2 style={s.modalTitle}><MessageSquare size={18} color="var(--green)" /> Depto {depto.depto}</h2>
          <button onClick={onClose} style={s.closeBtn}><X size={18} /></button>
        </div>
        <div style={{ padding: '1.5rem', overflowY: 'auto', maxHeight: 'calc(90vh - 140px)' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
              <Loader2 size={24} color="var(--accent)" style={{ animation: 'spin 0.8s linear infinite' }} />
            </div>
          ) : msgData ? (
            <>
              <div style={s.contactRow}>
                <div>
                  <p style={{ fontWeight: 600 }}>{msgData.propietario}</p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{msgData.telefono}</p>
                </div>
                {msgData.telefono && msgData.telefono !== 'Sin teléfono' && (
                  <a href={`https://wa.me/${msgData.telefono.replace(/\D/g,'')}?text=${encodeURIComponent(msgData.mensajeTexto)}`}
                    target="_blank" rel="noreferrer" style={s.btnWhatsapp}>
                    <Send size={14} /> WhatsApp
                  </a>
                )}
              </div>
              <div style={s.msgBox}><pre style={s.msgPre}>{msgData.mensajeTexto}</pre></div>
              <button onClick={copy} style={s.btnCopy}>
                {copied ? <><Check size={13} /> Copiado</> : <><Copy size={13} /> Copiar</>}
              </button>
            </>
          ) : (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>No se pudo cargar el mensaje</p>
          )}
        </div>
        {!depto.mensajeEnviado ? (
          <div style={{ ...s.modalFooter, flexDirection: 'column' as const, gap: '0.75rem', alignItems: 'stretch' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' as const }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' as const }}>
                📅 Fecha de envío del mensaje
              </label>
              <input
                type="date"
                value={fechaEnvio}
                onChange={e => setFechaEnvio(e.target.value)}
                style={{ flex: 1, minWidth: 140, fontSize: '0.875rem' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Confirma para habilitar el pago</p>
              <button onClick={handleConfirm} disabled={confirming || !fechaEnvio} style={{ ...s.btnPrimary, opacity: fechaEnvio ? 1 : 0.5 }}>
                {confirming ? <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : <CheckCircle2 size={14} />}
                Confirmar envío
              </button>
            </div>
          </div>
        ) : (
          <div style={{ ...s.modalFooter, justifyContent: 'center' }}>
            <span style={{ color: 'var(--green)', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <CheckCircle2 size={15} /> Mensaje confirmado
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Modal Pago ────────────────────────────────────────────────

function PagoModal({ depto, onClose, onSaved }: any) {
  const { getBancos, getTiposPago, getBancoLabel, getTipoPagoLabel } = useConfigStore()
  const [monto, setMonto]         = useState(depto.saldo.toFixed(2))
  const [tipoPago, setTipoPago]   = useState('transferencia')
  const [banco, setBanco]         = useState('')
  const [referencia, setRef]      = useState('')
  const [fechaPago, setFecha]     = useState(new Date().toISOString().split('T')[0])
  const [comprobante, setComp]    = useState<File | null>(null)
  const [saving, setSaving]       = useState(false)

  const save = async () => {
    if (!monto || parseFloat(monto) <= 0) return toast.error('Ingresa un monto válido')
    setSaving(true)
    try {
      const { data: payment } = await api.post('/payments', {
        idCuota: depto.feeId, fechaPago, montoCancelado: parseFloat(monto),
        tipoPago, ...(banco && { banco }), ...(referencia && { referencia }),
      })
      if (comprobante) {
        const base64 = await new Promise<string>((res) => {
          const reader = new FileReader(); reader.onload = () => res(reader.result as string); reader.readAsDataURL(comprobante)
        })
        await api.post(`/payments/${payment.id}/comprobante`, { base64, filename: comprobante.name })
      }
      toast.success('Pago registrado'); onSaved()
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Error registrando') }
    finally { setSaving(false) }
  }

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={e => e.stopPropagation()} className="fade-up">
        <div style={s.modalHeader}>
          <h2 style={s.modalTitle}><CreditCard size={18} color="var(--accent)" /> Depto {depto.depto}</h2>
          <button onClick={onClose} style={s.closeBtn}><X size={18} /></button>
        </div>
        <div style={{ padding: '1.5rem', overflowY: 'auto', maxHeight: 'calc(90vh - 140px)' }}>
          <div style={s.saldoBox}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Total cuota</span>
              <span style={{ fontWeight: 600 }}>S/. {depto.montoTotal.toFixed(2)}</span>
            </div>
            {depto.totalPagado > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Ya pagado</span>
                <span style={{ color: 'var(--green)', fontWeight: 600 }}>- S/. {depto.totalPagado.toFixed(2)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: '0.5rem', marginTop: '0.25rem' }}>
              <span style={{ fontWeight: 600 }}>Saldo</span>
              <span style={{ fontWeight: 700, color: 'var(--accent)', fontSize: '1.1rem' }}>S/. {depto.saldo.toFixed(2)}</span>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={s.fieldLabel}>Monto a registrar (S/.) *</label>
              <input type="number" step="0.01" min="0.01" value={monto} onChange={e => setMonto(e.target.value)} style={{ width: '100%', fontSize: '1.1rem', fontWeight: 700 }} />
            </div>
            <div>
              <label style={s.fieldLabel}>Tipo de pago *</label>
              <select value={tipoPago} onChange={e => setTipoPago(e.target.value)} style={{ width: '100%' }}>
                {getTiposPago().map(t => <option key={t} value={t}>{getTipoPagoLabel(t)}</option>)}
              </select>
            </div>
            <div>
              <label style={s.fieldLabel}>Banco</label>
              <select value={banco} onChange={e => setBanco(e.target.value)} style={{ width: '100%' }}>
                <option value="">— Sin especificar —</option>
                {getBancos().map(b => <option key={b} value={b}>{getBancoLabel(b)}</option>)}
              </select>
            </div>
            <div>
              <label style={s.fieldLabel}>N° operación</label>
              <input value={referencia} onChange={e => setRef(e.target.value)} placeholder="Opcional" />
            </div>
            <div>
              <label style={s.fieldLabel}>Fecha de pago *</label>
              <input type="date" value={fechaPago} onChange={e => setFecha(e.target.value)} />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={s.fieldLabel}>Comprobante</label>
              <label style={s.uploadZone}>
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => setComp(e.target.files?.[0] || null)} />
                <Upload size={20} color="var(--text-muted)" />
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {comprobante ? comprobante.name : 'Toca para subir imagen'}
                </span>
              </label>
            </div>
          </div>
        </div>
        <div style={s.modalFooter}>
          <button onClick={onClose} style={s.btnSecondary}>Cancelar</button>
          <button onClick={save} disabled={saving} style={s.btnPrimary}>
            {saving ? <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : <CheckCircle2 size={14} />}
            Confirmar pago
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal Verificar Pago (aprobación supervisor) ──────────────

function VerificarPagoModal({ depto, pago, onClose, onAprobar, onRechazar }: any) {
  const [zoomImg, setZoomImg] = useState<string | null>(null)
  const [acting, setActing]   = useState(false)
  const API_BASE = import.meta.env.VITE_API_URL?.replace('/api/v1','') || ''
  const buildComprobanteUrl = (path: string | undefined) => {
    if (!path) return null
    // Si ya es URL completa
    if (path.startsWith('http')) return path
    // Normalizar path: quitar ./ del inicio y asegurar que empiece con /
    const normalized = '/' + path.replace(/^\.?\//, '').replace(/\\/g, '/')
    return `${API_BASE}${normalized}`
  }
  const comprobanteUrl = buildComprobanteUrl(pago?.comprobanteUrl)

  const handleAprobar = async () => {
    setActing(true)
    await onAprobar(pago.id)
    setActing(false)
  }
  const handleRechazar = async () => {
    setActing(true)
    await onRechazar(pago.id)
    setActing(false)
  }

  return (
    <>
      <div style={s.overlay} onClick={onClose}>
        <div style={s.modal} onClick={e => e.stopPropagation()} className="fade-up">
          <div style={s.modalHeader}>
            <h2 style={s.modalTitle}>
              <ShieldCheck size={18} color="#a78bfa" /> Verificar pago — Depto {depto.depto}
            </h2>
            <button onClick={onClose} style={s.closeBtn}><X size={18} /></button>
          </div>

          <div style={{ padding: '1.5rem', overflowY: 'auto', maxHeight: 'calc(90vh - 140px)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {/* Resumen de la cuota */}
            <div style={s.saldoBox}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Cuota total</span>
                <span style={{ fontWeight: 600 }}>S/. {depto.montoTotal.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: '0.5rem', marginTop: '0.25rem' }}>
                <span style={{ fontWeight: 600 }}>Monto enviado por propietario</span>
                <span style={{ fontWeight: 700, color: '#a78bfa', fontSize: '1.1rem' }}>S/. {parseFloat(pago.monto || pago.montoCancelado || 0).toFixed(2)}</span>
              </div>
            </div>

            {/* Datos del pago */}
            <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '0.9rem 1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              {[
                ['Tipo de pago', pago.tipoPago || '—'],
                ['Banco', pago.banco ? pago.banco.toUpperCase() : '—'],
                ['Fecha de pago', pago.fechaPago || '—'],
                ['N° Operación', pago.referencia || '—'],
              ].map(([label, value]) => (
                <div key={label}>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.15rem' }}>{label}</p>
                  <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>{value}</p>
                </div>
              ))}
            </div>

            {/* Comprobante */}
            <div>
              <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>
                Comprobante de pago
              </p>
              {comprobanteUrl ? (
                <div
                  onClick={() => setZoomImg(comprobanteUrl)}
                  style={{ position: 'relative', cursor: 'zoom-in', borderRadius: 'var(--radius)', overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 160 }}
                >
                  <img
                    src={comprobanteUrl}
                    alt="Comprobante"
                    style={{ maxWidth: '100%', maxHeight: 280, objectFit: 'contain', display: 'block' }}
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                  <div style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', background: 'rgba(0,0,0,0.5)', borderRadius: 6, padding: '0.25rem 0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#fff', fontSize: '0.72rem' }}>
                    <ZoomIn size={12} /> Ver completo
                  </div>
                </div>
              ) : (
                <div style={{ background: 'var(--bg-elevated)', border: '1px dashed var(--border)', borderRadius: 'var(--radius)', padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  Sin comprobante adjunto
                </div>
              )}
            </div>

            {/* Aviso */}
            <div style={{ background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.25)', borderRadius: 'var(--radius)', padding: '0.65rem 0.9rem' }}>
              <p style={{ fontSize: '0.8rem', color: '#a78bfa' }}>
                Al <strong>aprobar</strong> el pago se actualizará el estado de la cuota automáticamente.
                Al <strong>rechazar</strong> el pago quedará anulado y el propietario deberá enviarlo nuevamente.
              </p>
            </div>
          </div>

          <div style={{ ...s.modalFooter, justifyContent: 'space-between' }}>
            <button onClick={handleRechazar} disabled={acting}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.35)', color: '#f87171', fontWeight: 600, fontSize: '0.875rem', padding: '0.6rem 1.1rem', borderRadius: 'var(--radius)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
              <XCircle size={15} /> Rechazar
            </button>
            <div style={{ display: 'flex', gap: '0.6rem' }}>
              <button onClick={onClose} style={s.btnSecondary}>Cancelar</button>
              <button onClick={handleAprobar} disabled={acting}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'var(--green)', border: 'none', color: '#0f1117', fontWeight: 700, fontSize: '0.875rem', padding: '0.6rem 1.2rem', borderRadius: 'var(--radius)', cursor: 'pointer', fontFamily: 'var(--font-body)', opacity: acting ? 0.6 : 1 }}>
                {acting ? <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : <ShieldCheck size={14} />}
                Aprobar pago
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Zoom comprobante */}
      {zoomImg && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2100, padding: '1rem' }}
          onClick={() => setZoomImg(null)}
        >
          <button style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}
            onClick={() => setZoomImg(null)}>
            <X size={20} />
          </button>
          <img src={zoomImg} alt="Comprobante" style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 8, objectFit: 'contain', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}
            onClick={e => e.stopPropagation()} />
        </div>
      )}
    </>
  )
}

// ── Estilos ───────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  page:         { padding: '2rem', maxWidth: 1200, margin: '0 auto' },
  header:       { marginBottom: '1.5rem' },
  title:        { fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '0.25rem' },
  subtitle:     { color: 'var(--text-secondary)', fontSize: '0.875rem' },
  controls:     { display: 'flex', alignItems: 'flex-end', gap: '1.25rem', marginBottom: '1.75rem', flexWrap: 'wrap' },
  ctrlGroup:    { display: 'flex', flexDirection: 'column', gap: '0.4rem' },
  ctrlLabel:    { fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' },
  select:       { background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: 'var(--radius)', padding: '0.55rem 0.9rem', fontSize: '0.875rem', fontFamily: 'var(--font-body)', minWidth: 220 },
  mesNav:       { display: 'flex', alignItems: 'center', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' },
  navBtn:       { background: 'none', border: 'none', padding: '0.55rem 0.75rem', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' },
  mesLabel:     { padding: '0 1rem', fontWeight: 600, fontSize: '0.9rem', minWidth: 140, textAlign: 'center' },
  btnRefresh:   { background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '0.55rem 0.75rem', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' },
  loading:      { display: 'flex', justifyContent: 'center', padding: '4rem' },
  emptyState:   { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4rem 2rem', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' },
  progressCard: { background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.25rem 1.5rem', marginBottom: '1.5rem' },
  progressHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', gap: '1rem', flexWrap: 'wrap' },
  progressBarBg:  { background: 'var(--bg-elevated)', borderRadius: 20, height: 8, overflow: 'hidden' },
  progressBarFill: { background: 'linear-gradient(90deg, var(--accent), var(--green))', height: '100%', borderRadius: 20, transition: 'width 0.5s ease' },
  grid:         { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' },
  card:         { background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.9rem' },
  cardHeader:   { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  badge:        { display: 'inline-flex', alignItems: 'center', gap: '0.3rem', border: '1px solid', borderRadius: 20, padding: '0.15rem 0.6rem', fontSize: '0.72rem', fontWeight: 600 },
  breakdown:    { background: 'var(--bg-elevated)', borderRadius: 'var(--radius)', padding: '0.75rem' },
  breakRow:     { display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', padding: '0.2rem 0' },
  breakTotal:   { display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', borderTop: '1px solid var(--border)', paddingTop: '0.4rem', marginTop: '0.3rem' },
  actions:      { display: 'flex', gap: '0.5rem' },
  actionBtn:    { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', background: 'none', border: '1px solid', borderRadius: 'var(--radius)', padding: '0.5rem 0.5rem', fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'var(--font-body)' },
  overlay:      { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem', backdropFilter: 'blur(4px)' },
  modal:        { background: 'var(--bg-surface)', border: '1px solid var(--border-accent)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 520, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-lg)' },
  modalHeader:  { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' },
  modalTitle:   { fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' },
  closeBtn:     { background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)' },
  modalFooter:  { display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.75rem', padding: '1rem 1.5rem', borderTop: '1px solid var(--border)' },
  fieldLabel:   { fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '0.4rem' },
  contactRow:   { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-elevated)', borderRadius: 'var(--radius)', padding: '0.75rem 1rem', marginBottom: '1rem' },
  btnWhatsapp:  { display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#25d366', color: '#fff', fontWeight: 600, fontSize: '0.8rem', padding: '0.45rem 0.9rem', borderRadius: 'var(--radius)', textDecoration: 'none' },
  msgBox:       { background: '#1a1f2e', borderRadius: 'var(--radius)', padding: '1rem', marginBottom: '0.75rem', border: '1px solid var(--border)' },
  msgPre:       { whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '0.85rem', lineHeight: 1.6, color: 'var(--text-primary)', fontFamily: 'var(--font-body)', margin: 0 },
  btnCopy:      { display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '0.5rem 1rem', fontSize: '0.8rem', cursor: 'pointer', color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' },
  saldoBox:     { background: 'var(--bg-elevated)', borderRadius: 'var(--radius)', padding: '0.9rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1.25rem' },
  uploadZone:   { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', border: '1.5px dashed var(--border)', borderRadius: 'var(--radius)', padding: '1rem', cursor: 'pointer', width: '100%' },
  btnPrimary:   { display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--accent)', color: '#0f1117', fontWeight: 600, fontSize: '0.875rem', padding: '0.6rem 1.2rem', borderRadius: 'var(--radius)', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)' },
  btnSecondary: { display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-elevated)', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.875rem', padding: '0.6rem 1.2rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', cursor: 'pointer', fontFamily: 'var(--font-body)' },
}
