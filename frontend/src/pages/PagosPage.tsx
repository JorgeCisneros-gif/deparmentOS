// src/pages/PagosPage.tsx
import { useEffect, useState, useCallback } from 'react'
import api from '../services/api'
import toast from 'react-hot-toast'
import {
  CreditCard, Loader2, RefreshCw,
  ArrowUp, ArrowDown, CheckCircle2, Clock, XCircle, Cloud,
} from 'lucide-react'
import BuildingSelector from '../components/common/BuildingSelector'
import KpiCard from '../components/reports/KpiCard'
import ExportButtons from '../components/reports/ExportButtons'
import ReportStatusModal from '../components/reports/ReportStatusModal'
import PeriodDetailDrawer from '../components/reports/PeriodDetailDrawer'

interface Pago {
  id:              string
  fechaPago:       string
  nrDepartamento:  string
  tipoPago:        string
  banco:           string | null
  referencia:      string | null
  montoCancelado:  number
  estadoPago:      string
  observacion:     string | null
  comprobanteUrl:  string | null
  periodoMes:      number
  periodoAnio:     number
  aprobadoPor:     string | null
}

interface Analytics {
  recaudado: number
  facturado: number
  porcentaje: number
  resultado: number
  tipoResultado: 'excedente' | 'deficit' | 'exacto'
  metodoMasUsado: { metodo: string; cantidad: number; porcentaje: number } | null
  porAprobar: number
  totalPagos: number
  totalServicios: number
}

const MESES = ['','Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Setiembre','Octubre','Noviembre','Diciembre']

