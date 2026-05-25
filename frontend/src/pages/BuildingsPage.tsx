import { useEffect, useState } from 'react'
import api from '../services/api'
import toast from 'react-hot-toast'
import {
  Building2, Plus, Pencil, X, Loader2, Save,
  Droplets, Zap, Wifi, Brush, Wrench, ReceiptText,
  Trash2, AlertTriangle,
} from 'lucide-react'

interface Building {
  id: string; nombre: string; direccion: string
  nroDepas: number; cuentaBbva?: string; cuentaBcp?: string
  serviciosActivos: Record<string, boolean>
}
interface Servicio {
  id: string; idEdificio: string; nombreServicio: string; tipo: string; activo: boolean
}
interface Propietario { id: string; nombre: string }
interface DepartamentoForm {
  nrDepartamento: string; piso: number; idPropietario?: string
}

const TIPO_CFG: Record<string, { Icon: any; color: string }> = {
  agua:          { Icon: Droplets,    color: '#4a9eff' },
  luz:           { Icon: Zap,         color: 'var(--accent)' },
  internet:      { Icon: Wifi,        color: 'var(--green)' },
  limpieza:      { Icon: Brush,       color: '#a78bfa' },
  mantenimiento: { Icon: Wrench,      color: '#fb923c' },
  otro:          { Icon: ReceiptText, color: '#94a3b8' },
}

const TIPO_DESC: Record<string, string> = {
  agua: 'Sedapal — por consumo m³', luz: 'Electricidad áreas comunes',
  internet: 'Cámaras de seguridad', limpieza: 'Áreas comunes',
  mantenimiento: 'Gastos de mantenimiento', otro: 'Gasto adicional',
}

const EMPTY: Partial<Building> = {
  nombre: '', direccion: '', nroDepas: 0, cuentaBbva: '', cuentaBcp: '', serviciosActivos: {},
}
const makeDepto = (i: number): DepartamentoForm => ({
  nrDepartamento: String(101 + i), piso: Math.floor(i / 2) + 1, idPropietario: ''
})

const btn: React.CSSProperties  = { display:'flex',alignItems:'center',gap:'0.5rem',background:'var(--accent)',color:'#0f1117',fontWeight:600,fontSize:'0.875rem',padding:'0.6rem 1.1rem',borderRadius:'var(--radius)',border:'none',cursor:'pointer',fontFamily:'var(--font-body)' }
const btn2: React.CSSProperties = { ...btn, background:'var(--bg-elevated)',color:'var(--text-secondary)',border:'1px solid var(--border)' }

function Field({ label, children, span = 1 }: any) {
  return (
    <div style={{ gridColumn:`span ${span}` }}>
      <label style={{ fontSize:'0.78rem',fontWeight:500,color:'var(--text-secondary)',textTransform:'uppercase' as const,letterSpacing:'0.04em',display:'block',marginBottom:'0.4rem' }}>{label}</label>
      {children}
    </div>
  )
}

