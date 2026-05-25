// src/pages/PropietarioDashboard.tsx
import { useEffect, useState } from 'react'
import api from '../services/api'
import { useTz } from '../store/timezone.store'
import { useAuthStore } from '../store/auth.store'
import {
  Droplets, CreditCard, CheckCircle2, AlertCircle,
  Clock, ChevronLeft, ChevronRight, Building2,
} from 'lucide-react'

const MESES_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Set','Oct','Nov','Dic']
const MESES_FULL  = ['','Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Setiembre','Octubre','Noviembre','Diciembre']
const THIS_YEAR   = new Date().getFullYear()

interface ConsumoMes { mes: number; anio: number; m3: number; monto: number }
interface PagoMes    { mes: number; anio: number; diasRetraso: number; statusPago: string; montoTotal: number; totalPagado: number }

export default function PropietarioDashboard() {
  const { user } = useAuthStore()
  const { fmt } = useTz()
  const [anioConsumo, setAnioConsumo] = useState(THIS_YEAR)
  const [anioPagos,   setAnioPagos]   = useState(THIS_YEAR)
  const [consumos,    setConsumos]     = useState<ConsumoMes[]>([])
  const [pagos,       setPagos]        = useState<PagoMes[]>([])
  const [edificioNombre, setEdificio]  = useState('')
  const [cuotaActual, setCuotaActual]  = useState<any>(null)
  const [loading,     setLoading]      = useState(true)

  const idDepto = user?.idDepartamento

  useEffect(() => {
    if (!idDepto) return
    // Cargar edificio
    if (user?.idEdificio) {
      api.get(`/buildings/${user.idEdificio}`).then(r => setEdificio(r.data?.nombre || '')).catch(() => {})
    }
    // Cargar cuota más reciente
    api.get('/payments/my-fees').then(r => {
      const fees = (r.data || []) as any[]
      // Ordenar: pendientes/vencidos primero, luego por período desc
      const sorted = fees.sort((a: any, b: any) => {
        const aOrd = ['pendiente','vencido','parcial','pendiente_aprobacion'].includes(a.statusPago) ? 0 : 1
        const bOrd = ['pendiente','vencido','parcial','pendiente_aprobacion'].includes(b.statusPago) ? 0 : 1
        if (aOrd !== bOrd) return aOrd - bOrd
        if (parseInt(b.periodoAnio) !== parseInt(a.periodoAnio)) return parseInt(b.periodoAnio) - parseInt(a.periodoAnio)
        return parseInt(b.periodoMes) - parseInt(a.periodoMes)
      })
      if (sorted.length > 0) setCuotaActual(sorted[0])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [idDepto])

  useEffect(() => {
    if (!idDepto) return
    api.get(`/readings/history/${idDepto}`)
      .then(({ data }) => {
        const historial = (data.historial || []) as any[]
        const byAnio = historial
          .filter((h: any) => h.anio === anioConsumo)
          .map((h: any) => ({
            mes:   h.mes,
            anio:  h.anio,
            m3:    parseFloat(h.m3_consumido || 0),
            monto: parseFloat(h.monto_calculado || 0),
          }))
        setConsumos(byAnio)
      })
      .catch(() => {})
  }, [idDepto, anioConsumo])

  useEffect(() => {
    if (!idDepto) return
    // Traer cuotas del año seleccionado
    api.get('/payments/my-fees', { params: { year: anioPagos } })
      .then(({ data }) => {
        const fees = (data || []) as any[]
        const byAnio = fees
          .filter((f: any) => parseInt(f.periodoAnio) === anioPagos)
          .map((f: any) => {
            const venc = f.fechaVencimiento ? new Date(f.fechaVencimiento) : null
            let diasRetraso = 0
            if (venc) {
              if (f.statusPago === 'pagado') {
                // Calcular retraso real: cuándo se pagó vs cuándo vencía
                // Si no tenemos fecha de pago exacta, dejamos 0
                diasRetraso = 0
              } else {
                // Cuota aún no pagada — retraso desde vencimiento hasta hoy
                diasRetraso = Math.max(0, Math.floor((Date.now() - venc.getTime()) / 86400000))
              }
            }
            return {
              mes:         parseInt(f.periodoMes),
              anio:        parseInt(f.periodoAnio),
              diasRetraso,
              statusPago:  f.statusPago,
              montoTotal:  parseFloat(f.montoTotal || 0),
              totalPagado: parseFloat(f.totalPagado || 0),
            }
          })
        setPagos(byAnio)
      })
      .catch(() => {})
  }, [idDepto, anioPagos])

  // Construir arrays de 12 meses
  const gridConsumos = MESES_SHORT.map((_, i) => consumos.find(c => c.mes === i+1) || { mes:i+1, m3:0, monto:0 })
  const gridPagos    = MESES_SHORT.map((_, i) => pagos.find(p => p.mes === i+1)    || null)
  const maxM3        = Math.max(...gridConsumos.map(c => c.m3), 1)
  const maxRetraso   = Math.max(...gridPagos.filter(Boolean).map(p => p!.diasRetraso), 1)

  const estadoPago = cuotaActual?.statusPago === 'pagado'   ? 'aldia'
    : cuotaActual?.statusPago === 'pendiente_aprobacion'    ? 'espera'
    : cuotaActual                                           ? 'pendiente'
    : 'aldia'

  const depto = (user as any)?.nrDepartamento || (user as any)?.idDepartamento?.slice(0,6) || '—'

  return (
    <div style={{ padding:'2rem', maxWidth:1000, margin:'0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom:'1.75rem' }} className="fade-up">
        <div style={{ display:'flex',alignItems:'center',gap:'0.75rem',marginBottom:'0.4rem' }}>
          <div style={{ width:44,height:44,borderRadius:12,background:'var(--accent-dim)',border:'1px solid rgba(245,166,35,0.25)',display:'flex',alignItems:'center',justifyContent:'center' }}>
            <Building2 size={22} color="var(--accent)"/>
          </div>
          <div>
            <h1 style={{ fontFamily:'var(--font-display)',fontSize:'1.6rem',fontWeight:700,letterSpacing:'-0.02em' }}>
              Bienvenido, {user?.email?.split('@')[0]}
            </h1>
            {edificioNombre && <p style={{ color:'var(--text-muted)',fontSize:'0.85rem' }}>{edificioNombre} · Depto {depto}</p>}
          </div>
        </div>
      </div>

      {/* Estado de pago actual */}
      <EstadoPagoCard cuota={cuotaActual} estado={estadoPago} />

      {/* Gráfico consumo m³ */}
      <div style={{ background:'var(--bg-surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',padding:'1.5rem',marginBottom:'1.25rem' }} className="fade-up">
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1.25rem',flexWrap:'wrap',gap:'0.75rem' }}>
          <div>
            <h2 style={{ fontWeight:700,fontSize:'1rem',display:'flex',alignItems:'center',gap:'0.5rem' }}>
              <Droplets size={17} color="var(--blue)"/> Consumo de agua
            </h2>
            <p style={{ fontSize:'0.78rem',color:'var(--text-muted)' }}>m³ por mes · {anioConsumo}</p>
          </div>
          <YearNav value={anioConsumo} onChange={setAnioConsumo} />
        </div>

        {/* Barras */}
        <div style={{ display:'flex',gap:'0.4rem',alignItems:'flex-end',height:160 }}>
          {gridConsumos.map((c, i) => {
            const pct = maxM3 > 0 ? (c.m3 / maxM3) * 100 : 0
            return (
              <div key={i} style={{ flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:'0.3rem' }}>
                <div style={{ position:'relative',width:'100%',height:130,display:'flex',alignItems:'flex-end' }}>
                  {c.m3 > 0 && (
                    <div title={`${MESES_FULL[i+1]}: ${c.m3.toFixed(3)} m³ · S/. ${c.monto.toFixed(2)}`}
                      style={{ width:'100%',height:`${pct}%`,minHeight:4,background:'var(--blue)',borderRadius:'3px 3px 0 0',transition:'height 0.5s',cursor:'default',position:'relative' }}>
                      <div style={{ position:'absolute',bottom:'100%',left:'50%',transform:'translateX(-50%)',background:'var(--bg-surface)',border:'1px solid var(--border)',borderRadius:4,padding:'0.2rem 0.4rem',fontSize:'0.65rem',whiteSpace:'nowrap',color:'var(--blue)',fontWeight:600,opacity:0,transition:'opacity 0.2s',pointerEvents:'none' }}
                        className="bar-tooltip">
                        {c.m3.toFixed(3)} m³
                      </div>
                    </div>
                  )}
                  {c.m3 === 0 && <div style={{ width:'100%',height:3,background:'var(--bg-elevated)',borderRadius:2 }}/>}
                </div>
                <span style={{ fontSize:'0.62rem',color:'var(--text-muted)',fontWeight:500 }}>{MESES_SHORT[i]}</span>
                {c.m3 > 0 && <span style={{ fontSize:'0.6rem',color:'var(--blue)',fontWeight:700 }}>{c.m3.toFixed(1)}</span>}
              </div>
            )
          })}
        </div>

        {/* Totales */}
        <div style={{ display:'flex',gap:'2rem',marginTop:'1rem',paddingTop:'1rem',borderTop:'1px solid var(--border)' }}>
          <div>
            <p style={{ fontSize:'0.7rem',color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.04em' }}>Total año</p>
            <p style={{ fontWeight:700,color:'var(--blue)',fontVariantNumeric:'tabular-nums' }}>{consumos.reduce((s,c)=>s+c.m3,0).toFixed(3)} m³</p>
          </div>
          <div>
            <p style={{ fontSize:'0.7rem',color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.04em' }}>Promedio mensual</p>
            <p style={{ fontWeight:700,color:'var(--text-secondary)',fontVariantNumeric:'tabular-nums' }}>
              {consumos.length > 0 ? (consumos.reduce((s,c)=>s+c.m3,0)/consumos.length).toFixed(3) : '0.000'} m³
            </p>
          </div>
        </div>
      </div>

      {/* Gráfico pagos / días retraso */}
      <div style={{ background:'var(--bg-surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',padding:'1.5rem' }} className="fade-up">
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1.25rem',flexWrap:'wrap',gap:'0.75rem' }}>
          <div>
            <h2 style={{ fontWeight:700,fontSize:'1rem',display:'flex',alignItems:'center',gap:'0.5rem' }}>
              <CreditCard size={17} color="var(--accent)"/> Historial de pagos
            </h2>
            <p style={{ fontSize:'0.78rem',color:'var(--text-muted)' }}>Estado y días de retraso por mes · {anioPagos}</p>
          </div>
          <YearNav value={anioPagos} onChange={setAnioPagos} />
        </div>

        <div style={{ display:'flex',gap:'0.4rem',alignItems:'flex-end',height:160 }}>
          {gridPagos.map((p, i) => {
            if (!p) return (
              <div key={i} style={{ flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:'0.3rem' }}>
                <div style={{ width:'100%',height:130,display:'flex',alignItems:'flex-end' }}>
                  <div style={{ width:'100%',height:3,background:'var(--bg-elevated)',borderRadius:2 }}/>
                </div>
                <span style={{ fontSize:'0.62rem',color:'var(--text-muted)' }}>{MESES_SHORT[i]}</span>
              </div>
            )
            const color = p.statusPago === 'pagado' && p.diasRetraso === 0 ? 'var(--green)'
              : p.diasRetraso > 15 ? '#f87171'
              : p.diasRetraso > 0  ? '#fb923c'
              : 'var(--green)'
            const pct = p.diasRetraso > 0 ? Math.min(100, (p.diasRetraso / Math.max(maxRetraso, 30)) * 100) : 10
            const label = p.statusPago === 'pagado' ? (p.diasRetraso > 0 ? `+${p.diasRetraso}d` : '✓') : p.statusPago === 'pendiente_aprobacion' ? '⏳' : '!'
            return (
              <div key={i} style={{ flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:'0.3rem' }}>
                <div style={{ position:'relative',width:'100%',height:130,display:'flex',alignItems:'flex-end' }}>
                  <div title={`${MESES_FULL[i+1]}: ${p.statusPago}${p.diasRetraso>0?` · ${p.diasRetraso} días de retraso`:''}`}
                    style={{ width:'100%',height:`${pct}%`,minHeight:16,background:color,borderRadius:'3px 3px 0 0',display:'flex',alignItems:'center',justifyContent:'center',transition:'height 0.5s',cursor:'default' }}>
                    <span style={{ fontSize:'0.58rem',color:'#fff',fontWeight:700 }}>{label}</span>
                  </div>
                </div>
                <span style={{ fontSize:'0.62rem',color:'var(--text-muted)',fontWeight:500 }}>{MESES_SHORT[i]}</span>
                {p.diasRetraso > 0 && <span style={{ fontSize:'0.6rem',color:'#f87171',fontWeight:700 }}>{p.diasRetraso}d</span>}
              </div>
            )
          })}
        </div>

        {/* Leyenda */}
        <div style={{ display:'flex',gap:'1.25rem',marginTop:'1rem',paddingTop:'1rem',borderTop:'1px solid var(--border)',flexWrap:'wrap' }}>
          {[['var(--green)','Pago a tiempo'],['#fb923c','Retraso leve (1-15 días)'],['#f87171','Retraso alto (>15 días)']].map(([c,l]) => (
            <div key={l} style={{ display:'flex',alignItems:'center',gap:'0.4rem' }}>
              <div style={{ width:10,height:10,borderRadius:2,background:c }}/>
              <span style={{ fontSize:'0.72rem',color:'var(--text-muted)' }}>{l}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Card estado pago ──────────────────────────────────────────

function EstadoPagoCard({ cuota, estado }: { cuota: any; estado: string }) {
  const { fmt } = useTz()
  if (!cuota) return (
    <div style={{ background:'rgba(62,207,142,0.07)',border:'1px solid rgba(62,207,142,0.2)',borderRadius:'var(--radius-lg)',padding:'1.25rem 1.5rem',marginBottom:'1.25rem',display:'flex',alignItems:'center',gap:'1rem' }} className="fade-up">
      <CheckCircle2 size={32} color="var(--green)"/>
      <div><p style={{ fontWeight:700,fontSize:'1rem',color:'var(--green)' }}>¡Estás al día con tus pagos!</p>
        <p style={{ fontSize:'0.82rem',color:'var(--text-secondary)' }}>No tienes cuotas pendientes.</p></div>
    </div>
  )

  if (estado === 'aldia') return (
    <div style={{ background:'rgba(62,207,142,0.07)',border:'1px solid rgba(62,207,142,0.2)',borderRadius:'var(--radius-lg)',padding:'1.25rem 1.5rem',marginBottom:'1.25rem',display:'flex',alignItems:'center',gap:'1rem' }} className="fade-up">
      <CheckCircle2 size={32} color="var(--green)"/>
      <div><p style={{ fontWeight:700,fontSize:'1rem',color:'var(--green)' }}>¡Estás al día!</p>
        <p style={{ fontSize:'0.82rem',color:'var(--text-secondary)' }}>Última cuota pagada.</p></div>
    </div>
  )

  if (estado === 'espera') return (
    <div style={{ background:'rgba(245,166,35,0.07)',border:'1px solid rgba(245,166,35,0.25)',borderRadius:'var(--radius-lg)',padding:'1.25rem 1.5rem',marginBottom:'1.25rem',display:'flex',alignItems:'center',gap:'1rem' }} className="fade-up">
      <Clock size={32} color="var(--accent)"/>
      <div>
        <p style={{ fontWeight:700,fontSize:'1rem',color:'var(--accent)' }}>Pago enviado — esperando aprobación</p>
        <p style={{ fontSize:'0.82rem',color:'var(--text-secondary)' }}>
          {MESES_FULL[cuota.periodoMes]} {cuota.periodoAnio} · S/. {parseFloat(cuota.montoTotal||0).toFixed(2)}
        </p>
      </div>
    </div>
  )

  const venc  = cuota.fechaVencimiento ? new Date(cuota.fechaVencimiento) : null
  const dias  = venc ? Math.max(0, Math.floor((Date.now()-venc.getTime())/86400000)) : 0
  const color = dias > 15 ? '#f87171' : dias > 0 ? '#fb923c' : 'var(--accent)'

  return (
    <div style={{ background:`${color}0f`,border:`1px solid ${color}35`,borderRadius:'var(--radius-lg)',padding:'1.25rem 1.5rem',marginBottom:'1.25rem',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'1rem' }} className="fade-up">
      <div style={{ display:'flex',alignItems:'center',gap:'1rem' }}>
        <AlertCircle size={32} color={color}/>
        <div>
          <p style={{ fontWeight:700,fontSize:'1rem',color }}>
            {dias > 0 ? `Pago con ${dias} día${dias>1?'s':''} de retraso` : 'Cuota pendiente de pago'}
          </p>
          <p style={{ fontSize:'0.82rem',color:'var(--text-secondary)' }}>
            {MESES_FULL[cuota.periodoMes]} {cuota.periodoAnio} · Vence: {venc ? fmt(venc) : '—'}
          </p>
        </div>
      </div>
      <div style={{ textAlign:'right' }}>
        <p style={{ fontWeight:800,fontSize:'1.4rem',color,fontVariantNumeric:'tabular-nums' }}>
          S/. {parseFloat(cuota.montoTotal||0).toFixed(2)}
        </p>
        <a href="/mis-pagos" style={{ fontSize:'0.78rem',color:'var(--accent)',textDecoration:'none',fontWeight:600 }}>
          Ver y pagar →
        </a>
      </div>
    </div>
  )
}

// ── Navegación de año ─────────────────────────────────────────

function YearNav({ value, onChange }: { value: number; onChange: (y: number) => void }) {
  return (
    <div style={{ display:'flex',alignItems:'center',gap:'0.5rem',background:'var(--bg-elevated)',border:'1px solid var(--border)',borderRadius:'var(--radius)',overflow:'hidden' }}>
      <button onClick={() => onChange(value-1)} style={{ background:'none',border:'none',padding:'0.4rem 0.6rem',cursor:'pointer',color:'var(--text-secondary)',display:'flex',alignItems:'center' }}>
        <ChevronLeft size={15}/>
      </button>
      <span style={{ fontWeight:600,fontSize:'0.9rem',minWidth:40,textAlign:'center',fontVariantNumeric:'tabular-nums' }}>{value}</span>
      <button onClick={() => onChange(value+1)} disabled={value >= THIS_YEAR}
        style={{ background:'none',border:'none',padding:'0.4rem 0.6rem',cursor:value>=THIS_YEAR?'not-allowed':'pointer',color:value>=THIS_YEAR?'var(--text-muted)':'var(--text-secondary)',display:'flex',alignItems:'center' }}>
        <ChevronRight size={15}/>
      </button>
    </div>
  )
}