export default function PagosPage() {
  const [selBuilding, setSelBuilding] = useState('')
  const [edificioNombre, setEdNombre] = useState('')
  const [mes, setMes]                 = useState(new Date().getMonth() + 1)
  const [anio, setAnio]               = useState(new Date().getFullYear())
  const [fMetodo, setFMetodo]         = useState('')
  const [fBanco, setFBanco]           = useState('')
  const [fEstado, setFEstado]         = useState('')

  const [historial, setHistorial]     = useState<Pago[]>([])
  const [analytics, setAnalytics]     = useState<Analytics | null>(null)
  const [loading, setLoading]         = useState(false)
  const [detalle, setDetalle]         = useState<Pago | null>(null)
  const [jobId, setJobId]             = useState<string | null>(null)

  useEffect(() => {
    if (selBuilding) {
      api.get(`/buildings/${selBuilding}`).then(r => setEdNombre(r.data?.nombre || ''))
        .catch(() => {})
    }
  }, [selBuilding])

  useEffect(() => {
    if (selBuilding) load()
  }, [selBuilding, mes, anio, fMetodo, fBanco, fEstado])

  const load = useCallback(async () => {
    if (!selBuilding) return
    setLoading(true)
    setHistorial([])
    setAnalytics(null)
    try {
      const params: any = { edificioId: selBuilding, mes, anio }
      if (fMetodo) params.metodo = fMetodo
      if (fBanco)  params.banco  = fBanco
      if (fEstado) params.estado = fEstado
      const { data } = await api.get('/reports/pagos/analytics', { params })
      setHistorial(data.historial || [])
      setAnalytics(data.analytics)
    } catch (e: any) {
      if (e?.response?.status !== 404) toast.error('Error cargando pagos')
    } finally { setLoading(false) }
  }, [selBuilding, mes, anio, fMetodo, fBanco, fEstado])

  const tieneData = historial.length > 0

  // Generar opciones de años (últimos 3)
  const anioActual = new Date().getFullYear()
  const anios = [anioActual, anioActual - 1, anioActual - 2]

  return (
    <div style={{ padding: '2rem', maxWidth: 1200, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '0.25rem' }} className="fade-up">
        <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>
          Historial de pagos
        </h1>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          {edificioNombre && `${edificioNombre} · `}{MESES[mes]} {anio}
        </span>
      </div>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: 4, marginBottom: '1.25rem' }}>
        Conciliación bancaria y salud financiera del edificio por mes.
      </p>

      {/* Filtros */}
      <div style={{
        background: 'var(--bg-surface)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)', padding: '0.6rem 1rem',
        marginBottom: '1rem',
        display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
      }} className="fade-up">
        <span style={lbl}>Edificio</span>
        <BuildingSelector value={selBuilding} onChange={setSelBuilding} label="EDIFICIO" autoSelect />
        <span style={lbl}>Mes</span>
        <select value={mes} onChange={e => setMes(parseInt(e.target.value))} style={sel}>
          {MESES.slice(1).map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
        </select>
        <select value={anio} onChange={e => setAnio(parseInt(e.target.value))} style={sel}>
          {anios.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <span style={lbl}>Método</span>
        <select value={fMetodo} onChange={e => setFMetodo(e.target.value)} style={sel}>
          <option value="">Todos</option>
          <option value="transferencia">Transferencia</option>
          <option value="yape">Yape</option>
          <option value="plin">Plin</option>
          <option value="efectivo">Efectivo</option>
        </select>
        <span style={lbl}>Banco</span>
        <select value={fBanco} onChange={e => setFBanco(e.target.value)} style={sel}>
          <option value="">Todos</option>
          <option value="bcp">BCP</option>
          <option value="bbva">BBVA</option>
          <option value="scotiabank">Scotiabank</option>
          <option value="interbank">Interbank</option>
        </select>
        <span style={lbl}>Estado</span>
        <select value={fEstado} onChange={e => setFEstado(e.target.value)} style={sel}>
          <option value="">Todos</option>
          <option value="aprobado">Aprobado</option>
          <option value="pendiente_aprobacion">Pendiente</option>
          <option value="rechazado">Rechazado</option>
        </select>
        <button onClick={load} style={btnRefresh}><RefreshCw size={14} /></button>
      </div>

      {/* KPIs */}
      {analytics && (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 10, marginBottom: '1rem',
        }} className="fade-up">
          <KpiCard
            label="Recaudado vs facturado"
            value={`S/. ${analytics.recaudado.toFixed(2)}`}
            hint={`de S/. ${analytics.facturado.toFixed(2)} · ${analytics.porcentaje}%`}
          />
          <KpiCard
            label="Resultado del mes"
            value={
              <span style={{
                color: analytics.tipoResultado === 'excedente' ? 'var(--green)'
                     : analytics.tipoResultado === 'deficit'   ? 'var(--red)'
                     : 'var(--text-primary)',
                display: 'inline-flex', alignItems: 'center', gap: 6,
              }}>
                {analytics.tipoResultado === 'excedente' && <ArrowUp size={18}/>}
                {analytics.tipoResultado === 'deficit'   && <ArrowDown size={18}/>}
                S/. {Math.abs(analytics.resultado).toFixed(2)}
              </span>
            }
            hint={
              analytics.tipoResultado === 'excedente' ? 'Excedente'
            : analytics.tipoResultado === 'deficit'   ? 'Déficit'
            : 'Exacto'
            }
            hintColor={
              analytics.tipoResultado === 'excedente' ? 'success'
            : analytics.tipoResultado === 'deficit'   ? 'danger'
            : 'muted'
            }
          />
          <KpiCard
            label="Método más usado"
            value={analytics.metodoMasUsado
              ? capitalize(analytics.metodoMasUsado.metodo)
              : '—'}
            hint={analytics.metodoMasUsado
              ? `${analytics.metodoMasUsado.cantidad} pagos · ${analytics.metodoMasUsado.porcentaje}%`
              : null}
          />
          <KpiCard
            label="Por aprobar"
            value={
              <span style={{
                color: analytics.porAprobar > 0 ? 'var(--yellow, #f5b945)' : 'var(--text-primary)',
              }}>{analytics.porAprobar}</span>
            }
            hint={analytics.porAprobar > 0 ? 'Requieren revisión' : 'Sin pendientes'}
            hintColor={analytics.porAprobar > 0 ? 'warning' : 'muted'}
          />
        </div>
      )}

      {/* Acciones */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.75rem' }}>
        <ExportButtons
          tipo="pagos"
          disabled={!tieneData}
          syncParams={{
            edificioId: selBuilding,
            mes, anio,
            edificio: edificioNombre,
            metodo: fMetodo || undefined,
            banco: fBanco || undefined,
            estado: fEstado || undefined,
          }}
          asyncParams={{
            filtros: { metodo: fMetodo || undefined, banco: fBanco || undefined, estado: fEstado || undefined },
          }}
          onJobCreated={setJobId}
        />
        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>
          {historial.length} pagos
        </span>
      </div>

      {/* Tabla */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
          <Loader2 size={26} color="var(--accent)" style={{ animation: 'spin 0.8s linear infinite' }} />
        </div>
      ) : !tieneData ? (
        <div style={{
          textAlign: 'center', padding: '3rem',
          background: 'var(--bg-surface)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)', color: 'var(--text-muted)',
        }}>
          <CreditCard size={36} style={{ marginBottom: 8, opacity: 0.4 }} />
          <p style={{ margin: 0 }}>Sin pagos registrados para este mes</p>
        </div>
      ) : (
        <div style={{
          background: 'var(--bg-surface)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)', overflow: 'auto',
        }} className="fade-up">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--bg-elevated)' }}>
                <th style={th}>Fecha</th>
                <th style={th}>Depto</th>
                <th style={th}>Método</th>
                <th style={th}>Banco</th>
                <th style={th}>Referencia</th>
                <th style={{...th, textAlign: 'right'}}>Monto</th>
                <th style={th}>Estado</th>
                <th style={{...th, textAlign: 'right'}}></th>
              </tr>
            </thead>
            <tbody>
              {historial.map((p, i) => (
                <tr key={p.id} style={i % 2 === 1 ? { background: 'rgba(255,255,255,0.02)' } : {}}>
                  <td style={td}>{formatFecha(p.fechaPago)}</td>
                  <td style={{ ...td, fontWeight: 600 }}>{p.nrDepartamento}</td>
                  <td style={td}><MetodoChip metodo={p.tipoPago} /></td>
                  <td style={{ ...td, color: 'var(--text-secondary)' }}>{(p.banco || '').toUpperCase()}</td>
                  <td style={{ ...td, fontFamily: 'monospace', fontSize: 12, color: 'var(--text-secondary)' }}>
                    {p.referencia || '—'}
                  </td>
                  <td style={{ ...td, textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                    S/. {p.montoCancelado.toFixed(2)}
                  </td>
                  <td style={td}><EstadoChip estado={p.estadoPago} /></td>
                  <td style={{ ...td, textAlign: 'right' }}>
                    <button onClick={() => setDetalle(p)} style={btnVer}>
                      {p.estadoPago === 'pendiente_aprobacion' ? 'Revisar' : 'Ver'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Drawer detalle */}
      <PeriodDetailDrawer
        open={!!detalle}
        title={detalle ? `Pago de S/. ${detalle.montoCancelado.toFixed(2)}` : ''}
        subtitle={detalle ? `Depto ${detalle.nrDepartamento} · ${formatFecha(detalle.fechaPago)}` : ''}
        onClose={() => setDetalle(null)}
      >
        {detalle && <DetallePago pago={detalle} />}
      </PeriodDetailDrawer>

      {jobId && <ReportStatusModal jobId={jobId} onClose={() => setJobId(null)} />}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
//  Subcomponentes
// ════════════════════════════════════════════════════════════════

function MetodoChip({ metodo }: { metodo: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', fontSize: 11, fontWeight: 500,
      borderRadius: 'var(--radius)',
      background: 'rgba(99, 102, 241, 0.12)',
      color: 'var(--accent)',
    }}>
      {capitalize(metodo)}
    </span>
  )
}

function EstadoChip({ estado }: { estado: string }) {
  if (estado === 'aprobado') {
    return chip('Aprobado', 'rgba(34,197,94,0.15)', 'var(--green)', <CheckCircle2 size={11}/>)
  }
  if (estado === 'pendiente_aprobacion') {
    return chip('Pendiente', 'rgba(245,185,69,0.15)', 'var(--yellow, #f5b945)', <Clock size={11}/>)
  }
  if (estado === 'rechazado') {
    return chip('Rechazado', 'rgba(239,68,68,0.15)', 'var(--red)', <XCircle size={11}/>)
  }
  return chip(estado, 'var(--bg-elevated)', 'var(--text-secondary)')
}

function chip(label: string, bg: string, color: string, icon?: any) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', fontSize: 11, fontWeight: 500,
      borderRadius: 'var(--radius)', background: bg, color,
    }}>{icon}{label}</span>
  )
}

