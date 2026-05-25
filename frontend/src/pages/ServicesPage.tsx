import { useEffect, useState } from 'react'
import api from '../services/api'
import toast from 'react-hot-toast'
import {
  Plus, Pencil, X, Loader2, Save,
  Droplets, Zap, Wifi, Brush, Wrench, ReceiptText,
  ToggleLeft, ToggleRight, ChevronDown, ChevronRight, Trash2, AlertTriangle,
} from 'lucide-react'
import BuildingSelector from '../components/common/BuildingSelector'

// ── Tipos ─────────────────────────────────────────────────────

interface Building  { id: string; nombre: string }
interface Servicio  {
  id: string; idEdificio: string; nombreServicio: string
  tipo: string; modoCalculo: string; activo: boolean; unidadMedida?: string | null
  detalleServicio: Record<string, any>
}

// ── Config visual ─────────────────────────────────────────────

const TIPO_CFG: Record<string, { Icon: any; color: string; label: string }> = {
  agua:          { Icon: Droplets,    color: '#4a9eff',       label: 'Agua' },
  luz:           { Icon: Zap,         color: 'var(--accent)', label: 'Luz' },
  internet:      { Icon: Wifi,        color: 'var(--green)',  label: 'Internet' },
  limpieza:      { Icon: Brush,       color: '#a78bfa',       label: 'Limpieza' },
  mantenimiento: { Icon: Wrench,      color: '#fb923c',       label: 'Mantenimiento' },
  otro:          { Icon: ReceiptText, color: '#94a3b8',       label: 'Otro' },
}

const TIPOS = Object.entries(TIPO_CFG).map(([key, cfg]) => ({ key, ...cfg }))

const MODOS = [
  { key: 'division_igualitaria', label: 'División igualitaria',  desc: 'Monto total ÷ nro. departamentos' },
  { key: 'por_consumo_m3',       label: 'Por consumo m³',
    desc: 'Según medición individual del medidor (sin ajuste)' },
  { key: 'por_consumo_ajustado', label: 'Por consumo ajustado',        desc: 'Factor de ajuste para cuadrar exactamente con la factura' },
  { key: 'porcentaje_alicuota',  label: 'Por alícuota (%)',      desc: 'Monto total × alícuota del departamento' },
]

// Campos de detalle por tipo de servicio
const DETALLE_FIELDS: Record<string, Array<{ key: string; label: string; placeholder: string; type?: string }>> = {
  agua: [
    { key: 'proveedor', label: 'Proveedor', placeholder: 'Sedapal' },
    { key: 'cuenta',    label: 'N° cuenta/contrato', placeholder: 'CLI-123456' },
  ],
  luz: [
    { key: 'proveedor',  label: 'Proveedor', placeholder: 'Enel Distribución' },
    { key: 'suministro', label: 'N° suministro', placeholder: '123456789' },
  ],
  internet: [
    { key: 'proveedor', label: 'Proveedor', placeholder: 'Claro Empresas' },
    { key: 'plan',      label: 'Plan contratado', placeholder: '100 Mbps' },
    { key: 'cuenta',    label: 'N° cuenta', placeholder: 'CLI-12345' },
  ],
  limpieza: [
    { key: 'proveedor',  label: 'Empresa / proveedor', placeholder: 'Limpieza Total SAC' },
    { key: 'contacto',   label: 'Teléfono contacto', placeholder: '999-888-777' },
    { key: 'frecuencia', label: 'Frecuencia', placeholder: 'Diaria / Semanal / Mensual' },
    { key: 'zonas',      label: 'Zonas de limpieza', placeholder: 'Lobby, Escaleras, Azotea' },
  ],
  mantenimiento: [
    { key: 'proveedor',          label: 'Empresa / proveedor', placeholder: 'TecniMant Perú' },
    { key: 'contacto',           label: 'Teléfono contacto', placeholder: '999-888-777' },
    { key: 'tipo_mantenimiento', label: 'Tipo de mantenimiento', placeholder: 'Bombas, Ascensores, Cisternas...' },
  ],
  otro: [
    { key: 'descripcion', label: 'Descripción del servicio', placeholder: 'Jardinería mensual' },
    { key: 'proveedor',   label: 'Proveedor', placeholder: 'Opcional' },
    { key: 'contacto',    label: 'Contacto', placeholder: 'Opcional' },
  ],
}

