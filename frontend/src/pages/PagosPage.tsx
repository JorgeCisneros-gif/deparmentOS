// src/pages/PagosPage.tsx
import { useEffect, useState, useCallback } from 'react'
import api from '../services/api'
import { useTz } from '../store/timezone.store'
import toast from 'react-hot-toast'
import {
  CreditCard, ChevronLeft, ChevronRight, Loader2,
  X, ZoomIn, CheckCircle2, Clock, AlertCircle,
  Droplets, Zap, Wifi, Brush, Wrench, ReceiptText,
  RefreshCw, ImageOff,
} from 'lucide-react'
import BuildingSelector from '../components/common/BuildingSelector'

// ── Tipos ─────────────────────────────────────────────────────

interface DesgloseItem {
  tipo: string; label: string; monto: number; activo: boolean
}

interface DeptoPago {
  feeId: string
  depto: string
  propietario?: string
  montoTotal: number
  statusPago: 'pendiente' | 'pagado' | 'parcial' | 'vencido'
  desglose: DesgloseItem[]
  pagos: PagoItem[]
  totalPagado: number
  saldo: number
}

interface PagoItem {
  id: string; monto: number; tipoPago: string; fechaPago: string
  referencia?: string; banco?: string; comprobanteUrl?: string
}

interface Building { id: string; nombre: string }

// ── Config visual ─────────────────────────────────────────────

const MESES = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Setiembre', 'Octubre', 'Noviembre', 'Diciembre']

