// src/pages/MedicionesPage.tsx
import { useEffect, useState, useCallback } from 'react'
import api from '../services/api'
import toast from 'react-hot-toast'
import {
  Droplets, Loader2, RefreshCw, TrendingUp, TrendingDown,
  Equal, AlertTriangle, CheckCircle2, Cloud,
} from 'lucide-react'
import BuildingSelector from '../components/common/BuildingSelector'
import KpiCard from '../components/reports/KpiCard'
import ExportButtons from '../components/reports/ExportButtons'
import PeriodDetailDrawer from '../components/reports/PeriodDetailDrawer'

interface Department { id: string; nrDepartamento: string }

interface MedicionItem {
  anio: number
  mes:  number
  lecturaAnterior:     number
  lecturaActual:       number
  m3Consumido:         number
  montoCalculado:      number
  precioM3:            number
  variacionVsPromedio: number | null
  esAnomalia:          boolean
  meterImageId:        string | null
  imagenFilename:      string | null
  storageProvider:     'local' | 'google_drive' | null
  imagenExternalUrl:   string | null
}

interface Analytics {
  ultimoConsumoM3:     number | null
  ultimoPeriodo:       { mes: number; anio: number } | null
  variacionVsPromedio: number | null
  tendencia: { valores: number[]; direccion: 'asc' | 'desc' | 'estable' | null }
  mayorVariacion: { porcentaje: number; periodo: { mes: number; anio: number } } | null
  estadoActual:        'normal' | 'sobre_promedio' | 'anomalo' | 'sin_datos'
  promedioHistoricoM3: number | null
  totalPeriodos:       number
}

const MESES = ['','Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Setiembre','Octubre','Noviembre','Diciembre']