export default function BuildingsPage() {
  const [buildings, setBuildings]         = useState<Building[]>([])
  const [loading, setLoading]             = useState(true)
  const [modal, setModal]                 = useState(false)
  const [editing, setEditing]             = useState<Partial<Building>>(EMPTY)
  const [servicios, setServicios]         = useState<Servicio[]>([])
  const [loadingSvc, setLoadingSvc]       = useState(false)
  const [saving, setSaving]               = useState(false)
  const [propietarios, setPropietarios]   = useState<Propietario[]>([])
  const [deptos, setDeptos]               = useState<DepartamentoForm[]>([])
  const [step, setStep]                   = useState<'edificio'|'deptos'>('edificio')
  const [allServicios, setAllServicios]     = useState<Servicio[]>([])
  const [confirmDelete, setConfirmDelete] = useState<Building | null>(null)
  const [deleting, setDeleting]           = useState(false)

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    try {
      const [bRes, sRes] = await Promise.all([api.get('/buildings'), api.get('/services')])
      setBuildings(bRes.data)
      setAllServicios(sRes.data || [])
    }
    catch { toast.error('Error cargando edificios') }
    finally { setLoading(false) }
  }

  const openNew = () => {
    setEditing(EMPTY); setServicios([]); setDeptos([]); setStep('edificio')
    api.get('/propietarios').then(r => setPropietarios(r.data || [])).catch(() => {})
    setModal(true)
  }

  const openEdit = async (b: Building) => {
    setDeptos([]); setStep('edificio')
    api.get('/propietarios').then(r => setPropietarios(r.data || [])).catch(() => {})
    setLoadingSvc(true)
    try {
      const { data: svcs } = await api.get('/services', { params: { buildingId: b.id } })
      setServicios(svcs)

      // Normalizar serviciosActivos: convertir keys tipo→UUID y eliminar duplicados/inactivos
      const rawActivos = b.serviciosActivos || {}
      const tipoToId: Record<string, string> = {}
      svcs.forEach((s: Servicio) => { tipoToId[s.tipo] = s.id })

      const normalizado: Record<string, boolean> = {}
      svcs.forEach((s: Servicio) => {
        // Verificar si está activo por UUID o por tipo (compatibilidad)
        const porUuid = rawActivos[s.id]
        const porTipo = rawActivos[s.tipo]
        // Solo UUIDs de servicios existentes en este edificio
        normalizado[s.id] = !!(porUuid || porTipo)
      })
      setEditing({ ...b, serviciosActivos: normalizado })
    } catch { toast.error('Error cargando servicios') }
    finally { setLoadingSvc(false) }
    setModal(true)
  }

  const close = () => { setModal(false); setEditing(EMPTY); setServicios([]); setDeptos([]) }

  const toggleServicio = (id: string) => {
    const current = editing.serviciosActivos || {}
    setEditing({ ...editing, serviciosActivos: { ...current, [id]: !current[id] } })
  }

  const handleNroDepas = (n: number) => {
    setEditing({ ...editing, nroDepas: n })
    if (!editing.id) setDeptos(Array.from({ length: n }, (_, i) => makeDepto(i)))
  }

  const updateDepto = (idx: number, field: keyof DepartamentoForm, value: any) => {
    const updated = [...deptos]; updated[idx] = { ...updated[idx], [field]: value }; setDeptos(updated)
  }

  const save = async () => {
    if (!editing.nombre?.trim())    return toast.error('El nombre es obligatorio')
    if (!editing.direccion?.trim()) return toast.error('La dirección es obligatoria')
    // Solo validar servicios para edificios existentes (en los nuevos se configura después)
    if (editing.id) {
      const habilitados = Object.values(editing.serviciosActivos || {}).filter(Boolean).length
      if (habilitados === 0) return toast.error('Habilita al menos un servicio')
    }
    if (!editing.id && deptos.length > 0) {
      const nrs = deptos.map(d => d.nrDepartamento.trim())
      if (nrs.some(nr => !nr)) return toast.error('Todos los departamentos deben tener número')
      if (new Set(nrs).size !== nrs.length) return toast.error('Los números de departamento deben ser únicos')
    }
    setSaving(true)
    try {
      const payload = {
        nombre: editing.nombre, direccion: editing.direccion, nroDepas: editing.nroDepas,
        cuentaBbva: editing.cuentaBbva || undefined, cuentaBcp: editing.cuentaBcp || undefined,
        serviciosActivos: editing.serviciosActivos,
      }
      let buildingId = editing.id
      if (buildingId) {
        await api.patch(`/buildings/${buildingId}`, payload)
        toast.success('Edificio actualizado')
      } else {
        const { data: nb } = await api.post('/buildings', payload)
        buildingId = nb.id
        toast.success('Edificio creado')
        if (deptos.length > 0 && buildingId) {
          let ok = 0
          for (const d of deptos) {
            try {
              await api.post('/departments', {
                idEdificio: buildingId, nrDepartamento: d.nrDepartamento.trim(), piso: d.piso,
                ...(d.idPropietario ? { idPropietario: d.idPropietario } : {}),
              })
              ok++
            } catch {}
          }
          toast.success(`${ok} departamento${ok !== 1 ? 's' : ''} creado${ok !== 1 ? 's' : ''}`)
        }
      }
      await load(); close()
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Error guardando') }
    finally { setSaving(false) }
  }

  const deleteBuilding = async (b: Building) => {
    setDeleting(true)
    try {
      await api.delete(`/buildings/${b.id}`)
      toast.success(`"${b.nombre}" eliminado`)
      setConfirmDelete(null)
      await load()
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Error eliminando') }
    finally { setDeleting(false) }
  }

  // Obtener etiqueta legible para cada servicio activo de la card
  // serviciosActivos puede tener UUIDs (nuevo) o tipos (antiguo)
  const getServicioLabel = (key: string, allSvcs?: Servicio[]) => {
    // Si es UUID, buscar en servicios del edificio
    if (/^[0-9a-f]{8}-/.test(key) && allSvcs) {
      const svc = allSvcs.find(s => s.id === key)
      return svc ? { nombre: svc.nombreServicio, tipo: svc.tipo } : null
    }
    // Si es tipo directo
    return { nombre: key, tipo: key }
  }

  return (
    <div style={{ padding:'2rem', maxWidth:1100, margin:'0 auto' }}>
      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'1.5rem',flexWrap:'wrap',gap:'1rem' }} className="fade-up">
        <div>
          <h1 style={{ fontFamily:'var(--font-display)',fontSize:'1.8rem',fontWeight:700,letterSpacing:'-0.02em',marginBottom:'0.2rem' }}>Edificios</h1>
          <p style={{ color:'var(--text-secondary)',fontSize:'0.875rem' }}>Gestión de edificios y servicios cobrados</p>
        </div>
        <button onClick={openNew} style={btn}><Plus size={15}/> Nuevo edificio</button>
      </div>

      {loading ? (
        <div style={{ display:'flex',justifyContent:'center',padding:'4rem' }}><Loader2 size={24} color="var(--accent)" style={{ animation:'spin 0.8s linear infinite' }}/></div>
      ) : (
        <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(340px,1fr))',gap:'1.25rem' }} className="fade-up">
          {buildings.map(b => {
            // Precalcular servicios activos para esta card
            const activoEntries = Object.entries(b.serviciosActivos || {}).filter(([, v]) => v)
            return (
              <div key={b.id} style={{ background:'var(--bg-surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',padding:'1.5rem',position:'relative' }}>
                {/* Botones editar / eliminar */}
                <div style={{ position:'absolute',top:'1rem',right:'1rem',display:'flex',gap:'0.35rem' }}>
                  <button onClick={() => openEdit(b)} title="Editar"
                    style={{ background:'var(--bg-elevated)',border:'1px solid var(--border)',borderRadius:6,width:30,height:30,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'var(--text-secondary)' }}>
                    <Pencil size={13}/>
                  </button>
                  <button onClick={() => setConfirmDelete(b)} title="Eliminar"
                    style={{ background:'rgba(248,113,113,0.1)',border:'1px solid rgba(248,113,113,0.3)',borderRadius:6,width:30,height:30,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'#f87171' }}>
                    <Trash2 size={13}/>
                  </button>
                </div>

                <div style={{ display:'flex',alignItems:'center',gap:'0.75rem',marginBottom:'1rem',paddingRight:'4.5rem' }}>
                  <div style={{ width:44,height:44,borderRadius:12,background:'var(--accent-dim)',border:'1px solid rgba(245,166,35,0.2)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
                    <Building2 size={22} color="var(--accent)"/>
                  </div>
                  <div>
                    <h2 style={{ fontWeight:700,fontSize:'1.05rem',marginBottom:'0.1rem' }}>{b.nombre}</h2>
                    <p style={{ color:'var(--text-muted)',fontSize:'0.8rem' }}>{b.direccion}</p>
                  </div>
                </div>

                <div style={{ display:'flex',flexWrap:'wrap',gap:'0.4rem',marginBottom:'1rem' }}>
                  {b.nroDepas > 0 && <span style={{ background:'var(--bg-elevated)',border:'1px solid var(--border)',borderRadius:4,padding:'0.2rem 0.5rem',fontSize:'0.75rem',color:'var(--text-muted)' }}>{b.nroDepas} deptos</span>}
                  {b.cuentaBcp  && <span style={{ background:'var(--bg-elevated)',border:'1px solid var(--border)',borderRadius:4,padding:'0.2rem 0.5rem',fontSize:'0.75rem',color:'var(--text-muted)' }}>BCP</span>}
                  {b.cuentaBbva && <span style={{ background:'var(--bg-elevated)',border:'1px solid var(--border)',borderRadius:4,padding:'0.2rem 0.5rem',fontSize:'0.75rem',color:'var(--text-muted)' }}>BBVA</span>}
                </div>

                {/* Servicios activos — muestra nombre legible */}
                {activoEntries.length > 0 && (
                  <div>
                    <p style={{ fontSize:'0.68rem',color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:'0.5rem' }}>Servicios activos</p>
                    <div style={{ display:'flex',flexWrap:'wrap',gap:'0.4rem' }}>
                      {activoEntries.map(([key]) => {
                        const isUuid = /^[0-9a-f]{8}-/.test(key)
                        let tipo = key
                        let label = key
                        if (isUuid) {
                          const svc = allServicios.find(s => s.id === key)
                          tipo  = svc?.tipo  || 'otro'
                          label = svc?.nombreServicio || key.slice(0, 8)
                        }
                        const cfg = TIPO_CFG[tipo] || TIPO_CFG['otro']
                        return (
                          <span key={key} style={{ display:'flex',alignItems:'center',gap:'0.3rem',background:`${cfg.color}12`,border:`1px solid ${cfg.color}40`,borderRadius:4,padding:'0.2rem 0.6rem',fontSize:'0.75rem',color:cfg.color,fontWeight:500 }}>
                            <cfg.Icon size={11}/> {label}
                          </span>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Modal crear/editar ── */}
      {modal && (
        <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:'1rem',backdropFilter:'blur(4px)' }} onClick={close}>
          <div style={{ background:'var(--bg-surface)',border:'1px solid var(--border-accent)',borderRadius:'var(--radius-lg)',width:'100%',maxWidth:640,maxHeight:'92vh',display:'flex',flexDirection:'column',boxShadow:'var(--shadow-lg)' }} onClick={e=>e.stopPropagation()} className="fade-up">

            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',padding:'1.25rem 1.5rem',borderBottom:'1px solid var(--border)',flexShrink:0 }}>
              <h2 style={{ fontFamily:'var(--font-display)',fontSize:'1.05rem',fontWeight:700 }}>
                {editing.id ? 'Editar edificio' : 'Nuevo edificio'}
              </h2>
              <button onClick={close} style={{ background:'var(--bg-elevated)',border:'1px solid var(--border)',borderRadius:6,width:30,height:30,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'var(--text-secondary)' }}><X size={16}/></button>
            </div>

            {!editing.id && (
              <div style={{ display:'flex',borderBottom:'1px solid var(--border)',flexShrink:0 }}>
                {[['edificio','1. Datos del edificio'],['deptos','2. Departamentos']].map(([s,label]) => (
                  <button key={s} onClick={() => setStep(s as any)}
                    style={{ flex:1,padding:'0.75rem',background:'none',border:'none',cursor:'pointer',fontFamily:'var(--font-body)',fontSize:'0.82rem',fontWeight:step===s?700:400,color:step===s?'var(--accent)':'var(--text-muted)',borderBottom:step===s?'2px solid var(--accent)':'2px solid transparent',transition:'all 0.15s' }}>
                    {label}
                  </button>
                ))}
              </div>
            )}

            <div style={{ overflowY:'auto',flex:1,padding:'1.5rem' }}>
              {/* ── Paso 1 ── */}
              {(step === 'edificio' || !!editing.id) && (
                <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem' }}>
                  <Field label="Nombre *" span={2}><input value={editing.nombre||''} onChange={e=>setEditing({...editing,nombre:e.target.value})} placeholder="Edificio Carlos Izaguirre" autoFocus /></Field>
                  <Field label="Dirección *" span={2}><input value={editing.direccion||''} onChange={e=>setEditing({...editing,direccion:e.target.value})} placeholder="Jr. Carlos Izaguirre 123, Lima" /></Field>
                  <Field label="Nro. Departamentos">
                    <input type="number" min={0} value={editing.nroDepas||''} onChange={e=>handleNroDepas(parseInt(e.target.value)||0)} placeholder="10" />
                  </Field>
                  <Field label="Cuenta BCP"><input value={editing.cuentaBcp||''} onChange={e=>setEditing({...editing,cuentaBcp:e.target.value})} placeholder="191-12345678-0-56" /></Field>
                  <Field label="Cuenta BBVA" span={2}><input value={editing.cuentaBbva||''} onChange={e=>setEditing({...editing,cuentaBbva:e.target.value})} placeholder="0011-9234-56" /></Field>

                  <div style={{ gridColumn:'span 2' }}>
                    <label style={{ fontSize:'0.78rem',fontWeight:500,color:'var(--text-secondary)',textTransform:'uppercase' as const,letterSpacing:'0.04em',display:'block',marginBottom:'0.75rem' }}>Servicios cobrados en este edificio</label>
                    {loadingSvc ? (
                      <div style={{ display:'flex',justifyContent:'center',padding:'1rem' }}><Loader2 size={18} style={{ animation:'spin 0.8s linear infinite' }}/></div>
                    ) : servicios.length > 0 ? (
                      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.5rem' }}>
                        {servicios.map(svc => {
                          const cfg     = TIPO_CFG[svc.tipo] || TIPO_CFG['otro']
                          const enabled = editing.serviciosActivos?.[svc.id] ?? false
                          return (
                            <button key={svc.id} type="button" onClick={() => toggleServicio(svc.id)}
                              style={{ display:'flex',alignItems:'center',gap:'0.6rem',padding:'0.65rem 0.8rem',borderRadius:'var(--radius)',border:enabled?`1.5px solid ${cfg.color}`:'1.5px solid var(--border)',background:enabled?`${cfg.color}12`:'var(--bg-elevated)',cursor:'pointer',textAlign:'left' as const,transition:'all 0.15s' }}>
                              <div style={{ width:16,height:16,borderRadius:4,flexShrink:0,border:enabled?`2px solid ${cfg.color}`:'2px solid var(--border)',background:enabled?cfg.color:'transparent',display:'flex',alignItems:'center',justifyContent:'center' }}>
                                {enabled && <span style={{ color:'#fff',fontSize:10,fontWeight:700,lineHeight:1 }}>✓</span>}
                              </div>
                              <cfg.Icon size={14} color={enabled?cfg.color:'var(--text-muted)'} />
                              <div style={{ minWidth:0 }}>
                                <div style={{ fontSize:'0.82rem',fontWeight:600,color:enabled?cfg.color:'var(--text-primary)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis' }}>{svc.nombreServicio}</div>
                                <div style={{ fontSize:'0.7rem',color:'var(--text-muted)' }}>{TIPO_DESC[svc.tipo] || svc.tipo}</div>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    ) : (
                      <div style={{ background:'var(--blue-dim)',border:'1px solid rgba(74,158,255,0.15)',borderRadius:'var(--radius)',padding:'0.75rem 1rem' }}>
                        <p style={{ fontSize:'0.78rem',color:'var(--text-secondary)',lineHeight:1.5 }}>
                          💡 Después de crear el edificio, configura los servicios en <strong>Servicios</strong> y vuelve a editar para activarlos.
                        </p>
                      </div>
                    )}
                  </div>

                  {!editing.id && (editing.nroDepas || 0) > 0 && (
                    <div style={{ gridColumn:'span 2',display:'flex',justifyContent:'flex-end' }}>
                      <button onClick={() => setStep('deptos')} style={{ ...btn, marginTop:'0.5rem' }}>Configurar departamentos →</button>
                    </div>
                  )}
                </div>
              )}

              {/* ── Paso 2 ── */}
              {step === 'deptos' && !editing.id && (
                <div>
                  <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1rem' }}>
                    <div>
                      <h3 style={{ fontWeight:700,fontSize:'0.95rem',marginBottom:'0.15rem' }}>Departamentos</h3>
                      <p style={{ fontSize:'0.78rem',color:'var(--text-muted)' }}>Configura número, piso y propietario. Puedes editarlo luego.</p>
                    </div>
                    <button onClick={() => setDeptos([...deptos, makeDepto(deptos.length)])} style={{ ...btn2, fontSize:'0.8rem', padding:'0.4rem 0.75rem' }}>
                      <Plus size={13}/> Agregar
                    </button>
                  </div>

                  <div style={{ display:'flex',flexDirection:'column',gap:'0.5rem' }}>
                    <div style={{ display:'grid',gridTemplateColumns:'90px 60px 1fr 28px',gap:'0.5rem',padding:'0 0.25rem' }}>
                      {['Nro. depto','Piso','Propietario',''].map(h => (
                        <span key={h} style={{ fontSize:'0.68rem',color:'var(--text-muted)',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.05em' }}>{h}</span>
                      ))}
                    </div>
                    {deptos.map((d, i) => (
                      <div key={i} style={{ display:'grid',gridTemplateColumns:'90px 60px 1fr 28px',gap:'0.5rem',alignItems:'center',background:'var(--bg-elevated)',borderRadius:'var(--radius)',padding:'0.5rem 0.6rem' }}>
                        <input value={d.nrDepartamento} onChange={e=>updateDepto(i,'nrDepartamento',e.target.value)} placeholder="201" style={{ padding:'0.35rem 0.5rem',fontSize:'0.85rem' }} />
                        <input type="number" min={1} value={d.piso} onChange={e=>updateDepto(i,'piso',parseInt(e.target.value)||1)} style={{ padding:'0.35rem 0.5rem',fontSize:'0.85rem' }} />
                        <select value={d.idPropietario||''} onChange={e=>updateDepto(i,'idPropietario',e.target.value)} style={{ padding:'0.35rem 0.5rem',fontSize:'0.82rem' }}>
                          <option value="">— Sin asignar —</option>
                          {propietarios.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                        </select>
                        <button onClick={() => setDeptos(deptos.filter((_,j)=>j!==i))}
                          style={{ width:28,height:28,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(248,113,113,0.1)',border:'1px solid rgba(248,113,113,0.3)',borderRadius:6,cursor:'pointer',color:'#f87171',flexShrink:0 }}>
                          <Trash2 size={12}/>
                        </button>
                      </div>
                    ))}
                    {deptos.length === 0 && (
                      <div style={{ textAlign:'center',padding:'1.5rem',color:'var(--text-muted)',fontSize:'0.85rem',border:'1px dashed var(--border)',borderRadius:'var(--radius)' }}>
                        No hay departamentos — puedes crearlos después
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',padding:'1rem 1.5rem',borderTop:'1px solid var(--border)',flexShrink:0 }}>
              <div style={{ fontSize:'0.78rem',color:'var(--text-muted)' }}>
                {!editing.id && step==='deptos' && `${deptos.length} departamento${deptos.length!==1?'s':''} configurado${deptos.length!==1?'s':''}`}
              </div>
              <div style={{ display:'flex',gap:'0.75rem' }}>
                {!editing.id && step==='deptos' && <button onClick={() => setStep('edificio')} style={btn2}>← Volver</button>}
                <button onClick={close} style={btn2}>Cancelar</button>
                <button onClick={save} disabled={saving} style={btn}>
                  {saving ? <Loader2 size={14} style={{ animation:'spin 0.8s linear infinite' }}/> : <Save size={14}/>}
                  {editing.id ? 'Guardar' : 'Crear edificio'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal confirmar eliminación ── */}
      {confirmDelete && (
        <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.82)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1100,padding:'1rem',backdropFilter:'blur(4px)' }}
          onClick={() => !deleting && setConfirmDelete(null)}>
          <div style={{ background:'var(--bg-surface)',border:'1px solid rgba(248,113,113,0.4)',borderRadius:'var(--radius-lg)',width:'100%',maxWidth:440,padding:'2rem',boxShadow:'var(--shadow-lg)' }}
            onClick={e => e.stopPropagation()} className="fade-up">
            <div style={{ display:'flex',alignItems:'center',gap:'0.75rem',marginBottom:'1rem' }}>
              <div style={{ width:44,height:44,borderRadius:12,background:'rgba(248,113,113,0.1)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
                <AlertTriangle size={22} color="#f87171"/>
              </div>
              <div>
                <h2 style={{ fontWeight:700,fontSize:'1rem',marginBottom:'0.1rem' }}>Eliminar edificio</h2>
                <p style={{ fontSize:'0.82rem',color:'var(--text-muted)' }}>Esta acción no se puede deshacer</p>
              </div>
            </div>
            <div style={{ background:'rgba(248,113,113,0.06)',border:'1px solid rgba(248,113,113,0.2)',borderRadius:'var(--radius)',padding:'0.9rem 1rem',marginBottom:'1.25rem' }}>
              <p style={{ fontSize:'0.875rem',marginBottom:'0.4rem' }}>
                Se eliminará permanentemente <strong style={{ color:'#f87171' }}>{confirmDelete.nombre}</strong> y todas sus dependencias:
              </p>
              <ul style={{ fontSize:'0.82rem',color:'var(--text-muted)',paddingLeft:'1.2rem',margin:0,lineHeight:1.8 }}>
                <li>Departamentos y propietarios vinculados</li>
                <li>Servicios, recibos y mediciones</li>
                <li>Cuotas y pagos registrados</li>
              </ul>
            </div>
            <div style={{ display:'flex',justifyContent:'flex-end',gap:'0.75rem' }}>
              <button onClick={() => setConfirmDelete(null)} disabled={deleting} style={btn2}>Cancelar</button>
              <button onClick={() => deleteBuilding(confirmDelete)} disabled={deleting}
                style={{ display:'flex',alignItems:'center',gap:'0.5rem',background:'#f87171',color:'#fff',fontWeight:700,fontSize:'0.875rem',padding:'0.6rem 1.1rem',borderRadius:'var(--radius)',border:'none',cursor:deleting?'wait':'pointer',fontFamily:'var(--font-body)',opacity:deleting?0.7:1 }}>
                {deleting ? <Loader2 size={14} style={{ animation:'spin 0.8s linear infinite' }}/> : <Trash2 size={14}/>}
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
