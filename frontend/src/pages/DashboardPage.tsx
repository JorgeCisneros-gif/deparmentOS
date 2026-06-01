import { useEffect, useState } from 'react'
import { useAuthStore } from '../store/auth.store'
import api from '../services/api'
import { useTz } from '../store/timezone.store'
import {
  PieChart, Pie, Cell, Tooltip as ReTooltip, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import {
  Droplets, Zap, Wifi, Loader2, TrendingUp, AlertCircle,
  ChevronLeft, ChevronRight,
} from 'lucide-react'
import BuildingSelector from '../components/common/BuildingSelector'

const MESES = ['','Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Set','Oct','Nov','Dic']

const PIE_COLORS = [
  '#4a9eff','#3ecf8e','#f5a623','#f16063','#a78bfa',
  '#fb923c','#34d399','#60a5fa','#f472b6','#facc15',
  '#94a3b8','#2dd4bf',
]

function navMesDate(mes: number, anio: number, delta: number) {
  let m = mes + delta, a = anio
  if (m > 12) { m = 1; a++ }
  if (m < 1)  { m = 12; a-- }
  return { mes: m, anio: a }
}

function num(v: any, fallback = 0): number {
  const n = parseFloat(v)
  return isNaN(n) ? fallback : n
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background:'var(--bg-elevated)',border:'1px solid var(--border)',borderRadius:8,padding:'0.6rem 0.9rem',fontSize:'0.82rem' }}>
      <p style={{ color:'var(--text-secondary)',marginBottom:4 }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color:p.color,fontWeight:600 }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(1) : p.value}
        </p>
      ))}
    </div>
  )
}

const PieTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  if (!d) return null
  // compatibilidad: campo puede ser consumo (nuevo) o m3 (viejo)
  const valor = d.consumo ?? d.m3 ?? 0
  const pct   = d.pct ?? 0
  return (
    <div style={{ background:'var(--bg-elevated)',border:'1px solid var(--border)',borderRadius:8,padding:'0.6rem 0.9rem',fontSize:'0.82rem' }}>
      <p style={{ fontWeight:700,marginBottom:2 }}>Depto {d.depto}</p>
      <p style={{ color:'var(--blue)' }}>{(typeof valor === 'number' ? valor : 0).toFixed(3)}</p>
      <p style={{ color:'var(--text-secondary)' }}>{(typeof pct === 'number' ? pct : 0).toFixed(1)}% del total</p>
    </div>
  )
}

function StatCard({ icon, label, value, unit, color, trend }: any) {
  return (
    <div style={{ background:'var(--bg-surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',padding:'1.25rem',borderTop:`2px solid ${color}` }} className="fade-up">
      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'0.75rem' }}>
        <div style={{ width:36,height:36,borderRadius:8,background:`${color}18`,border:`1px solid ${color}30`,display:'flex',alignItems:'center',justifyContent:'center' }}>{icon}</div>
        {trend !== undefined && (
          <span style={{ fontSize:'0.75rem',color:trend>=0?'var(--green)':'var(--red)' }}>
            {trend>=0?'↑':'↓'} {Math.abs(trend).toFixed(1)}%
          </span>
        )}
      </div>
      <div style={{ fontFamily:'var(--font-display)',fontSize:'1.6rem',fontWeight:700,letterSpacing:'-0.02em',marginBottom:'0.2rem' }}>{value}</div>
      <div style={{ fontSize:'0.8rem',color:'var(--text-secondary)',fontWeight:500 }}>{label}</div>
      {unit && <div style={{ fontSize:'0.75rem',color:'var(--text-muted)',marginTop:'0.2rem' }}>{unit}</div>}
    </div>
  )
}