const EMPTY = {
  nombreServicio: '', tipo: 'agua', modoCalculo: 'division_igualitaria', unidadMedida: null,
  activo: true, detalleServicio: {} as Record<string, any>,
}

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

// ── Componente principal ──────────────────────────────────────

export default function ServicesPage() {
  const [selBuilding, setSelBuilding] = useState('')
  const [servicios, setServicios]     = useState<Servicio[]>([])
  const [loading, setLoading]         = useState(false)
  const [modal, setModal]             = useState(false)
  const [editing, setEditing]         = useState<any>(EMPTY)
  const [saving, setSaving]           = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<Servicio | null>(null)
  const [deleting, setDeleting]           = useState(false)
  const [toggling, setToggling]       = useState<string | null>(null)
  const [expanded, setExpanded]       = useState<string | null>(null)

  useEffect(() => { if (selBuilding) load() }, [selBuilding])

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/services', { params: { buildingId: selBuilding, all: true } })
      setServicios(data)
    } catch { toast.error('Error cargando servicios') }
    finally { setLoading(false) }
  }

  const openNew  = () => { setEditing({ ...EMPTY, idEdificio: selBuilding }); setModal(true) }
  const openEdit = (svc: Servicio) => { setEditing({ ...svc, detalleServicio: { ...svc.detalleServicio } }); setModal(true) }
  const close    = () => { setModal(false); setEditing(EMPTY) }

  const setDetalle = (key: string, value: string) => {
    setEditing((prev: any) => ({ ...prev, detalleServicio: { ...prev.detalleServicio, [key]: value } }))
  }

  const save = async () => {
    if (!editing.nombreServicio?.trim()) return toast.error('El nombre es obligatorio')
    if (!editing.tipo)                   return toast.error('Selecciona el tipo')
    if (!editing.modoCalculo)            return toast.error('Selecciona el modo de cálculo')
    setSaving(true)
    try {
      if (editing.id) {
        await api.patch(`/services/${editing.id}`, {
          nombreServicio:  editing.nombreServicio,
          tipo:            editing.tipo,
          modoCalculo:     editing.modoCalculo,
          activo:          editing.activo ?? true,
          detalleServicio: editing.detalleServicio || {},
        })
        toast.success('Servicio actualizado')
      } else {
        await api.post('/services', {
          idEdificio:      selBuilding,
          nombreServicio:  editing.nombreServicio,
          tipo:            editing.tipo,
          modoCalculo:     editing.modoCalculo,
          detalleServicio: editing.detalleServicio || {},
        })
        toast.success('Servicio creado')
      }
      await load(); close()
    } catch (e: any) {
      const msg = e?.response?.data?.message
      toast.error(Array.isArray(msg) ? msg.join(', ') : (msg || 'Error guardando'))
    } finally { setSaving(false) }
  }

  const toggleActivo = async (svc: Servicio) => {
    setToggling(svc.id)
    try {
      await api.patch(`/services/${svc.id}`, { activo: !svc.activo })
      setServicios(prev => prev.map(s => s.id === svc.id ? { ...s, activo: !s.activo } : s))
      toast.success(`${svc.nombreServicio} ${!svc.activo ? 'activado' : 'desactivado'}`)
    } catch { toast.error('Error actualizando') }
    finally { setToggling(null) }
  }

  const activos   = servicios.filter(s => s.activo).length
  const inactivos = servicios.filter(s => !s.activo).length
  const detalleCfg = DETALLE_FIELDS[editing.tipo] || DETALLE_FIELDS['otro']

  const deleteServicio = async (s: Servicio) => {
    setDeleting(true)
    try {
      await api.delete(`/services/${s.id}`)
      toast.success(`"${s.nombreServicio}" desactivado`)
      setConfirmDelete(null)
      await load()
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Error') }
    finally { setDeleting(false) }
  }

  return (
    <div style={{ padding:'2rem', maxWidth:1000, margin:'0 auto' }}>

      {/* Header */}
      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'1.5rem',flexWrap:'wrap',gap:'1rem' }} className="fade-up">
        <div>
          <h1 style={{ fontFamily:'var(--font-display)',fontSize:'1.8rem',fontWeight:700,letterSpacing:'-0.02em',marginBottom:'0.2rem' }}>Servicios</h1>
          <p style={{ color:'var(--text-secondary)',fontSize:'0.875rem' }}>Configura los servicios y su modo de cálculo por edificio</p>
        </div>
        <button onClick={openNew} disabled={!selBuilding} style={{ ...btn, opacity:selBuilding?1:0.5 }}>
          <Plus size={16} /> Nuevo servicio
        </button>
      </div>

      {/* Selector edificio */}
      <div style={{ display:'flex',alignItems:'center',gap:'1rem',marginBottom:'1.5rem',flexWrap:'wrap' }} className="fade-up">
        <div style={{ display:'flex',flexDirection:'column',gap:'0.3rem' }}>
          <label style={{ fontSize:'0.72rem',fontWeight:600,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.05em' }}>Edificio</label>
          <BuildingSelector value={selBuilding} onChange={setSelBuilding} label="EDIFICIO" autoSelect />
        </div>
        {selBuilding && !loading && (
          <div style={{ display:'flex',gap:'0.5rem',alignSelf:'flex-end' }}>
            <span style={{ background:'var(--green-dim)',border:'1px solid rgba(62,207,142,0.2)',color:'var(--green)',borderRadius:4,padding:'0.2rem 0.6rem',fontSize:'0.75rem',fontWeight:600 }}>{activos} activos</span>
            {inactivos > 0 && <span style={{ background:'var(--bg-elevated)',border:'1px solid var(--border)',color:'var(--text-muted)',borderRadius:4,padding:'0.2rem 0.6rem',fontSize:'0.75rem',fontWeight:600 }}>{inactivos} inactivos</span>}
          </div>
        )}
      </div>

      {/* Lista */}
      {loading ? (
        <div style={{ display:'flex',justifyContent:'center',padding:'4rem' }}>
          <Loader2 size={24} color="var(--accent)" style={{ animation:'spin 0.8s linear infinite' }} />
        </div>
      ) : servicios.length === 0 ? (
        <div style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:'1rem',padding:'4rem',background:'var(--bg-surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)' }}>
          <ReceiptText size={36} color="var(--text-muted)" />
          <p style={{ color:'var(--text-muted)' }}>No hay servicios configurados</p>
          <button onClick={openNew} style={btn}><Plus size={14} /> Crear primero</button>
        </div>
      ) : (
        <div style={{ background:'var(--bg-surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',overflow:'hidden' }} className="fade-up">
          <table style={{ width:'100%',borderCollapse:'collapse',fontSize:'0.875rem' }}>
            <thead>
              <tr>
                {['','Servicio','Tipo','Modo de cálculo','Detalle','Estado',''].map((h,i) => (
                  <th key={i} style={{ textAlign:'left',padding:'0.75rem 1rem',color:'var(--text-muted)',fontSize:'0.72rem',fontWeight:600,letterSpacing:'0.05em',textTransform:'uppercase' as const,borderBottom:'1px solid var(--border)',background:'var(--bg-elevated)',whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {servicios.map((svc, i) => {
                const cfg  = TIPO_CFG[svc.tipo] || TIPO_CFG['otro']
                const modo = MODOS.find(m => m.key === svc.modoCalculo)
                const hasDetalle = Object.keys(svc.detalleServicio || {}).filter(k => svc.detalleServicio[k]).length > 0
                const isExpanded = expanded === svc.id

                return (
                  <>
                    <tr key={svc.id} style={{ opacity:svc.activo?1:0.5,...(i%2!==0?{background:'rgba(255,255,255,0.02)'}:{}) }}>
                      {/* Expand */}
                      <td style={{ padding:'0.85rem 0.5rem 0.85rem 1rem',borderBottom:'1px solid rgba(255,255,255,0.03)',width:32 }}>
                        {hasDetalle && (
                          <button onClick={() => setExpanded(isExpanded ? null : svc.id)}
                            style={{ background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)',display:'flex',padding:0 }}>
                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </button>
                        )}
                      </td>
                      <td style={{ padding:'0.85rem 1rem',borderBottom:'1px solid rgba(255,255,255,0.03)' }}>
                        <div style={{ fontWeight:600 }}>{svc.nombreServicio}</div>
                      </td>
                      <td style={{ padding:'0.85rem 1rem',borderBottom:'1px solid rgba(255,255,255,0.03)' }}>
                        <span style={{ display:'inline-flex',alignItems:'center',gap:'0.35rem',background:`${cfg.color}15`,border:`1px solid ${cfg.color}30`,color:cfg.color,borderRadius:4,padding:'0.2rem 0.6rem',fontSize:'0.78rem',fontWeight:600 }}>
                          <cfg.Icon size={11} /> {cfg.label}
                        </span>
                      </td>
                      <td style={{ padding:'0.85rem 1rem',borderBottom:'1px solid rgba(255,255,255,0.03)' }}>
                        <div style={{ fontSize:'0.82rem',fontWeight:500 }}>{modo?.label || svc.modoCalculo}</div>
                        <div style={{ fontSize:'0.72rem',color:'var(--text-muted)' }}>{modo?.desc}</div>
                      </td>
                      {/* Resumen detalle */}
                      <td style={{ padding:'0.85rem 1rem',borderBottom:'1px solid rgba(255,255,255,0.03)',maxWidth:200 }}>
                        {hasDetalle ? (
                          <div style={{ fontSize:'0.75rem',color:'var(--text-secondary)' }}>
                            {svc.detalleServicio.proveedor && <div>🏢 {svc.detalleServicio.proveedor}</div>}
                            {svc.detalleServicio.zonas && <div>📍 {svc.detalleServicio.zonas}</div>}
                            {svc.detalleServicio.frecuencia && <div>🔄 {svc.detalleServicio.frecuencia}</div>}
                          </div>
                        ) : (
                          <span style={{ color:'var(--text-muted)',fontSize:'0.75rem' }}>—</span>
                        )}
                      </td>
                      <td style={{ padding:'0.85rem 1rem',borderBottom:'1px solid rgba(255,255,255,0.03)' }}>
                        <button onClick={() => !toggling && toggleActivo(svc)} disabled={!!toggling}
                          style={{ display:'flex',alignItems:'center',gap:'0.4rem',background:'none',border:'none',cursor:'pointer',fontFamily:'var(--font-body)',fontSize:'0.8rem',color:svc.activo?'var(--green)':'var(--text-muted)',padding:0 }}>
                          {toggling===svc.id
                            ? <Loader2 size={16} style={{ animation:'spin 0.8s linear infinite' }} />
                            : svc.activo ? <ToggleRight size={20} color="var(--green)" /> : <ToggleLeft size={20} color="var(--text-muted)" />
                          }
                          {svc.activo ? 'Activo' : 'Inactivo'}
                        </button>
                      </td>
                      <td style={{ padding:'0.85rem 1rem',borderBottom:'1px solid rgba(255,255,255,0.03)',textAlign:'right' }}>
                        <button onClick={() => openEdit(svc)}
                          style={{ background:'var(--bg-elevated)',border:'1px solid var(--border)',borderRadius:6,width:30,height:30,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'var(--text-secondary)' }}>
                          <Pencil size={13} />
                        </button>
                      </td>
                    </tr>
                    {/* Fila expandida con detalle completo */}
                    {isExpanded && hasDetalle && (
                      <tr key={`${svc.id}-detail`}>
                        <td colSpan={7} style={{ padding:'0 1rem 0.75rem 3.5rem',borderBottom:'1px solid rgba(255,255,255,0.03)',background:'rgba(255,255,255,0.01)' }}>
                          <div style={{ display:'flex',flexWrap:'wrap',gap:'0.75rem' }}>
                            {Object.entries(svc.detalleServicio).filter(([,v]) => v).map(([k, v]) => (
                              <div key={k} style={{ background:'var(--bg-elevated)',border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:'0.35rem 0.65rem' }}>
                                <span style={{ fontSize:'0.68rem',color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.04em',display:'block' }}>{k.replace(/_/g,' ')}</span>
                                <span style={{ fontSize:'0.8rem',fontWeight:500 }}>{v}</span>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:'1rem',backdropFilter:'blur(4px)' }} onClick={close}>
          <div style={{ background:'var(--bg-surface)',border:'1px solid var(--border-accent)',borderRadius:'var(--radius-lg)',width:'100%',maxWidth:560,maxHeight:'90vh',overflowY:'auto',boxShadow:'var(--shadow-lg)' }} onClick={e => e.stopPropagation()} className="fade-up">

            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',padding:'1.25rem 1.5rem',borderBottom:'1px solid var(--border)',position:'sticky',top:0,background:'var(--bg-surface)',zIndex:1 }}>
              <h2 style={{ fontFamily:'var(--font-display)',fontSize:'1.1rem',fontWeight:700 }}>{editing.id?'Editar servicio':'Nuevo servicio'}</h2>
              <button onClick={close} style={{ background:'var(--bg-elevated)',border:'1px solid var(--border)',borderRadius:6,width:32,height:32,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'var(--text-secondary)' }}><X size={18} /></button>
            </div>

            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem',padding:'1.5rem' }}>
              <Field label="Nombre *" span={2}>
                <input value={editing.nombreServicio||''} onChange={e=>setEditing({...editing,nombreServicio:e.target.value})} placeholder="Ej: Agua Sedapal, Limpieza edificio..." autoFocus />
              </Field>
              <Field label="Tipo *">
                <select value={editing.tipo||'agua'} onChange={e=>setEditing({...editing,tipo:e.target.value,detalleServicio:{}})}>
                  {TIPOS.map(t=><option key={t.key} value={t.key}>{t.label}</option>)}
                </select>
              </Field>
              <Field label="Modo de cálculo *">
                <select value={editing.modoCalculo||'division_igualitaria'} onChange={e=>{
                  const val = e.target.value
                  setEditing({...editing, modoCalculo:val, unidadMedida: (val==='por_consumo_m3'||val==='por_consumo_ajustado')?(editing.unidadMedida||'m3'):null})
                }}>
                  {MODOS.map(m=><option key={m.key} value={m.key}>{m.label}</option>)}
                </select>
              </Field>
              {(editing.modoCalculo === 'por_consumo_m3' || editing.modoCalculo === 'por_consumo_ajustado') && (
                <Field label="Unidad de medida *">
                  <select value={editing.unidadMedida||'m3'} onChange={e=>setEditing({...editing,unidadMedida:e.target.value})} style={{ width:'100%' }}>
                    <option value="m3">m³ — Metros cúbicos (agua, gas)</option>
                    <option value="kwh">kWh — Kilovatios hora (luz)</option>
                    <option value="unidad">Unidad — Conteo genérico</option>
                  </select>
                </Field>
              )}

              {/* Descripción modo */}
              <div style={{ gridColumn:'span 2',background:'var(--bg-elevated)',border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:'0.65rem 0.9rem' }}>
                <p style={{ fontSize:'0.78rem',color:'var(--text-secondary)' }}>
                  <strong>Modo: </strong>{MODOS.find(m=>m.key===editing.modoCalculo)?.desc||'—'}
                </p>
              </div>

              {/* Campos de detalle dinámicos según tipo */}
              {detalleCfg.length > 0 && (
                <div style={{ gridColumn:'span 2',borderTop:'1px solid var(--border)',paddingTop:'1rem' }}>
                  <p style={{ fontSize:'0.72rem',fontWeight:600,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:'0.75rem' }}>
                    Detalle del servicio (opcional)
                  </p>
                  <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.75rem' }}>
                    {detalleCfg.map(f => (
                      <Field key={f.key} label={f.label} span={f.key==='descripcion'||f.key==='zonas'?2:1}>
                        <input
                          value={editing.detalleServicio?.[f.key]||''}
                          onChange={e=>setDetalle(f.key,e.target.value)}
                          placeholder={f.placeholder}
                        />
                      </Field>
                    ))}
                  </div>
                </div>
              )}

              {/* Estado — solo edición */}
              {editing.id && (
                <Field label="Estado" span={2}>
                  <div style={{ display:'flex',gap:'0.5rem' }}>
                    {[true,false].map(val=>(
                      <button key={String(val)} type="button" onClick={()=>setEditing({...editing,activo:val})}
                        style={{ flex:1,padding:'0.5rem',borderRadius:'var(--radius)',border:`1.5px solid ${editing.activo===val?(val?'var(--green)':'#f87171'):'var(--border)'}`,background:editing.activo===val?(val?'var(--green-dim)':'rgba(248,113,113,0.1)'):'var(--bg-elevated)',color:editing.activo===val?(val?'var(--green)':'#f87171'):'var(--text-muted)',cursor:'pointer',fontWeight:600,fontSize:'0.82rem',fontFamily:'var(--font-body)',transition:'all 0.15s' }}>
                        {val?'✓ Activo':'✗ Inactivo'}
                      </button>
                    ))}
                  </div>
                </Field>
              )}
            </div>

            <div style={{ display:'flex',justifyContent:'flex-end',gap:'0.75rem',padding:'1rem 1.5rem',borderTop:'1px solid var(--border)',position:'sticky',bottom:0,background:'var(--bg-surface)' }}>
              <button onClick={close} style={btn2}>Cancelar</button>
              <button onClick={save} disabled={saving} style={btn}>
                {saving?<Loader2 size={15} style={{ animation:'spin 0.8s linear infinite' }}/>:<Save size={15}/>}
                {editing.id?'Guardar cambios':'Crear servicio'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmar desactivación */}
      {confirmDelete && (
        <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.82)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1100,padding:'1rem',backdropFilter:'blur(4px)' }}
          onClick={() => !deleting && setConfirmDelete(null)}>
          <div style={{ background:'var(--bg-surface)',border:'1px solid rgba(248,113,113,0.4)',borderRadius:'var(--radius-lg)',width:'100%',maxWidth:420,padding:'2rem',boxShadow:'var(--shadow-lg)' }}
            onClick={e => e.stopPropagation()} className="fade-up">
            <div style={{ display:'flex',alignItems:'center',gap:'0.75rem',marginBottom:'1rem' }}>
              <div style={{ width:44,height:44,borderRadius:12,background:'rgba(248,113,113,0.1)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
                <AlertTriangle size={22} color="#f87171"/>
              </div>
              <div>
                <h2 style={{ fontWeight:700,fontSize:'1rem',marginBottom:'0.1rem' }}>Desactivar servicio</h2>
                <p style={{ fontSize:'0.82rem',color:'var(--text-muted)' }}>Se conservará el historial</p>
              </div>
            </div>
            <div style={{ background:'rgba(248,113,113,0.06)',border:'1px solid rgba(248,113,113,0.2)',borderRadius:'var(--radius)',padding:'0.9rem 1rem',marginBottom:'1.25rem' }}>
              <p style={{ fontSize:'0.875rem' }}>Se desactivará <strong style={{ color:'#f87171' }}>{confirmDelete.nombreServicio}</strong>. El historial se conservará.</p>
            </div>
            <div style={{ display:'flex',justifyContent:'flex-end',gap:'0.75rem' }}>
              <button onClick={() => setConfirmDelete(null)} disabled={deleting}
                style={{ display:'flex',alignItems:'center',gap:'0.4rem',background:'var(--bg-elevated)',color:'var(--text-secondary)',fontSize:'0.875rem',padding:'0.5rem 0.9rem',borderRadius:'var(--radius)',border:'1px solid var(--border)',cursor:'pointer',fontFamily:'var(--font-body)' }}>
                Cancelar
              </button>
              <button onClick={() => deleteServicio(confirmDelete)} disabled={deleting}
                style={{ display:'flex',alignItems:'center',gap:'0.5rem',background:'#f87171',color:'#fff',fontWeight:700,fontSize:'0.875rem',padding:'0.6rem 1.1rem',borderRadius:'var(--radius)',border:'none',cursor:deleting?'wait':'pointer',fontFamily:'var(--font-body)',opacity:deleting?0.7:1 }}>
                {deleting ? <Loader2 size={14} style={{ animation:'spin 0.8s linear infinite' }}/> : <Trash2 size={14}/>}
                Desactivar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}