const STATUS_CFG = {
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

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'http://localhost:3000'

// ── Componente principal ──────────────────────────────────────

export default function PagosPage() {
  const [selBuilding, setSelBuilding]   = useState('')
  const { fmt, fmtDT } = useTz()
  const [mes, setMes]                   = useState(new Date().getMonth() + 1)
  const [anio, setAnio]                 = useState(new Date().getFullYear())
  const [data, setData]                 = useState<DeptoPago[]>([])
  const [resumen, setResumen]           = useState<any>(null)
  const [loading, setLoading]           = useState(false)
  const [zoomImg, setZoomImg]           = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState('')

  useEffect(() => { if (selBuilding) load() }, [selBuilding, mes, anio])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data: res } = await api.get('/payments/period-summary', {
        params: { buildingId: selBuilding, month: mes, year: anio },
      })
      setResumen(res.resumen)
      setData(res.departamentos || [])
    } catch (e: any) {
      if (e?.response?.status !== 404) toast.error('Error cargando pagos')
      setData([]); setResumen(null)
    } finally { setLoading(false) }
  }, [selBuilding, mes, anio])

  const navMes = (dir: number) => {
    let m = mes + dir, a = anio
    if (m > 12) { m = 1; a++ }; if (m < 1) { m = 12; a-- }
    setMes(m); setAnio(a)
  }

  const filtered = filterStatus ? data.filter(d => d.statusPago === filterStatus) : data

  const imgUrl = (filepath: string) => {
    if (!filepath) return null
    const filename = filepath.replace(/\\/g, '/').split('/').pop()
    return `${API_BASE}/uploads/comprobantes/${filename}`
  }

  return (
    <div style={s.page}>
      <div style={s.header} className="fade-up">
        <div>
          <h1 style={s.title}>Historial de Pagos</h1>
          <p style={s.subtitle}>Consulta pagos y comprobantes por período y departamento</p>
        </div>
      </div>

      {/* Controles */}
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
        <div style={s.ctrlGroup}>
          <label style={s.ctrlLabel}>Estado</label>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ ...s.select, minWidth: 140 }}>
            <option value="">Todos</option>
            <option value="pendiente">Pendiente</option>
            <option value="parcial">Parcial</option>
            <option value="pagado">Pagado</option>
            <option value="vencido">Vencido</option>
          </select>
        </div>
        <button onClick={load} style={s.btnRefresh}><RefreshCw size={15} /></button>
      </div>

      {/* Resumen */}
      {resumen && (
        <div style={s.summaryBar} className="fade-up">
          <SummaryPill label="Total deptos"    value={resumen.totalDeptos} />
          <SummaryPill label="Pagados"         value={resumen.pagados}    color="var(--green)" />
          <SummaryPill label="Pendientes"      value={resumen.pendientes} color="var(--accent)" />
          <SummaryPill label="Monto pendiente" value={`S/. ${resumen.montoPendiente?.toFixed(2)}`} color="var(--accent)" />
        </div>
      )}

      {loading ? (
        <div style={s.loading}>
          <Loader2 size={28} color="var(--accent)" style={{ animation: 'spin 0.8s linear infinite' }} />
        </div>
      ) : filtered.length === 0 ? (
        <div style={s.empty}>
          <CreditCard size={40} color="var(--text-muted)" style={{ marginBottom: '0.75rem' }} />
          <p style={{ color: 'var(--text-muted)' }}>No hay registros para este período</p>
        </div>
      ) : (
        <div style={s.tableWrap} className="fade-up">
          <table style={s.table}>
            <thead>
              <tr>
                {['Departamento', 'Desglose', 'Total', 'Pagado', 'Saldo', 'Estado', 'Pagos / Comprobantes'].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((d, i) => {
                const cfg        = STATUS_CFG[d.statusPago]
                const StatusIcon = cfg.Icon
                return (
                  <tr key={d.feeId || i} style={i % 2 !== 0 ? { background: 'rgba(255,255,255,0.02)' } : {}}>

                    {/* Depto */}
                    <td style={s.td}>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Depto {d.depto}</div>
                      {d.propietario && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>{d.propietario}</div>}
                    </td>

                    {/* Desglose dinámico */}
                    <td style={s.td}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                        {(d.desglose || []).map((item, idx) => {
                          const IconComp = TIPO_ICON[item.tipo] || ReceiptText
                          const color    = item.activo ? (TIPO_COLOR[item.tipo] || '#94a3b8') : 'var(--text-muted)'
                          return (
                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', opacity: item.activo ? 1 : 0.5 }}>
                              <IconComp size={10} color={color} />
                              <span style={{ color: 'var(--text-secondary)', textDecoration: item.activo ? 'none' : 'line-through' }}>
                                {item.label}
                              </span>
                              {!item.activo && (
                                <span style={{ fontSize: '0.62rem', background: 'rgba(148,163,184,0.15)', border: '1px solid rgba(148,163,184,0.2)', borderRadius: 3, padding: '0 0.25rem', color: 'var(--text-muted)' }}>
                                  inactivo
                                </span>
                              )}
                              <span style={{ marginLeft: 'auto', color: item.activo ? 'inherit' : 'var(--text-muted)', textDecoration: item.activo ? 'none' : 'line-through' }}>
                                S/. {item.monto.toFixed(2)}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </td>

                    {/* Total */}
                    <td style={{ ...s.td, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                      S/. {(d.montoTotal || 0).toFixed(2)}
                    </td>

                    {/* Pagado */}
                    <td style={{ ...s.td, color: 'var(--green)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                      {(d.totalPagado || 0) > 0 ? `S/. ${(d.totalPagado || 0).toFixed(2)}` : '—'}
                    </td>

                    {/* Saldo */}
                    <td style={{ ...s.td, color: (d.saldo || 0) > 0 ? 'var(--accent)' : 'var(--text-muted)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                      {(d.saldo || 0) > 0 ? `S/. ${(d.saldo || 0).toFixed(2)}` : '—'}
                    </td>

                    {/* Estado */}
                    <td style={s.td}>
                      <span style={{ ...s.badge, background: cfg.bg, color: cfg.color, borderColor: `${cfg.color}40` }}>
                        <StatusIcon size={11} /> {cfg.label}
                      </span>
                    </td>

                    {/* Pagos + comprobantes */}
                    <td style={s.td}>
                      {(!d.pagos || d.pagos.length === 0) ? (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Sin pagos</span>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {d.pagos.map(p => (
                            <div key={p.id} style={s.pagoRow}>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600, fontSize: '0.82rem' }}>S/. {parseFloat(p.monto as any).toFixed(2)}</div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                  {p.tipoPago}{p.banco ? ` · ${p.banco.toUpperCase()}` : ''} · {fmt(p.fechaPago)}
                                </div>
                                {p.referencia && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Ref: {p.referencia}</div>}
                              </div>
                              {p.comprobanteUrl ? (
                                <button onClick={() => setZoomImg(imgUrl(p.comprobanteUrl!)!)} style={s.thumbBtn} title="Ver comprobante">
                                  <img src={imgUrl(p.comprobanteUrl)!} alt="comprobante" style={s.thumb}
                                    onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                                  <div style={s.thumbOverlay}><ZoomIn size={12} color="#fff" /></div>
                                </button>
                              ) : (
                                <div style={{ ...s.thumbBtn, opacity: 0.4, cursor: 'default' }}>
                                  <ImageOff size={14} color="var(--text-muted)" />
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Zoom comprobante */}
      {zoomImg && (
        <div style={s.zoomOverlay} onClick={() => setZoomImg(null)}>
          <button style={s.zoomClose} onClick={() => setZoomImg(null)}><X size={20} /></button>
          <img src={zoomImg} alt="comprobante" style={s.zoomImg} onClick={e => e.stopPropagation()} />
        </div>
      )}
    </div>
  )
}

function SummaryPill({ label, value, color }: any) {
  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '0.6rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
      <span style={{ fontWeight: 700, fontSize: '1.1rem', color: color || 'var(--text-primary)' }}>{value}</span>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  page:      { padding: '2rem', maxWidth: 1300, margin: '0 auto' },
  header:    { marginBottom: '1.5rem' },
  title:     { fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '0.25rem' },
  subtitle:  { color: 'var(--text-secondary)', fontSize: '0.875rem' },
  controls:  { display: 'flex', alignItems: 'flex-end', gap: '1.25rem', marginBottom: '1.25rem', flexWrap: 'wrap' },
  ctrlGroup: { display: 'flex', flexDirection: 'column', gap: '0.4rem' },
  ctrlLabel: { fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' },
  select:    { background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: 'var(--radius)', padding: '0.5rem 0.9rem', fontSize: '0.875rem', fontFamily: 'var(--font-body)', minWidth: 200 },
  mesNav:    { display: 'flex', alignItems: 'center', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' },
  navBtn:    { background: 'none', border: 'none', padding: '0.5rem 0.7rem', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' },
  mesLabel:  { padding: '0 1rem', fontWeight: 600, fontSize: '0.875rem', minWidth: 130, textAlign: 'center' },
  btnRefresh:{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '0.5rem 0.7rem', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' },
  summaryBar:{ display: 'flex', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap' },
  loading:   { display: 'flex', justifyContent: 'center', padding: '4rem' },
  empty:     { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4rem', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' },
  tableWrap: { background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'auto' },
  table:     { width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' },
  th:        { textAlign: 'left', padding: '0.75rem 1rem', color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)', whiteSpace: 'nowrap' },
  td:        { padding: '0.75rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.03)', verticalAlign: 'top' },
  badge:     { display: 'inline-flex', alignItems: 'center', gap: '0.3rem', border: '1px solid', borderRadius: 20, padding: '0.2rem 0.6rem', fontSize: '0.72rem', fontWeight: 600 },
  pagoRow:   { display: 'flex', alignItems: 'center', gap: '0.6rem', background: 'var(--bg-elevated)', borderRadius: 6, padding: '0.4rem 0.6rem' },
  thumbBtn:  { position: 'relative', width: 44, height: 44, borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border)', cursor: 'pointer', flexShrink: 0, background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  thumb:     { width: '100%', height: '100%', objectFit: 'cover' },
  thumbOverlay: { position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.15s' },
  zoomOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '1rem' },
  zoomClose:   { position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' },
  zoomImg:     { maxWidth: '90vw', maxHeight: '90vh', borderRadius: 8, objectFit: 'contain', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' },
}
