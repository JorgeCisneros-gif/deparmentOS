// src/pages/MedicionesPage.tsx
import { useEffect, useState, useCallback } from 'react'
import api from '../services/api'
import { useTz } from '../store/timezone.store'
import toast from 'react-hot-toast'
import {
  Droplets, ChevronLeft, ChevronRight, Loader2,
  RefreshCw, ZoomIn, X, TrendingUp, TrendingDown, Minus,
} from 'lucide-react'
import BuildingSelector from '../components/common/BuildingSelector'

interface Building    { id: string; nombre: string }
interface Department  { id: string; nrDepartamento: string }
interface Medicion {
  anio:            number
  mes:             number
  lectura_anterior: number
  lectura_actual:   number
  m3_consumido:     number
  monto_calculado:  number
  precio_m3:        number
}

const MESES = ['','Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Setiembre','Octubre','Noviembre','Diciembre']

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api/v1','') || ''

export default function MedicionesPage() {
  const [depts, setDepts]             = useState<Department[]>([])
  const [selBuilding, setSelBuilding] = useState('')
  const [selDepto, setSelDepto]       = useState('')
  const [mediciones, setMediciones]   = useState<Medicion[]>([])
  const [loading, setLoading]         = useState(false)
  const { fmt } = useTz()
  const [zoomImg, setZoomImg]         = useState<string | null>(null)
  const [meterImgs, setMeterImgs]     = useState<Record<string, string>>({})

  useEffect(() => {
    if (!selBuilding) return
    api.get('/departments', { params: { buildingId: selBuilding } })
      .then(r => {
        setDepts(r.data)
        if (r.data.length > 0) setSelDepto(r.data[0].id)
      })
  }, [selBuilding])

  useEffect(() => {
    if (selDepto) load()
  }, [selDepto])

  const load = useCallback(async () => {
    if (!selDepto) return
    setLoading(true); setMediciones([])
    try {
      const { data } = await api.get(`/readings/history/${selDepto}`)
      setMediciones(data.historial || [])
    } catch (e: any) {
      if (e?.response?.status !== 404) toast.error('Error cargando mediciones')
    } finally { setLoading(false) }
  }, [selDepto])

  // Cálculo de tendencia entre mediciones
  const getTrend = (idx: number): 'up' | 'down' | 'equal' | null => {
    if (idx >= mediciones.length - 1) return null
    const curr = parseFloat(String(mediciones[idx].m3_consumido))
    const prev = parseFloat(String(mediciones[idx + 1].m3_consumido))
    if (curr > prev * 1.05) return 'up'
    if (curr < prev * 0.95) return 'down'
    return 'equal'
  }

  const totalM3    = mediciones.reduce((s, m) => s + parseFloat(String(m.m3_consumido || 0)), 0)
  const totalMonto = mediciones.reduce((s, m) => s + parseFloat(String(m.monto_calculado || 0)), 0)
  const promedioM3 = mediciones.length > 0 ? totalM3 / mediciones.length : 0
  const maxM3      = mediciones.length > 0 ? Math.max(...mediciones.map(m => parseFloat(String(m.m3_consumido || 0)))) : 0

  return (
    <div style={{ padding:'2rem', maxWidth:1200, margin:'0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom:'1.5rem' }} className="fade-up">
        <h1 style={{ fontFamily:'var(--font-display)',fontSize:'1.8rem',fontWeight:700,letterSpacing:'-0.02em',marginBottom:'0.25rem' }}>
          Historial de Mediciones
        </h1>
        <p style={{ color:'var(--text-secondary)',fontSize:'0.875rem' }}>
          Consulta el historial de lecturas de agua por departamento
        </p>
      </div>

      {/* Controles */}
      <div style={{ display:'flex',alignItems:'flex-end',gap:'1.25rem',marginBottom:'1.5rem',flexWrap:'wrap' }} className="fade-up">
        <div style={{ display:'flex',flexDirection:'column',gap:'0.3rem' }}>
          <label style={s.ctrlLabel}>Edificio</label>
          <BuildingSelector value={selBuilding} onChange={setSelBuilding} label="EDIFICIO" autoSelect />
        </div>
        <div style={{ display:'flex',flexDirection:'column',gap:'0.3rem' }}>
          <label style={s.ctrlLabel}>Departamento</label>
          <select value={selDepto} onChange={e => setSelDepto(e.target.value)} style={s.select}>
            {depts.map(d => <option key={d.id} value={d.id}>Depto {d.nrDepartamento}</option>)}
          </select>
        </div>
        <button onClick={load} style={s.btnRefresh}><RefreshCw size={15} /></button>
      </div>

      {/* Stats */}
      {mediciones.length > 0 && (
        <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:'0.75rem',marginBottom:'1.5rem' }} className="fade-up">
          {[
            { label:'Períodos registrados', value: mediciones.length,            color:'var(--blue)',    suffix:'' },
            { label:'Total consumido',       value: totalM3.toFixed(3),           color:'var(--accent)', suffix:' m³' },
            { label:'Promedio mensual',       value: promedioM3.toFixed(3),        color:'var(--green)',  suffix:' m³' },
            { label:'Pico máximo',            value: maxM3.toFixed(3),             color:'#f87171',      suffix:' m³' },
            { label:'Total facturado',        value: `S/. ${totalMonto.toFixed(2)}`,color:'var(--accent)',suffix:'' },
          ].map(stat => (
            <div key={stat.label} style={{ background:'var(--bg-surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',padding:'0.9rem 1rem',borderTop:`2px solid ${stat.color}` }}>
              <p style={{ fontSize:'0.68rem',color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.04em',marginBottom:'0.3rem' }}>{stat.label}</p>
              <p style={{ fontWeight:800,fontSize:'1.1rem',color:stat.color,fontVariantNumeric:'tabular-nums' }}>{stat.value}{stat.suffix}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabla */}
      {loading ? (
        <div style={{ display:'flex',justifyContent:'center',padding:'4rem' }}>
          <Loader2 size={26} color="var(--accent)" style={{ animation:'spin 0.8s linear infinite' }} />
        </div>
      ) : mediciones.length === 0 ? (
        <div style={{ textAlign:'center',padding:'4rem',background:'var(--bg-surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',color:'var(--text-muted)' }}>
          <Droplets size={40} style={{ marginBottom:'0.75rem',opacity:0.4 }} />
          <p>No hay mediciones registradas para este departamento</p>
        </div>
      ) : (
        <div style={{ background:'var(--bg-surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',overflow:'auto' }} className="fade-up">
          <table style={{ width:'100%',borderCollapse:'collapse',fontSize:'0.875rem' }}>
            <thead>
              <tr>
                {['Período','Lectura anterior','Lectura actual','Consumo m³','Precio/m³','Monto','Tendencia','Imagen'].map(h => (
                  <th key={h} style={{ textAlign:'left',padding:'0.75rem 1rem',color:'var(--text-muted)',fontSize:'0.7rem',fontWeight:600,letterSpacing:'0.05em',textTransform:'uppercase' as const,borderBottom:'1px solid var(--border)',background:'var(--bg-elevated)',whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {mediciones.map((m, i) => {
                const trend   = getTrend(i)
                const m3      = parseFloat(String(m.m3_consumido || 0))
                const monto   = parseFloat(String(m.monto_calculado || 0))
                const precio  = parseFloat(String(m.precio_m3 || 0))
                const la      = parseFloat(String(m.lectura_anterior || 0))
                const lact    = parseFloat(String(m.lectura_actual || 0))
                // Barra de consumo relativa al máximo
                const barPct  = maxM3 > 0 ? (m3 / maxM3) * 100 : 0

                return (
                  <tr key={i} style={{ ...(i%2!==0?{background:'rgba(255,255,255,0.02)'}:{}) }}>
                    {/* Período */}
                    <td style={s.td}>
                      <div style={{ fontWeight:600 }}>{MESES[m.mes]} {m.anio}</div>
                    </td>

                    {/* Lectura anterior */}
                    <td style={{ ...s.td, fontFamily:'monospace', color:'var(--text-muted)' }}>
                      {la.toFixed(3)}
                    </td>

                    {/* Lectura actual */}
                    <td style={{ ...s.td, fontFamily:'monospace', fontWeight:600 }}>
                      {lact.toFixed(3)}
                    </td>

                    {/* Consumo con barra */}
                    <td style={s.td}>
                      <div style={{ display:'flex',alignItems:'center',gap:'0.6rem' }}>
                        <span style={{ fontFamily:'monospace',fontWeight:700,color:'var(--blue)',fontVariantNumeric:'tabular-nums',minWidth:60 }}>
                          {m3.toFixed(3)} m³
                        </span>
                        <div style={{ flex:1,height:6,background:'var(--bg-elevated)',borderRadius:3,overflow:'hidden',minWidth:60 }}>
                          <div style={{ width:`${barPct}%`,height:'100%',background:'var(--blue)',borderRadius:3,transition:'width 0.4s' }} />
                        </div>
                      </div>
                    </td>

                    {/* Precio/m³ */}
                    <td style={{ ...s.td, color:'var(--text-muted)', fontFamily:'monospace', fontSize:'0.8rem' }}>
                      S/. {precio.toFixed(4)}
                    </td>

                    {/* Monto */}
                    <td style={{ ...s.td, fontWeight:700, color:'var(--accent)', fontVariantNumeric:'tabular-nums' }}>
                      S/. {monto.toFixed(2)}
                    </td>

                    {/* Tendencia */}
                    <td style={s.td}>
                      {trend === 'up'    && <span style={{ display:'flex',alignItems:'center',gap:'0.25rem',color:'#f87171',fontSize:'0.78rem',fontWeight:600 }}><TrendingUp  size={14}/> Sube</span>}
                      {trend === 'down'  && <span style={{ display:'flex',alignItems:'center',gap:'0.25rem',color:'var(--green)',fontSize:'0.78rem',fontWeight:600 }}><TrendingDown size={14}/> Baja</span>}
                      {trend === 'equal' && <span style={{ display:'flex',alignItems:'center',gap:'0.25rem',color:'var(--text-muted)',fontSize:'0.78rem' }}><Minus size={14}/> Estable</span>}
                      {trend === null    && <span style={{ color:'var(--text-muted)',fontSize:'0.75rem' }}>—</span>}
                    </td>

                    {/* Imagen */}
                    <td style={s.td}>
                      <MeterImageCell deptoId={selDepto} periodoMes={m.mes} periodoAnio={m.anio} onZoom={setZoomImg} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Zoom imagen */}
      {zoomImg && (
        <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.9)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:2000,padding:'1rem' }}
          onClick={() => setZoomImg(null)}>
          <button style={{ position:'absolute',top:'1rem',right:'1rem',background:'rgba(255,255,255,0.15)',border:'none',borderRadius:'50%',width:40,height:40,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'#fff' }}
            onClick={() => setZoomImg(null)}><X size={20}/></button>
          <img src={zoomImg} alt="medidor" style={{ maxWidth:'90vw',maxHeight:'90vh',borderRadius:8,objectFit:'contain',boxShadow:'0 20px 60px rgba(0,0,0,0.5)' }}
            onClick={e => e.stopPropagation()} />
        </div>
      )}
    </div>
  )
}

// ── Celda con imagen del medidor para cada período ────────────

function MeterImageCell({ deptoId, periodoMes, periodoAnio, onZoom }: {
  deptoId: string; periodoMes: number; periodoAnio: number; onZoom: (url: string) => void
}) {
  const [imgUrl, setImgUrl]   = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true); setImgUrl(null)
    api.get('/readings', { params: { deptId: deptoId } })
      .then(({ data }) => {
        const reading = data.find((r: any) => {
          const recibo = r.recibo
          return recibo &&
            parseInt(recibo.periodoMes)  === periodoMes &&
            parseInt(recibo.periodoAnio) === periodoAnio
        })
        // ✅ Usar imagenFilename directamente — ya viene en la respuesta
        if (reading?.imagenFilename) {
          setImgUrl(`/uploads/meters/${reading.imagenFilename}`)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [deptoId, periodoMes, periodoAnio])

  if (loading) return (
    <div style={{ width:44,height:44,background:'var(--bg-elevated)',borderRadius:6,display:'flex',alignItems:'center',justifyContent:'center' }}>
      <Loader2 size={12} color="var(--text-muted)" style={{ animation:'spin 0.8s linear infinite' }}/>
    </div>
  )
  if (!imgUrl) return <span style={{ color:'var(--text-muted)',fontSize:'0.75rem' }}>—</span>

  return (
    <button onClick={() => onZoom(imgUrl)}
      style={{ position:'relative',width:44,height:44,borderRadius:6,overflow:'hidden',border:'1px solid var(--border)',cursor:'pointer',background:'var(--bg-elevated)',display:'flex',alignItems:'center',justifyContent:'center',padding:0 }}>
      <img src={imgUrl} alt="medidor" style={{ width:'100%',height:'100%',objectFit:'cover' }}
        onError={e => { (e.target as HTMLImageElement).style.display='none' }} />
      <div style={{ position:'absolute',inset:0,background:'rgba(0,0,0,0)',display:'flex',alignItems:'center',justifyContent:'center',transition:'background 0.15s' }}
        onMouseEnter={e => (e.currentTarget.style.background='rgba(0,0,0,0.4)')}
        onMouseLeave={e => (e.currentTarget.style.background='rgba(0,0,0,0)')}>
        <ZoomIn size={13} color="#fff" style={{ opacity:0.8 }} />
      </div>
    </button>
  )
}

const s: Record<string, React.CSSProperties> = {
  ctrlLabel:  { fontSize:'0.72rem',fontWeight:600,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.05em' },
  select:     { background:'var(--bg-elevated)',border:'1px solid var(--border)',color:'var(--text-primary)',borderRadius:'var(--radius)',padding:'0.5rem 0.85rem',fontSize:'0.875rem',fontFamily:'var(--font-body)',minWidth:200 },
  btnRefresh: { background:'var(--bg-elevated)',border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:'0.5rem 0.7rem',cursor:'pointer',color:'var(--text-secondary)',display:'flex',alignItems:'center' },
  td:         { padding:'0.75rem 1rem',borderBottom:'1px solid rgba(255,255,255,0.03)',verticalAlign:'middle' },
}