export default function DashboardPage() {
  const { fmt } = useTz()
  const { user, isSupervisor, isAdministrador, isGestion } = useAuthStore()
  // Dashboard de edificio: supervisor + administrador + gestión
  const supervisor = isSupervisor() || isAdministrador() || isGestion()

  // Para supervisor: loading=false al inicio para que BuildingSelector se monte
  // y pueda llamar a onChange → selectedBuilding → loadSupervisorData.
  // Para propietario: loading=true hasta que loadResidentData termine.
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [selectedBuilding, setSelectedBuilding] = useState('')
  const [mes, setMes]   = useState(new Date().getMonth() + 1)
  const [anio, setAnio] = useState(new Date().getFullYear())
  const [summary, setSummary] = useState<any>(null)
  const [history, setHistory] = useState<any[]>([])
  const [fees, setFees]       = useState<any[]>([])

  // El BuildingSelector con autoSelect setea selectedBuilding al cargar.
  // Para propietarios cargamos los datos directamente.
  useEffect(() => {
    if (!supervisor) loadResidentData()
  }, [supervisor])

  useEffect(() => {
    if (supervisor && selectedBuilding) loadSupervisorData()
  }, [supervisor, selectedBuilding, mes, anio])

  const loadSupervisorData = async () => {
    setLoading(true); setError('')
    try {
      const { data } = await api.get('/payments/period-summary', {
        params: { buildingId: selectedBuilding, month: mes, year: anio },
      })
      setSummary(data)
    } catch { setError('No se pudieron cargar los datos del edificio') }
    finally { setLoading(false) }
  }

  const loadResidentData = async () => {
    setLoading(true); setError('')
    try {
      const deptId = user?.idDepartamento
      if (!deptId) { setLoading(false); return }
      const [histRes, feesRes] = await Promise.all([
        api.get(`/readings/history/${deptId}`),
        api.get('/fees', { params: { deptId } }),
      ])
      const hist = histRes.data?.historial || histRes.data || []
      setHistory(hist.slice(0, 6).reverse())
      setFees(feesRes.data?.slice(0, 3) || [])
    } catch { setError('No se pudieron cargar los datos') }
    finally { setLoading(false) }
  }

  const goMes = (delta: number) => {
    const { mes: m, anio: a } = navMesDate(mes, anio, delta)
    setMes(m); setAnio(a)
  }

  // ── Datos para gráfica m³ por depto ──────────────────────
  // Agrupar consumos por servicio (dinámico — un gráfico por servicio con medición)
  const svcMedicionData = (() => {
    if (!summary?.departamentos || !summary?.serviciosEdificio) return []
    const svcs = (summary.serviciosEdificio || []).filter((s: any) =>
      ['por_consumo_m3','por_consumo_ajustado'].includes(s.modoCalculo) && s.activo
    )
    return svcs.map((svc: any) => {
      const items = summary.departamentos
        .map((d: any) => {
          // Buscar medición de este servicio específico
          const med = d.medicionPorServicio?.[svc.id] || null
          const consumo = med ? (num(med.m3Consumido ?? med.consumo ?? 0)) : 0
          return { depto: d.depto, consumo: consumo || 0 }
        })
        .filter((i: any) => i.consumo > 0)
      const totalConsumo = items.reduce((s: number, i: any) => s + i.consumo, 0)
      return {
        svc,
        items: items.map((i: any, idx: number) => ({
          ...i,
          consumo: i.consumo || 0,
          pct:     totalConsumo > 0 ? ((i.consumo || 0) / totalConsumo) * 100 : 0,
          fill:    PIE_COLORS[idx % PIE_COLORS.length],
        })),
        totalConsumo: totalConsumo || 0,
      }
    }).filter((g: any) => g.items.length > 0)
  })()

  // Compatibilidad — primer servicio de medición (para fallback)
  const m3Data = svcMedicionData[0]?.items || []
  const totalM3Medido = svcMedicionData[0]?.totalConsumo || 0

  // ── Datos para gráfica demora de pago ────────────────────
  const delayData = (() => {
    if (!summary?.departamentos) return []
    const items = summary.departamentos
      .filter((d: any) => d.fechaMensajeEnviado && d.pagos?.length > 0)
      .map((d: any) => {
        const fechaEnvio = new Date(d.fechaMensajeEnviado)
        const primerPago = d.pagos
          .filter((p: any) => p.fechaPago)
          .sort((a: any, b: any) => new Date(a.fechaPago).getTime() - new Date(b.fechaPago).getTime())[0]
        if (!primerPago?.fechaPago) return null
        const dias = Math.max(0, Math.round(
          (new Date(primerPago.fechaPago).getTime() - fechaEnvio.getTime()) / (1000 * 60 * 60 * 24)
        ))
        const propietario: string = d.propietario || `Depto ${d.depto}`
        const nombreCorto = propietario.length > 20 ? propietario.slice(0, 19) + '\u2026' : propietario
        return { depto: d.depto, propietario, nombreCorto, dias, status: d.statusPago }
      })
      .filter(Boolean)
      .sort((a: any, b: any) => b.dias - a.dias)  // descendente: peor pagador arriba

    const maxDias = items.length > 0 ? items[0].dias : 0
    return items.map((item: any) => ({ ...item, esPeor: item.dias === maxDias && maxDias > 0 }))
  })()

  const avgDelay = delayData.length
    ? (delayData.reduce((s: number, d: any) => s + d.dias, 0) / delayData.length).toFixed(1)
    : null
  const peorPagador = delayData.find((d: any) => d.esPeor)

  // ── Derivados residente ───────────────────────────────────
  const chartData = history.map((h: any) => ({
    mes: MESES[parseInt(h.mes || h.periodoMes || 0)],
    m3:  num(h.m3_consumido), monto: num(h.monto_calculado),
  }))
  const lastFee       = fees[0]
  const totalM3Res    = history.reduce((s: number, h: any) => s + num(h.m3_consumido), 0)
  const avgM3         = history.length ? (totalM3Res / history.length).toFixed(1) : '—'
  const lastM3        = history[history.length - 1]?.m3_consumido
  const prevM3        = history[history.length - 2]?.m3_consumido
  const trend         = lastM3 && prevM3 ? ((num(lastM3) - num(prevM3)) / num(prevM3)) * 100 : undefined
  const lastFeeAmount = lastFee ? num(lastFee.montoTotal ?? lastFee.monto_total ?? 0) : null
  const lastFeePeriod = lastFee ? `${MESES[lastFee.periodoMes ?? lastFee.periodo_mes]} ${lastFee.periodoAnio ?? lastFee.periodo_anio}` : null
  const lastFeeStatus = lastFee?.statusPago ?? lastFee?.status_pago ?? '—'

  const renderPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, pct, depto }: any) => {
    if (pct == null || pct < 5) return null  // no renderizar si undefined o muy pequeño
    if (pct < 5) return null
    const RADIAN = Math.PI / 180
    const radius = innerRadius + (outerRadius - innerRadius) * 0.55
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)
    return <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight={700}>{depto}</text>
  }

  if (loading) return (
    <div style={{ display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'60vh',gap:'1rem' }}>
      <Loader2 size={28} color="var(--accent)" style={{ animation:'spin 0.8s linear infinite' }} />
      <span style={{ color:'var(--text-secondary)',fontSize:'0.9rem' }}>Cargando datos...</span>
    </div>
  )

  return (
    <div style={{ padding:'2rem',maxWidth:1200,margin:'0 auto' }}>

      {/* Header */}
      <div style={{ display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:'2rem',flexWrap:'wrap',gap:'1rem' }} className="fade-up">
        <div>
          <h1 style={{ fontFamily:'var(--font-display)',fontSize:'1.8rem',fontWeight:700,letterSpacing:'-0.02em',marginBottom:'0.2rem' }}>Dashboard</h1>
          <p style={{ color:'var(--text-secondary)',fontSize:'0.875rem' }}>{supervisor ? 'Resumen general del edificio' : 'Últimos 6 meses de consumo'}</p>
        </div>
        <div style={{ display:'flex',alignItems:'center',gap:'0.5rem',background:'var(--bg-surface)',border:'1px solid var(--border)',borderRadius:20,padding:'0.4rem 0.8rem' }}>
          <div style={{ width:7,height:7,borderRadius:'50%',background:'var(--green)',boxShadow:'0 0 6px var(--green)' }} />
          <span style={{ fontSize:'0.78rem',color:'var(--text-secondary)' }}>En vivo</span>
        </div>
      </div>

      {error && (
        <div style={{ display:'flex',alignItems:'center',gap:'0.5rem',background:'var(--red-dim)',border:'1px solid rgba(241,96,99,0.3)',borderRadius:'var(--radius)',padding:'0.75rem 1rem',marginBottom:'1.5rem',color:'var(--red)',fontSize:'0.875rem' }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* ══════ SUPERVISOR ══════ */}
      {supervisor && (
        <>
          {/* Controles edificio + período */}
          <div style={{ display:'flex',alignItems:'center',gap:'1rem',marginBottom:'1.5rem',flexWrap:'wrap' }} className="fade-up">
            <BuildingSelector value={selectedBuilding} onChange={setSelectedBuilding} autoSelect />
            <div style={{ display:'flex',alignItems:'center',gap:'0.4rem',background:'var(--bg-surface)',border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:'0.3rem 0.5rem' }}>
              <button onClick={() => goMes(-1)} style={{ background:'none',border:'none',cursor:'pointer',color:'var(--text-secondary)',display:'flex',alignItems:'center',padding:'0.2rem' }}><ChevronLeft size={15}/></button>
              <span style={{ fontSize:'0.875rem',fontWeight:500,minWidth:90,textAlign:'center' }}>{MESES[mes]} {anio}</span>
              <button onClick={() => goMes(1)} style={{ background:'none',border:'none',cursor:'pointer',color:'var(--text-secondary)',display:'flex',alignItems:'center',padding:'0.2rem' }}><ChevronRight size={15}/></button>
            </div>
          </div>

          {/* Stat cards */}
          <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))',gap:'1rem',marginBottom:'1.5rem' }}>
            <StatCard icon={<Droplets size={18} color="var(--blue)" />} label="Total deptos" value={summary?.resumen?.totalDeptos ?? '—'} unit="en el edificio" color="var(--blue)" />
            <StatCard icon={<TrendingUp size={18} color="var(--green)" />} label="Deptos pagados" value={summary?.resumen?.pagados ?? '—'} unit={`de ${summary?.resumen?.totalDeptos ?? '—'}`} color="var(--green)" />
            <StatCard icon={<Zap size={18} color="var(--accent)" />} label="Monto pendiente"
              value={summary?.resumen?.montoPendiente != null ? `S/. ${num(summary.resumen.montoPendiente).toFixed(2)}` : '—'}
              unit={`${MESES[mes]} ${anio}`} color="var(--accent)" />
            <StatCard
              icon={<Wifi size={18} color={summary?.resumen?.periodoCerrado ? 'var(--green)' : 'var(--text-secondary)'} />}
              label="Estado período"
              value={summary?.resumen?.totalDeptos ? (summary.resumen.periodoCerrado ? 'cerrado' : 'pendiente') : '—'}
              color={summary?.resumen?.periodoCerrado ? 'var(--green)' : 'var(--text-muted)'}
            />
          </div>

          {/* Gráficas */}
          {(svcMedicionData.length > 0 || delayData.length > 0) ? (
            <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(340px, 1fr))',gap:'1rem',marginBottom:'1.5rem' }}>

              {/* Gráficas dinámicas por servicio con medición */}
              {svcMedicionData.map(({ svc, items, totalConsumo }: any) => {
                const unidad = svc.unidadMedida === 'kwh' ? 'kWh' : 'm³'
                const svcColor = svc.tipo === 'luz' ? 'var(--accent)' : svc.tipo === 'agua' ? 'var(--blue)' : 'var(--green)'
                return (
                  <div key={svc.id} style={{ background:'var(--bg-surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',padding:'1.25rem' }} className="fade-up">
                    <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'0.5rem' }}>
                      <div>
                        <h3 style={{ fontSize:'0.95rem',fontWeight:600,marginBottom:'0.2rem' }}>
                          Consumo de {svc.nombreServicio} por departamento
                        </h3>
                        <p style={{ fontSize:'0.78rem',color:'var(--text-muted)' }}>% del total medido — {MESES[mes]} {anio}</p>
                      </div>
                    </div>

                    <div style={{ display:'flex',alignItems:'center',gap:'0.4rem',background:`${svcColor}12`,border:`1px solid ${svcColor}25`,borderRadius:6,padding:'0.4rem 0.7rem',marginBottom:'0.75rem' }}>
                      <p style={{ fontSize:'0.72rem',color:svcColor }}>
                        Total medido: <strong>{(totalConsumo||0).toFixed(3)} {unidad}</strong>
                      </p>
                    </div>

                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie data={items} cx="50%" cy="50%" outerRadius={80} dataKey="pct" labelLine={false} label={renderPieLabel}>
                          {items.map((entry: any, i: number) => (
                            <Cell key={i} fill={entry.fill} stroke="var(--bg-surface)" strokeWidth={2} />
                          ))}
                        </Pie>
                        <ReTooltip content={<PieTooltip />} />
                        <Legend
                          formatter={(_: any, entry: any) => (
                            <span style={{ fontSize:'0.72rem',color:'var(--text-secondary)' }}>
                              D{entry.payload.depto} ({(entry.payload.pct ?? 0).toFixed(1)}%)
                            </span>
                          )}
                          iconSize={8} iconType="circle"
                        />
                      </PieChart>
                    </ResponsiveContainer>

                    <div style={{ borderTop:'1px solid var(--border)',paddingTop:'0.75rem',marginTop:'0.25rem',display:'flex',flexDirection:'column',gap:'0.35rem',maxHeight:140,overflowY:'auto' }}>
                      {items.map((d: any) => (
                        <div key={d.depto} style={{ display:'flex',alignItems:'center',gap:'0.5rem',fontSize:'0.78rem' }}>
                          <div style={{ width:8,height:8,borderRadius:'50%',background:d.fill,flexShrink:0 }} />
                          <span style={{ color:'var(--text-secondary)',minWidth:55 }}>Depto {d.depto}</span>
                          <div style={{ flex:1,height:4,background:'var(--bg-elevated)',borderRadius:2,overflow:'hidden' }}>
                            <div style={{ width:`${d.pct}%`,height:'100%',background:d.fill,borderRadius:2 }} />
                          </div>
                          <span style={{ color:'var(--text-primary)',fontWeight:600,minWidth:38,textAlign:'right' }}>{(d.pct ?? 0).toFixed(1)}%</span>
                          <span style={{ color:'var(--text-muted)',minWidth:65,textAlign:'right' }}>{(d.consumo||0).toFixed(2)} {unidad}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}

              {/* Gráfica 2: demora de pago */}
              {delayData.length > 0 && (
                <div style={{ background:'var(--bg-surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',padding:'1.25rem' }} className="fade-up">
                  {/* Header */}
                  <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'0.75rem' }}>
                    <div>
                      <h3 style={{ fontSize:'0.95rem',fontWeight:600,marginBottom:'0.2rem' }}>Demora en pago por propietario</h3>
                      <p style={{ fontSize:'0.78rem',color:'var(--text-muted)' }}>días entre envío de mensaje → primer pago efectivo</p>
                    </div>
                    <TrendingUp size={16} color="var(--accent)" />
                  </div>

                  {/* Peor pagador highlight */}
                  {peorPagador && (
                    <div style={{ display:'flex',alignItems:'center',gap:'0.6rem',background:'rgba(241,96,99,0.08)',border:'1px solid rgba(241,96,99,0.3)',borderRadius:8,padding:'0.6rem 0.9rem',marginBottom:'0.75rem' }}>
                      <div style={{ width:28,height:28,borderRadius:'50%',background:'rgba(241,96,99,0.15)',border:'1px solid rgba(241,96,99,0.4)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontSize:'0.85rem' }}>🐢</div>
                      <div style={{ flex:1,minWidth:0 }}>
                        <p style={{ fontSize:'0.8rem',fontWeight:700,color:'#f16063',marginBottom:'0.1rem',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>
                          {peorPagador.propietario}
                        </p>
                        <p style={{ fontSize:'0.72rem',color:'var(--text-muted)' }}>
                          Depto {peorPagador.depto} · tardó más en pagar este período
                        </p>
                      </div>
                      <div style={{ flexShrink:0,textAlign:'right' }}>
                        <p style={{ fontSize:'1.3rem',fontWeight:800,color:'#f16063',lineHeight:1,fontVariantNumeric:'tabular-nums' }}>{peorPagador.dias}</p>
                        <p style={{ fontSize:'0.68rem',color:'var(--text-muted)' }}>días</p>
                      </div>
                    </div>
                  )}

                  {/* Stats strip */}
                  {avgDelay && (
                    <div style={{ display:'flex',gap:'0.5rem',marginBottom:'0.75rem',flexWrap:'wrap' }}>
                      <div style={{ display:'flex',alignItems:'center',gap:'0.4rem',background:'rgba(245,166,35,0.07)',border:'1px solid rgba(245,166,35,0.15)',borderRadius:6,padding:'0.35rem 0.7rem' }}>
                        <Zap size={11} color="var(--accent)" />
                        <p style={{ fontSize:'0.72rem',color:'var(--accent)' }}>Promedio: <strong>{avgDelay} días</strong></p>
                      </div>
                      <div style={{ display:'flex',alignItems:'center',gap:'0.4rem',background:'var(--bg-elevated)',border:'1px solid var(--border)',borderRadius:6,padding:'0.35rem 0.7rem' }}>
                        <p style={{ fontSize:'0.72rem',color:'var(--text-muted)' }}>{delayData.length} propietarios con pago registrado</p>
                      </div>
                    </div>
                  )}

                  {/* Gráfica */}
                  <ResponsiveContainer width="100%" height={Math.max(180, delayData.length * 36)}>
                    <BarChart
                      data={delayData}
                      layout="vertical"
                      margin={{ top:4, right:45, bottom:0, left:4 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                      <XAxis
                        type="number"
                        tick={{ fill:'var(--text-muted)',fontSize:11 }}
                        axisLine={false} tickLine={false}
                        label={{ value:'días',position:'insideRight',offset:14,fill:'var(--text-muted)',fontSize:10 }}
                      />
                      <YAxis
                        dataKey="nombreCorto"
                        type="category"
                        tick={({ x, y, payload }: any) => {
                          const item = delayData.find((d: any) => d.nombreCorto === payload.value)
                          const color = item?.esPeor ? '#f16063' : 'var(--text-secondary)'
                          const weight = item?.esPeor ? 700 : 400
                          return (
                            <text x={x} y={y} dy={4} textAnchor="end" fill={color} fontSize={11} fontWeight={weight}>
                              {payload.value}
                            </text>
                          )
                        }}
                        axisLine={false} tickLine={false}
                        width={110}
                      />
                      <ReTooltip content={({ active, payload }: any) => {
                        if (!active || !payload?.length) return null
                        const d = payload[0].payload
                        const borderColor = d.esPeor ? 'rgba(241,96,99,0.4)' : 'var(--border)'
                        const accentColor = d.esPeor ? '#f16063' : 'var(--accent)'
                        return (
                          <div style={{ background:'var(--bg-elevated)',border:`1px solid ${borderColor}`,borderRadius:10,padding:'0.7rem 1rem',fontSize:'0.82rem',minWidth:180 }}>
                            <p style={{ fontWeight:700,marginBottom:4,fontSize:'0.88rem' }}>{d.propietario}</p>
                            <p style={{ color:'var(--text-muted)',fontSize:'0.72rem',marginBottom:6 }}>Depto {d.depto}</p>
                            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center' }}>
                              <span style={{ color:'var(--text-secondary)' }}>Tiempo para pagar</span>
                              <span style={{ fontWeight:800,color:accentColor,fontSize:'1rem',fontVariantNumeric:'tabular-nums' }}>{d.dias} días</span>
                            </div>
                            {d.esPeor && (
                              <p style={{ color:'#f16063',fontSize:'0.7rem',marginTop:5,fontWeight:600 }}>🐢 El que más tardó este período</p>
                            )}
                          </div>
                        )
                      }} />
                      <Bar dataKey="dias" name="Días" radius={[0,4,4,0]} maxBarSize={22}>
                        {delayData.map((entry: any, i: number) => {
                          // Peor pagador siempre rojo intenso; resto por tramos
                          const fill = entry.esPeor
                            ? '#f16063'
                            : entry.dias <= 3
                              ? 'var(--green)'
                              : entry.dias <= 7
                                ? 'var(--accent)'
                                : '#e07070'
                          return (
                            <Cell
                              key={i}
                              fill={fill}
                              stroke={entry.esPeor ? '#f16063' : 'transparent'}
                              strokeWidth={entry.esPeor ? 1 : 0}
                              opacity={entry.esPeor ? 1 : 0.75}
                            />
                          )
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>

                  {/* Leyenda */}
                  <div style={{ display:'flex',gap:'0.75rem',justifyContent:'center',marginTop:'0.75rem',flexWrap:'wrap' }}>
                    {[
                      ['≤ 3 días','var(--green)'],
                      ['4–7 días','var(--accent)'],
                      ['> 7 días','#e07070'],
                      ['Más lento','#f16063'],
                    ].map(([label,color]) => (
                      <div key={label} style={{ display:'flex',alignItems:'center',gap:'0.3rem',fontSize:'0.72rem',color:'var(--text-muted)' }}>
                        <div style={{ width:8,height:8,borderRadius:2,background:color }} />
                        {label === 'Más lento' ? <strong style={{ color:'#f16063' }}>{label}</strong> : label}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:'1rem',padding:'4rem 2rem',background:'var(--bg-surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',marginBottom:'1.5rem' }}>
              <Droplets size={32} color="var(--text-muted)" />
              <p style={{ color:'var(--text-muted)',fontSize:'0.9rem' }}>No hay mediciones ni pagos para {MESES[mes]} {anio}</p>
            </div>
          )}

          {/* Tabla deptos */}
          {summary?.departamentos?.length > 0 && (
            <div style={{ background:'var(--bg-surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',padding:'1.25rem' }} className="fade-up">
              <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1.25rem' }}>
                <h3 style={{ fontSize:'0.95rem',fontWeight:600 }}>Cuotas del período</h3>
                <span style={{ fontSize:'0.78rem',color:'var(--text-muted)' }}>{MESES[mes]} {anio}</span>
              </div>
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%',borderCollapse:'collapse',fontSize:'0.85rem' }}>
                  <thead>
                    <tr>{['Depto','Monto total','Pagado','Saldo','m³ agua','Estado'].map(h => (
                      <th key={h} style={{ textAlign:'left',padding:'0.6rem 0.75rem',color:'var(--text-muted)',fontSize:'0.72rem',fontWeight:600,letterSpacing:'0.04em',textTransform:'uppercase' as const,borderBottom:'1px solid var(--border)' }}>{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {summary.departamentos.map((d: any, i: number) => {
                      const sc = d.statusPago==='pagado'?'var(--green)':d.statusPago==='parcial'?'var(--accent)':'#f16063'
                      return (
                        <tr key={i} style={i%2!==0?{background:'rgba(255,255,255,0.02)'}:{}}>
                          <td style={{ padding:'0.65rem 0.75rem',borderBottom:'1px solid rgba(255,255,255,0.03)',fontWeight:600 }}>{d.depto}</td>
                          <td style={{ padding:'0.65rem 0.75rem',borderBottom:'1px solid rgba(255,255,255,0.03)' }}>S/. {num(d.montoTotal).toFixed(2)}</td>
                          <td style={{ padding:'0.65rem 0.75rem',borderBottom:'1px solid rgba(255,255,255,0.03)',color:'var(--green)' }}>S/. {num(d.totalPagado).toFixed(2)}</td>
                          <td style={{ padding:'0.65rem 0.75rem',borderBottom:'1px solid rgba(255,255,255,0.03)',color:'var(--accent)' }}>S/. {num(d.saldo).toFixed(2)}</td>
                          <td style={{ padding:'0.65rem 0.75rem',borderBottom:'1px solid rgba(255,255,255,0.03)',color:'var(--blue)',fontFamily:'monospace' }}>
                            {d.medicion?.m3Consumido ? `${num(d.medicion.m3Consumido).toFixed(3)} m³` : '—'}
                          </td>
                          <td style={{ padding:'0.65rem 0.75rem',borderBottom:'1px solid rgba(255,255,255,0.03)' }}>
                            <span style={{ background:`${sc}18`,color:sc,border:`1px solid ${sc}40`,borderRadius:4,padding:'0.2rem 0.5rem',fontSize:'0.75rem',fontWeight:600 }}>{d.statusPago??'—'}</span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ══════ RESIDENTE ══════ */}
      {!supervisor && (
        <>
          <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))',gap:'1rem',marginBottom:'1.5rem' }}>
            <StatCard icon={<Droplets size={18} color="var(--blue)" />} label="Consumo promedio" value={avgM3} unit="m³/mes" color="var(--blue)" trend={trend} />
            <StatCard icon={<TrendingUp size={18} color="var(--green)" />} label="Total consumido" value={totalM3Res.toFixed(1)} unit="m³ (6 meses)" color="var(--green)" />
            <StatCard icon={<Zap size={18} color="var(--accent)" />} label="Última cuota"
              value={lastFeeAmount != null ? `S/. ${lastFeeAmount.toFixed(2)}` : '—'}
              unit={lastFeePeriod ?? 'Sin datos'} color="var(--accent)" />
            <StatCard icon={<Wifi size={18} color="var(--text-secondary)" />} label="Estado" value={lastFeeStatus} color="var(--text-muted)" />
          </div>

          {chartData.length > 0 ? (
            <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(340px, 1fr))',gap:'1rem',marginBottom:'1.5rem' }}>
              {[
                { key:'m3', name:'m³', title:'Consumo de agua', sub:'m³ por mes', color:'var(--blue)', icon:<Droplets size={16} color="var(--blue)" /> },
                { key:'monto', name:'S/.', title:'Monto facturado', sub:'S/. por consumo de agua', color:'var(--accent)', icon:<TrendingUp size={16} color="var(--accent)" /> },
              ].map(({ key, name, title, sub, color, icon }) => (
                <div key={key} style={{ background:'var(--bg-surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',padding:'1.25rem' }} className="fade-up">
                  <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'1.25rem' }}>
                    <div><h3 style={{ fontSize:'0.95rem',fontWeight:600,marginBottom:'0.2rem' }}>{title}</h3><p style={{ fontSize:'0.78rem',color:'var(--text-muted)' }}>{sub}</p></div>
                    {icon}
                  </div>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={chartData} margin={{ top:5,right:5,bottom:0,left:-20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                      <XAxis dataKey="mes" tick={{ fill:'var(--text-muted)',fontSize:11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill:'var(--text-muted)',fontSize:11 }} axisLine={false} tickLine={false} />
                      <ReTooltip content={<CustomTooltip />} />
                      <Bar dataKey={key} name={name} radius={[4,4,0,0]}>
                        {chartData.map((_: any, i: number) => (
                          <Cell key={i} fill={i===chartData.length-1?color:'var(--bg-elevated)'} stroke={i===chartData.length-1?color:'var(--border)'} strokeWidth={1} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:'1rem',padding:'4rem 2rem',background:'var(--bg-surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',marginBottom:'1.5rem' }}>
              <Droplets size={32} color="var(--text-muted)" />
              <p style={{ color:'var(--text-muted)',fontSize:'0.9rem' }}>No hay historial de mediciones disponible aún</p>
            </div>
          )}

          {history.length > 0 && (
            <div style={{ background:'var(--bg-surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',padding:'1.25rem' }} className="fade-up">
              <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1.25rem' }}>
                <h3 style={{ fontSize:'0.95rem',fontWeight:600 }}>Historial de consumo</h3>
                <span style={{ fontSize:'0.78rem',color:'var(--text-muted)' }}>Últimos 6 meses</span>
              </div>
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%',borderCollapse:'collapse',fontSize:'0.85rem' }}>
                  <thead>
                    <tr>{['Período','Lect. anterior','Lect. actual','m³','Precio/m³','Monto'].map(h => (
                      <th key={h} style={{ textAlign:'left',padding:'0.6rem 0.75rem',color:'var(--text-muted)',fontSize:'0.72rem',fontWeight:600,letterSpacing:'0.04em',textTransform:'uppercase' as const,borderBottom:'1px solid var(--border)' }}>{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {[...history].reverse().map((row: any, i: number) => (
                      <tr key={i} style={i%2!==0?{background:'rgba(255,255,255,0.02)'}:{}}>
                        <td style={{ padding:'0.65rem 0.75rem',borderBottom:'1px solid rgba(255,255,255,0.03)' }}>
                          <span style={{ background:'var(--bg-elevated)',borderRadius:4,padding:'0.2rem 0.5rem',fontSize:'0.78rem',fontWeight:500 }}>{MESES[parseInt(row.mes||row.periodoMes)]} {row.anio||row.periodoAnio}</span>
                        </td>
                        <td style={{ padding:'0.65rem 0.75rem',borderBottom:'1px solid rgba(255,255,255,0.03)' }}>{num(row.lectura_anterior).toFixed(3)}</td>
                        <td style={{ padding:'0.65rem 0.75rem',borderBottom:'1px solid rgba(255,255,255,0.03)' }}>{num(row.lectura_actual).toFixed(3)}</td>
                        <td style={{ padding:'0.65rem 0.75rem',borderBottom:'1px solid rgba(255,255,255,0.03)',color:'var(--blue)',fontWeight:600 }}>{num(row.m3_consumido).toFixed(3)}</td>
                        <td style={{ padding:'0.65rem 0.75rem',borderBottom:'1px solid rgba(255,255,255,0.03)',color:'var(--text-secondary)' }}>S/. {num(row.precio_m3).toFixed(4)}</td>
                        <td style={{ padding:'0.65rem 0.75rem',borderBottom:'1px solid rgba(255,255,255,0.03)',color:'var(--accent)',fontWeight:600 }}>S/. {num(row.monto_calculado).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