export default function MedicionesPage() {
  const [depts, setDepts]             = useState<Department[]>([])
  const [edificioNombre, setEdNombre] = useState('')
  const [selBuilding, setSelBuilding] = useState('')
  const [selDepto, setSelDepto]       = useState('')
  const [maxMeses, setMaxMeses]       = useState(12)
  const [historial, setHistorial]     = useState<MedicionItem[]>([])
  const [analytics, setAnalytics]     = useState<Analytics | null>(null)
  const [loading, setLoading]         = useState(false)
  const [detalle, setDetalle]         = useState<MedicionItem | null>(null)

  useEffect(() => {
    if (!selBuilding) return
    api.get('/departments', { params: { buildingId: selBuilding } })
      .then(r => {
        setDepts(r.data)
        if (r.data.length > 0) setSelDepto(r.data[0].id)
      })
    api.get(`/buildings/${selBuilding}`).then(r => setEdNombre(r.data?.nombre || ''))
      .catch(() => {})
  }, [selBuilding])

  useEffect(() => {
    if (selDepto) load()
  }, [selDepto, maxMeses])

  const load = useCallback(async () => {
    if (!selDepto) return
    setLoading(true)
    setHistorial([])
    setAnalytics(null)
    try {
      const { data } = await api.get('/reports/mediciones/analytics', {
        params: { deptId: selDepto, servicio: 'agua', maxMeses },
      })
      setHistorial(data.historial || [])
      setAnalytics(data.analytics)
    } catch (e: any) {
      if (e?.response?.status !== 404) toast.error('Error cargando mediciones')
    } finally { setLoading(false) }
  }, [selDepto, maxMeses])

  const deptoActual = depts.find(d => d.id === selDepto)
  const tieneData   = historial.length > 0

  return (
    <div style={{ padding: '2rem', maxWidth: 1200, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '0.25rem' }} className="fade-up">
        <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>
          Historial de mediciones
        </h1>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          {edificioNombre && `${edificioNombre} · `}
          {deptoActual && `Depto ${deptoActual.nrDepartamento} · `}
          Últimos {maxMeses} meses
        </span>
      </div>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: 4, marginBottom: '1.25rem' }}>
        Análisis del comportamiento de consumo para auditoría y atención a reclamos.
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
        <span style={lbl}>Depto</span>
        <select value={selDepto} onChange={e => setSelDepto(e.target.value)} style={sel}>
          {depts.map(d => <option key={d.id} value={d.id}>Depto {d.nrDepartamento}</option>)}
        </select>
        <span style={lbl}>Período</span>
        <select value={maxMeses} onChange={e => setMaxMeses(parseInt(e.target.value))} style={sel}>
          <option value={6}>Últimos 6 meses</option>
          <option value={12}>Últimos 12 meses</option>
          <option value={24}>Últimos 24 meses</option>
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
            label="Último consumo"
            value={analytics.ultimoConsumoM3 !== null
              ? `${analytics.ultimoConsumoM3.toFixed(3)} m³`
              : '—'}
            hint={analytics.variacionVsPromedio !== null
              ? `${analytics.variacionVsPromedio >= 0 ? '+' : ''}${analytics.variacionVsPromedio}% vs promedio`
              : null}
            hintColor={getHintColor(analytics.variacionVsPromedio)}
            icon={analytics.variacionVsPromedio !== null
              ? (analytics.variacionVsPromedio >= 0 ? <TrendingUp size={11}/> : <TrendingDown size={11}/>)
              : null}
          />
          <KpiCard
            label="Tendencia 6 meses"
            value={<TendenciaSparkline valores={analytics.tendencia.valores} />}
            hint={analytics.tendencia.direccion === 'asc' ? 'Ascendente'
                : analytics.tendencia.direccion === 'desc' ? 'Descendente'
                : analytics.tendencia.direccion === 'estable' ? 'Estable'
                : 'Sin datos'}
          />
          <KpiCard
            label="Mayor variación"
            value={analytics.mayorVariacion
              ? `${analytics.mayorVariacion.porcentaje >= 0 ? '+' : ''}${analytics.mayorVariacion.porcentaje}%`
              : '—'}
            hint={analytics.mayorVariacion
              ? `${MESES[analytics.mayorVariacion.periodo.mes]} ${analytics.mayorVariacion.periodo.anio}`
              : null}
            hintColor={analytics.mayorVariacion && Math.abs(analytics.mayorVariacion.porcentaje) > 30 ? 'danger' : 'muted'}
          />
          <KpiCard
            label="Estado actual"
            value={
              <span style={{
                color: estadoColor(analytics.estadoActual),
                fontSize: 16, display: 'inline-flex', alignItems: 'center', gap: 6,
              }}>
                {analytics.estadoActual === 'normal' && <CheckCircle2 size={15}/>}
                {analytics.estadoActual === 'sobre_promedio' && <AlertTriangle size={15}/>}
                {analytics.estadoActual === 'anomalo' && <AlertTriangle size={15}/>}
                {estadoLabel(analytics.estadoActual)}
              </span>
            }
            hint="Vs promedio del depto"
          />
        </div>
      )}

      {/* Acciones de export */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.75rem',
      }}>
        <ExportButtons
          tipo="mediciones"
          disabled={!tieneData}
          syncParams={{
            deptId: selDepto,
            servicio: 'agua',
            maxMeses,
            edificio: edificioNombre,
            depto: deptoActual?.nrDepartamento || '',
          }}
        />
        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>
          {analytics ? `${analytics.totalPeriodos} períodos` : ''}
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
          <Droplets size={36} style={{ marginBottom: 8, opacity: 0.4 }} />
          <p style={{ margin: 0 }}>No hay mediciones para este departamento</p>
        </div>
      ) : (
        <div style={{
          background: 'var(--bg-surface)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)', overflow: 'auto',
        }} className="fade-up">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--bg-elevated)' }}>
                <th style={th}>Período</th>
                <th style={{...th, textAlign: 'right'}}>Lect. anterior</th>
                <th style={{...th, textAlign: 'right'}}>Lect. actual</th>
                <th style={{...th, textAlign: 'right'}}>Consumo</th>
                <th style={th}>vs promedio</th>
                <th style={{...th, textAlign: 'right'}}>Tarifa</th>
                <th style={{...th, textAlign: 'right'}}>Monto</th>
                <th style={{...th, textAlign: 'right'}}></th>
              </tr>
            </thead>
            <tbody>
              {historial.map((m, i) => (
                <tr key={i} style={i % 2 === 1 ? { background: 'rgba(255,255,255,0.02)' } : {}}>
                  <td style={td}>
                    <strong style={{ fontWeight: 600 }}>{MESES[m.mes]} {m.anio}</strong>
                    {m.esAnomalia && (
                      <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 3 }}>
                        <AlertTriangle size={11}/> Alta variación
                      </div>
                    )}
                  </td>
                  <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                    {m.lecturaAnterior.toFixed(3)}
                  </td>
                  <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>
                    {m.lecturaActual.toFixed(3)}
                  </td>
                  <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace' }}>
                    <strong style={{ color: m.esAnomalia ? 'var(--red)' : 'var(--accent)' }}>
                      {m.m3Consumido.toFixed(3)} m³
                    </strong>
                  </td>
                  <td style={td}>
                    <VariacionChip valor={m.variacionVsPromedio} />
                  </td>
                  <td style={{ ...td, textAlign: 'right', fontFamily: 'monospace', color: 'var(--text-secondary)', fontSize: 12 }}>
                    S/. {m.precioM3.toFixed(4)}
                  </td>
                  <td style={{ ...td, textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                    S/. {m.montoCalculado.toFixed(2)}
                  </td>
                  <td style={{ ...td, textAlign: 'right' }}>
                    <button onClick={() => setDetalle(m)} style={btnVer}>Ver</button>
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
        title={detalle ? `${MESES[detalle.mes]} ${detalle.anio}` : ''}
        subtitle={deptoActual ? `Depto ${deptoActual.nrDepartamento} · ${edificioNombre}` : ''}
        onClose={() => setDetalle(null)}
      >
        {detalle && <DetalleMedicion item={detalle} />}
      </PeriodDetailDrawer>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
//  Subcomponentes
// ════════════════════════════════════════════════════════════════

function VariacionChip({ valor }: { valor: number | null }) {
  if (valor === null) return <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>

  const abs = Math.abs(valor)
  const color = abs > 30 ? 'danger' : abs > 15 ? 'warning' : 'muted'
  const bg = color === 'danger' ? 'rgba(239,68,68,0.15)'
           : color === 'warning' ? 'rgba(245,185,69,0.15)'
           : 'var(--bg-elevated)'
  const fg = color === 'danger' ? 'var(--red)'
           : color === 'warning' ? 'var(--yellow, #f5b945)'
           : 'var(--text-secondary)'

  const Icon = valor > 5 ? TrendingUp : valor < -5 ? TrendingDown : Equal

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', fontSize: 11, fontWeight: 600,
      borderRadius: 'var(--radius)',
      background: bg, color: fg,
    }}>
      <Icon size={11}/>
      {valor >= 0 ? '+' : ''}{valor}%
    </span>
  )
}