function DetallePago({ pago }: { pago: Pago }) {
  return (
    <div>
      <table style={{ width: '100%', fontSize: 13, marginBottom: 16 }}>
        <tbody>
          <Row label="Departamento" value={pago.nrDepartamento} />
          <Row label="Fecha de pago" value={formatFechaCompleta(pago.fechaPago)} />
          <Row label="Período cuota" value={`${MESES[pago.periodoMes]} ${pago.periodoAnio}`} />
          <Row label="Método" value={capitalize(pago.tipoPago)} />
          <Row label="Banco" value={(pago.banco || '—').toUpperCase()} />
          <Row label="Referencia" value={pago.referencia || '—'} mono />
          <tr style={{ borderTop: '1px solid var(--border)' }}>
            <td style={{ padding: '10px 0 6px', fontWeight: 600 }}>Monto cancelado</td>
            <td style={{ padding: '10px 0 6px', textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
              S/. {pago.montoCancelado.toFixed(2)}
            </td>
          </tr>
          <Row label="Estado" value={
            pago.estadoPago === 'aprobado' ? 'Aprobado'
          : pago.estadoPago === 'pendiente_aprobacion' ? 'Pendiente'
          : pago.estadoPago === 'rechazado' ? 'Rechazado'
          : pago.estadoPago
          } />
          {pago.aprobadoPor && <Row label="Aprobado por" value={pago.aprobadoPor} />}
          {pago.observacion && <Row label="Observación" value={pago.observacion} />}
        </tbody>
      </table>

      {pago.comprobanteUrl && (
        <>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 6px' }}>
            Comprobante
          </p>
          <div style={{
            background: 'var(--bg-elevated)', borderRadius: 'var(--radius)',
            padding: 10, display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <Cloud size={18} color="var(--text-muted)" />
            <span style={{ fontSize: 12, color: 'var(--text-secondary)', flex: 1 }}>
              Comprobante adjunto
            </span>
            <a href={pago.comprobanteUrl} target="_blank" rel="noopener noreferrer" style={{
              fontSize: 12, color: 'var(--accent)', textDecoration: 'none',
            }}>Ver</a>
          </div>
        </>
      )}
    </div>
  )
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <tr>
      <td style={{ padding: '5px 0', color: 'var(--text-secondary)' }}>{label}</td>
      <td style={{
        padding: '5px 0', textAlign: 'right',
        fontFamily: mono ? 'monospace' : undefined,
        fontSize: mono ? 12 : undefined,
      }}>{value}</td>
    </tr>
  )
}

// ════════════════════════════════════════════════════════════════
//  Helpers
// ════════════════════════════════════════════════════════════════

function formatFecha(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })
}

function formatFechaCompleta(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })
}

function capitalize(s: string): string {
  if (!s) return ''
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// ════════════════════════════════════════════════════════════════
//  Estilos
// ════════════════════════════════════════════════════════════════

const lbl: React.CSSProperties = {
  fontSize: 12, color: 'var(--text-secondary)',
}
const sel: React.CSSProperties = {
  height: 30, padding: '0 8px', fontSize: 13,
  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius)', color: 'var(--text-primary)',
}
const btnRefresh: React.CSSProperties = {
  height: 30, padding: '0 10px', marginLeft: 'auto',
  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius)', cursor: 'pointer', color: 'var(--text-secondary)',
  display: 'flex', alignItems: 'center',
}
const th: React.CSSProperties = {
  textAlign: 'left' as const, padding: '10px 12px',
  fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
  textTransform: 'uppercase' as const, letterSpacing: '0.03em',
  borderBottom: '1px solid var(--border)',
}
const td: React.CSSProperties = {
  padding: '10px 12px',
  borderBottom: '1px solid rgba(255,255,255,0.03)',
  verticalAlign: 'middle' as const,
}
const btnVer: React.CSSProperties = {
  height: 26, padding: '0 10px', fontSize: 12,
  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius)', color: 'var(--text-secondary)', cursor: 'pointer',
}