function TendenciaSparkline({ valores }: { valores: number[] }) {
  if (!valores || valores.length < 2) {
    return <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>—</span>
  }
  const max = Math.max(...valores, 0.001)
  const min = Math.min(...valores)
  const range = max - min || 1
  const w = 100, h = 28
  const points = valores.map((v, i) => {
    const x = (i / (valores.length - 1)) * w
    const y = h - ((v - min) / range) * (h - 4) - 2
    return `${x},${y}`
  }).join(' ')

  const ultimoX = w
  const ultimoY = h - ((valores[valores.length - 1] - min) / range) * (h - 4) - 2

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: h, marginTop: 2 }} preserveAspectRatio="none">
      <polyline points={points} fill="none" stroke="var(--accent)" strokeWidth="1.5" />
      <circle cx={ultimoX} cy={ultimoY} r="2.2" fill="var(--accent)" />
    </svg>
  )
}

function DetalleMedicion({ item }: { item: MedicionItem }) {
  return (
    <div>
      {item.esAnomalia && (
        <div style={{
          background: 'rgba(245,185,69,0.1)',
          border: '1px solid rgba(245,185,69,0.3)',
          borderRadius: 'var(--radius)',
          padding: '10px 12px', marginBottom: 14,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <AlertTriangle size={18} color="var(--yellow, #f5b945)" />
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>
            Este período tuvo una variación de {item.variacionVsPromedio! >= 0 ? '+' : ''}{item.variacionVsPromedio}% vs el promedio del depto. Posible motivo de reclamo.
          </p>
        </div>
      )}

      <table style={{ width: '100%', fontSize: 13, marginBottom: 16 }}>
        <tbody>
          <Row label="Lectura anterior" value={`${item.lecturaAnterior.toFixed(3)} m³`} />
          <Row label="Lectura actual"   value={`${item.lecturaActual.toFixed(3)} m³`} bold />
          <Row label="Consumo"          value={`${item.m3Consumido.toFixed(3)} m³`} bold />
          <Row label="Tarifa aplicada"  value={`S/. ${item.precioM3.toFixed(4)} / m³`} />
          <tr style={{ borderTop: '1px solid var(--border)' }}>
            <td style={{ padding: '10px 0 6px', fontWeight: 600 }}>Monto facturado</td>
            <td style={{ padding: '10px 0 6px', textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
              S/. {item.montoCalculado.toFixed(2)}
            </td>
          </tr>
        </tbody>
      </table>

      <p style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 6px' }}>
        Foto del medidor
      </p>
      {item.meterImageId ? (
        <ImagenMedidor meterImageId={item.meterImageId} isInDrive={item.storageProvider === 'google_drive'} />
      ) : (
        <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>Sin foto registrada</p>
      )}
    </div>
  )
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <tr>
      <td style={{ padding: '5px 0', color: 'var(--text-secondary)' }}>{label}</td>
      <td style={{
        padding: '5px 0', textAlign: 'right', fontVariantNumeric: 'tabular-nums',
        fontWeight: bold ? 600 : 400,
      }}>{value}</td>
    </tr>
  )
}

function ImagenMedidor({ meterImageId, isInDrive }: { meterImageId: string; isInDrive: boolean }) {
  const [src, setSrc] = useState<string | null>(null)
  const [err, setErr] = useState(false)
  const [zoom, setZoom] = useState(false)

  useEffect(() => {
    let revokeUrl: string | null = null
    let cancelled = false
    api.get(`/readings/meter-image/${meterImageId}/content`, { responseType: 'blob' })
      .then(({ data }) => {
        if (cancelled) return
        const url = URL.createObjectURL(data as Blob)
        revokeUrl = url
        setSrc(url)
      })
      .catch(() => !cancelled && setErr(true))
    return () => {
      cancelled = true
      if (revokeUrl) URL.revokeObjectURL(revokeUrl)
    }
  }, [meterImageId])

  if (err) return <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Imagen no disponible</p>

  return (
    <>
      <div style={{
        background: 'var(--bg-elevated)', borderRadius: 'var(--radius)',
        padding: 8, display: 'flex', gap: 12, alignItems: 'center',
      }}>
        <div style={{
          width: 88, height: 88, borderRadius: 'var(--radius)',
          background: 'var(--bg-surface)', border: '1px solid var(--border)',
          overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: src ? 'pointer' : 'default',
        }} onClick={() => src && setZoom(true)}>
          {src ? (
            <img src={src} alt="medidor" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <Loader2 size={20} style={{ animation: 'spin 0.8s linear infinite' }} />
          )}
        </div>
        <div>
          <p style={{ fontSize: 12, margin: 0, color: 'var(--text-muted)' }}>
            {isInDrive ? (
              <><Cloud size={11} style={{ verticalAlign: -2 }} /> Google Drive</>
            ) : 'Servidor local'}
          </p>
          <button onClick={() => src && setZoom(true)} disabled={!src} style={{
            marginTop: 6, height: 28, padding: '0 12px', fontSize: 12,
            background: 'var(--bg-surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', color: 'var(--text-secondary)',
            cursor: src ? 'pointer' : 'not-allowed',
          }}>Ver completa</button>
        </div>
      </div>

      {zoom && src && (
        <div onClick={() => setZoom(false)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 2500, padding: '1rem',
        }}>
          <img src={src} alt="medidor" style={{
            maxWidth: '90vw', maxHeight: '90vh', borderRadius: 8, objectFit: 'contain',
          }} onClick={e => e.stopPropagation()} />
        </div>
      )}
    </>
  )
}

// ════════════════════════════════════════════════════════════════
//  Helpers
// ════════════════════════════════════════════════════════════════

function getHintColor(variacion: number | null): 'success' | 'warning' | 'danger' | 'muted' {
  if (variacion === null) return 'muted'
  const abs = Math.abs(variacion)
  if (abs > 30) return 'danger'
  if (abs > 15) return 'warning'
  return 'muted'
}

function estadoColor(estado: string): string {
  if (estado === 'normal')         return 'var(--green)'
  if (estado === 'sobre_promedio') return 'var(--yellow, #f5b945)'
  if (estado === 'anomalo')        return 'var(--red)'
  return 'var(--text-muted)'
}

function estadoLabel(estado: string): string {
  if (estado === 'normal')         return 'Normal'
  if (estado === 'sobre_promedio') return 'Sobre el promedio'
  if (estado === 'anomalo')        return 'Anómalo'
  return 'Sin datos'
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
