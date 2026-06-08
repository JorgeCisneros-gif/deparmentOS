// src/pages/NotificacionesPage.tsx
import { useEffect, useState, useCallback } from 'react'
import api from '../services/api'
import { useTz } from '../store/timezone.store'
import toast from 'react-hot-toast'
import {
  MessageSquare, Settings, ChevronLeft, ChevronRight,
  Save, RotateCcw, Send, Copy, Check, Loader2, Pencil,
  X, CheckCircle2, AlertCircle, Info, Plus, Trash2, Calculator,
  Bell, ToggleLeft, ToggleRight, Clock, Calendar, Users, Building2,
} from 'lucide-react'
import { useAuthStore } from '../store/auth.store'
import BuildingSelector from '../components/common/BuildingSelector'
import { useBuildings } from '../hooks/useBuildings'

// ── Tipos ─────────────────────────────────────────────────────

interface Building  { id: string; nombre: string }
interface TemplateVar { variable: string; descripcion: string; tipo?: string; emoji?: string; formula?: string }
interface AllVars   { sistema: TemplateVar[]; servicios: TemplateVar[]; personalizadas: TemplateVar[] }
interface CustomVar { nombre: string; formula: string; descripcion: string }
interface FeeMessage {
  feeId: string; depto: string; propietario: string; telefono: string
  mensajeTexto: string; mensajeEnviado: boolean; fechaVencimiento: string
  desglose: { lineas: Array<{ key: string; label: string; monto: number; tipo: string }>; total: number }
}

const MESES = ['','Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Setiembre','Octubre','Noviembre','Diciembre']
type Tab = 'mensajes' | 'plantilla' | 'variables' | 'programacion' | 'tipos'

// ── Componente principal ──────────────────────────────────────

export default function NotificacionesPage() {
  const { fmt, today } = useTz()
  const { buildings }             = useBuildings()
  const [tab, setTab]               = useState<Tab>('mensajes')
  const [selBuilding, setSelBuilding] = useState('')
  const [mes, setMes]               = useState(new Date().getMonth() + 1)
  const [anio, setAnio]             = useState(new Date().getFullYear())
  const [messages, setMessages]     = useState<FeeMessage[]>([])
  const [loading, setLoading]       = useState(false)
  const [templateText, setTemplateText] = useState('')
  const [templateNombre, setTemplateNombre] = useState('Plantilla principal')
  const [allVars, setAllVars]       = useState<AllVars>({ sistema:[], servicios:[], personalizadas:[] })
  const [customVars, setCustomVars] = useState<CustomVar[]>([])
  const [savingTpl, setSavingTpl]   = useState(false)
  const [savingVars, setSavingVars] = useState(false)
  const [modalMsg, setModalMsg]     = useState<FeeMessage | null>(null)
  const [editModal, setEditModal]   = useState<FeeMessage | null>(null)
  const [editData, setEditData]     = useState<any>({})

  // ── Estado programación ──────────────────────────────────────
  const { isSupervisor } = useAuthStore()
  const [grupos, setGrupos]                 = useState<any[]>([])
  const [selectedGrupoNotif, setSelectedGrupoNotif] = useState('')
  const [selectedEdifNotif, setSelectedEdifNotif]   = useState('')
  const [edificiosGrupo, setEdificiosGrupo] = useState<any[]>([])
  const [notifConfigs, setNotifConfigs]     = useState<any[]>([])
  const [notifTipos, setNotifTipos]         = useState<any[]>([])
  const [loadingConfigs, setLoadingConfigs] = useState(false)
  const [savingConfig, setSavingConfig]     = useState<string | null>(null)

  // Cargar grupos para supervisor
  useEffect(() => {
    if (!isSupervisor()) return
    api.get('/grupos').then(r => {
      // Incluir SuperGrupo para que el supervisor pueda configurar sus edificios
      setGrupos(r.data || [])
    }).catch(() => {})
  }, [])

  // Al seleccionar grupo → cargar edificios
  useEffect(() => {
    if (!selectedGrupoNotif) { setEdificiosGrupo([]); setSelectedEdifNotif(''); return }
    api.get('/buildings').then(r => {
      setEdificiosGrupo((r.data || []).filter((b: any) => b.idGrupo === selectedGrupoNotif))
    }).catch(() => {})
  }, [selectedGrupoNotif])

  // Al seleccionar edificio (para programación) → cargar configs
  useEffect(() => {
    const id = selectedEdifNotif || selBuilding
    if (!id) return
    loadNotifConfigs(id)
  }, [selectedEdifNotif, selBuilding])

  // Cargar tipos (para tab tipos)
  useEffect(() => {
    if (tab !== 'tipos') return
    api.get('/notificacion-tipo?soloActivos=false')
      .then(r => setNotifTipos(r.data || []))
      .catch(() => {})
  }, [tab])

  useEffect(() => {
    if (!selBuilding) return
    loadTemplate()
    loadAllVars()
    loadCustomVars()
    if (tab === 'mensajes') loadMessages()
  }, [selBuilding])

  useEffect(() => { if (selBuilding && tab === 'mensajes') loadMessages() }, [mes, anio])

  const loadMessages = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/notifications/messages/period', { params: { buildingId: selBuilding, month: mes, year: anio } })
      setMessages(data.mensajes || [])
    } catch (e: any) {
      if (e?.response?.status !== 400) toast.error('Error cargando mensajes')
      setMessages([])
    } finally { setLoading(false) }
  }, [selBuilding, mes, anio])

  const loadTemplate = async () => {
    try {
      const { data } = await api.get(`/notifications/template/${selBuilding}`)
      setTemplateText(data.templateText || '')
      setTemplateNombre(data.nombre || 'Plantilla principal')
    } catch {}
  }

  const loadAllVars = async () => {
    try {
      const { data } = await api.get(`/notifications/template/variables/all/${selBuilding}`)
      setAllVars(data)
    } catch {}
  }

  const loadCustomVars = async () => {
    try {
      const { data } = await api.get(`/notifications/template/custom-vars/${selBuilding}`)
      setCustomVars(Array.isArray(data) ? data : [])
    } catch { setCustomVars([]) }
  }

  const saveTemplate = async () => {
    setSavingTpl(true)
    try {
      await api.patch(`/notifications/template/${selBuilding}`, { templateText, nombre: templateNombre })
      toast.success('Plantilla guardada')
    } catch { toast.error('Error guardando plantilla') }
    finally { setSavingTpl(false) }
  }

  const resetTemplate = async () => {
    try {
      const { data } = await api.post(`/notifications/template/${selBuilding}/reset`)
      setTemplateText(data.templateText || '')
      toast.success('Plantilla restablecida')
    } catch { toast.error('Error') }
  }

  const saveCustomVars = async () => {
    setSavingVars(true)
    try {
      await api.patch(`/notifications/template/custom-vars/${selBuilding}`, { variables: customVars })
      toast.success('Variables guardadas')
      await loadAllVars()
    } catch (e: any) {
      const msg = e?.response?.data?.message
      toast.error(Array.isArray(msg) ? msg.join(', ') : (msg || 'Error guardando'))
    } finally { setSavingVars(false) }
  }

  const insertVar = (v: string) => setTemplateText(prev => prev + v)

  const addCustomVar = () => setCustomVars(prev => [...prev, { nombre: '', formula: '', descripcion: '' }])
  const removeCustomVar = (i: number) => setCustomVars(prev => prev.filter((_, idx) => idx !== i))
  const updateCustomVar = (i: number, field: keyof CustomVar, value: string) =>
    setCustomVars(prev => prev.map((cv, idx) => idx === i ? { ...cv, [field]: value } : cv))

  const openEdit = (msg: FeeMessage) => {
    const montos: Record<string, number> = {}
    msg.desglose.lineas.forEach(l => { montos[l.key] = l.monto })
    setEditData({ montosServicios: montos, fechaVencimiento: msg.fechaVencimiento || '' })
    setEditModal(msg)
  }

  const saveEdit = async () => {
    if (!editModal) return
    try {
      const montosUpdate: Record<string, { monto: number }> = {}
      for (const [key, monto] of Object.entries(editData.montosServicios)) {
        montosUpdate[key] = { monto: parseFloat(monto as string) || 0 }
      }
      await api.patch(`/notifications/fee/${editModal.feeId}`, {
        fechaVencimiento: editData.fechaVencimiento || undefined,
        montosServicios: montosUpdate,
      })
      toast.success('Cuota actualizada')
      setEditModal(null)
      await loadMessages()
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Error guardando') }
  }

  const loadNotifConfigs = async (idEdificio: string) => {
    setLoadingConfigs(true)
    try {
      const { data } = await api.get(`/notificacion-config/edificio/${idEdificio}`)
      setNotifConfigs(data || [])
    } catch {} finally { setLoadingConfigs(false) }
  }

  const saveNotifConfig = async (config: any) => {
    const idEdificio = selectedEdifNotif || selBuilding
    if (!idEdificio) return toast.error('Selecciona un edificio')
    setSavingConfig(config.idTipo)
    try {
      await api.put(`/notificacion-config/edificio/${idEdificio}`, config)
      toast.success('Configuración guardada')
      loadNotifConfigs(idEdificio)
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Error guardando')
    } finally { setSavingConfig(null) }
  }

  const navMes = (dir: number) => {
    let m = mes + dir, a = anio
    if (m > 12) { m = 1; a++ }; if (m < 1) { m = 12; a-- }
    setMes(m); setAnio(a)
  }

  const buildingName = buildings.find(b => b.id === selBuilding)?.nombre || ''
  const enviados = messages.filter(m => m.mensajeEnviado).length

  // Preview de la plantilla con datos de ejemplo
  const previewText = templateText
    .replace('{edificio}', buildingName || 'Edificio')
    .replace('{depto}', '201')
    .replace('{periodo}', `${MESES[mes]} ${anio}`)
    .replace('{lineas_desglose}', '💧 Agua Sedapal (5.234 m³): S/. 44.13\n💡 Luz áreas comunes: S/. 7.25\n📡 Internet edificio: S/. 3.00')
    .replace('{total}', '54.38')
    .replace('{vencimiento}', '15/06/2026')
    .replace('{cuentas}', '💳 Transferencia: BCP: 191-12345678-0-56\n\n')
    .replace(/{svc_agua}/g, '44.13').replace(/{svc_luz}/g, '7.25').replace(/{svc_internet}/g, '3.00')
    .replace(/{svc_[a-z_]+}/g, '0.00').replace(/{m3}/g, '5.234').replace(/{precio_m3}/g, '7.9100')
    .replace(/{[a-z_]+}/g, '0.00')

  return (
    <div style={{ padding:'2rem', maxWidth:1100, margin:'0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom:'1.5rem' }} className="fade-up">
        <h1 style={{ fontFamily:'var(--font-display)',fontSize:'1.8rem',fontWeight:700,letterSpacing:'-0.02em',marginBottom:'0.2rem' }}>Notificaciones</h1>
        <p style={{ color:'var(--text-secondary)',fontSize:'0.875rem' }}>Gestiona mensajes, plantilla y variables por edificio</p>
      </div>

      {/* Controles */}
      <div style={{ display:'flex',alignItems:'flex-end',gap:'1.25rem',marginBottom:'1.5rem',flexWrap:'wrap' }} className="fade-up">
        <div style={{ display:'flex',flexDirection:'column',gap:'0.3rem' }}>
          <label style={s.ctrlLabel}>Edificio</label>
          <BuildingSelector value={selBuilding} onChange={setSelBuilding} label="EDIFICIO" autoSelect />
        </div>
        {tab === 'mensajes' && (
          <div style={{ display:'flex',flexDirection:'column',gap:'0.3rem' }}>
            <label style={s.ctrlLabel}>Período</label>
            <div style={s.mesNav}>
              <button onClick={() => navMes(-1)} style={s.navBtn}><ChevronLeft size={16} /></button>
              <span style={s.mesLabel}>{MESES[mes]} {anio}</span>
              <button onClick={() => navMes(1)} style={s.navBtn}><ChevronRight size={16} /></button>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display:'flex',gap:'0.25rem',marginBottom:'1.5rem',background:'var(--bg-elevated)',borderRadius:'var(--radius)',padding:'0.25rem',width:'fit-content' }}>
        {(isSupervisor()
          ? ([['mensajes','Mensajes',MessageSquare],['plantilla','Plantilla',Settings],['variables','Variables',Calculator],['programacion','Programación',Bell],['tipos','Tipos de Notif.',Settings]] as any[])
          : ([['mensajes','Mensajes',MessageSquare],['plantilla','Plantilla',Settings],['variables','Variables',Calculator],['programacion','Programación',Bell]] as any[])
        ).map(([key,label,Icon]) => (
          <button key={key} onClick={() => setTab(key)}
            style={{ display:'flex',alignItems:'center',gap:'0.4rem',padding:'0.45rem 1rem',borderRadius:'calc(var(--radius) - 2px)',border:'none',background:tab===key?'var(--bg-surface)':'transparent',color:tab===key?'var(--accent)':'var(--text-secondary)',fontWeight:tab===key?600:400,fontSize:'0.875rem',cursor:'pointer',fontFamily:'var(--font-body)',boxShadow:tab===key?'0 1px 3px rgba(0,0,0,0.2)':undefined }}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {/* ── TAB MENSAJES ── */}
      {tab === 'mensajes' && (
        <>
          {messages.length > 0 && (
            <div style={{ display:'flex',gap:'1rem',marginBottom:'1.25rem',flexWrap:'wrap' }}>
              {[['Total deptos',messages.length,undefined],['Enviados',enviados,'var(--green)'],['Pendientes',messages.length-enviados,'var(--accent)']].map(([l,v,c]) => (
                <div key={String(l)} style={{ background:'var(--bg-surface)',border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:'0.6rem 1rem',minWidth:120 }}>
                  <p style={{ fontSize:'0.7rem',color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.05em' }}>{String(l)}</p>
                  <p style={{ fontWeight:700,fontSize:'1.2rem',color:String(c)||'var(--text-primary)' }}>{String(v)}</p>
                </div>
              ))}
            </div>
          )}
          {loading ? (
            <div style={{ display:'flex',justifyContent:'center',padding:'4rem' }}>
              <Loader2 size={24} color="var(--accent)" style={{ animation:'spin 0.8s linear infinite' }} />
            </div>
          ) : messages.length === 0 ? (
            <div style={{ textAlign:'center',padding:'4rem',background:'var(--bg-surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',color:'var(--text-muted)' }}>
              <MessageSquare size={40} style={{ marginBottom:'0.75rem',opacity:0.4 }} />
              <p>No hay cuotas para este período</p>
              <p style={{ fontSize:'0.82rem',marginTop:'0.4rem' }}>Ve a <strong>Cobros</strong> y calcula las cuotas primero</p>
            </div>
          ) : (
            <div style={{ display:'flex',flexDirection:'column',gap:'0.75rem' }}>
              {messages.map(msg => (
                <MensajeRow key={msg.feeId} msg={msg} onPreview={() => setModalMsg(msg)} onEdit={() => openEdit(msg)} onReload={loadMessages} />
              ))}
            </div>
          )}
        </>
      )}

      {/* ── TAB PLANTILLA ── */}
      {tab === 'plantilla' && (
        <div style={{ display:'grid',gridTemplateColumns:'1fr 360px',gap:'1.5rem',alignItems:'start' }} className="fade-up">
          <div style={{ background:'var(--bg-surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',overflow:'hidden' }}>
            <div style={{ padding:'1rem 1.25rem',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center' }}>
              <div><h3 style={{ fontWeight:600,fontSize:'0.95rem',marginBottom:'0.15rem' }}>Editor de plantilla</h3>
                <p style={{ fontSize:'0.75rem',color:'var(--text-muted)' }}>{buildingName}</p></div>
              <div style={{ display:'flex',gap:'0.5rem' }}>
                <button onClick={resetTemplate} style={{ ...s.btnSm }}><RotateCcw size={13} /> Restablecer</button>
                <button onClick={saveTemplate} disabled={savingTpl} style={{ ...s.btnSm,background:'var(--accent)',color:'#0f1117',border:'none' }}>
                  {savingTpl?<Loader2 size={13} style={{ animation:'spin 0.8s linear infinite' }}/>:<Save size={13}/>} Guardar
                </button>
              </div>
            </div>
            <div style={{ padding:'1rem 1.25rem' }}>
              <div style={{ marginBottom:'0.75rem' }}>
                <label style={s.fieldLabel}>Nombre de la plantilla</label>
                <input value={templateNombre} onChange={e => setTemplateNombre(e.target.value)} style={{ width:'100%' }} />
              </div>
              <label style={s.fieldLabel}>Texto del mensaje</label>
              <textarea value={templateText} onChange={e => setTemplateText(e.target.value)} rows={16}
                style={{ width:'100%',fontFamily:'monospace',fontSize:'0.82rem',resize:'vertical',lineHeight:1.6 }} />
            </div>
          </div>

          {/* Panel derecho */}
          <div style={{ display:'flex',flexDirection:'column',gap:'1rem' }}>
            {/* Variables del sistema */}
            <VarsPanel title="Variables del sistema" vars={allVars.sistema} color="var(--blue)" onInsert={insertVar} />
            {/* Variables de servicios */}
            <VarsPanel title="Variables de servicios" vars={allVars.servicios} color="var(--green)" onInsert={insertVar} hint="Monto individual por departamento" />
            {/* Variables personalizadas */}
            {allVars.personalizadas.length > 0 && (
              <VarsPanel title="Variables personalizadas" vars={allVars.personalizadas} color="#a78bfa" onInsert={insertVar} hint="Definidas en la pestaña Variables" />
            )}
            {/* Preview */}
            <div style={{ background:'var(--bg-surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',padding:'1rem 1.25rem' }}>
              <h4 style={{ fontWeight:600,fontSize:'0.875rem',marginBottom:'0.6rem' }}>Vista previa</h4>
              <pre style={{ whiteSpace:'pre-wrap',wordBreak:'break-word',fontSize:'0.75rem',lineHeight:1.6,color:'var(--text-secondary)',background:'var(--bg-elevated)',borderRadius:6,padding:'0.75rem',margin:0,fontFamily:'var(--font-body)',maxHeight:300,overflow:'auto' }}>
                {previewText}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB VARIABLES PERSONALIZADAS ── */}
      {tab === 'variables' && (
        <div style={{ maxWidth:700 }} className="fade-up">
          <div style={{ background:'var(--bg-surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',overflow:'hidden' }}>
            <div style={{ padding:'1rem 1.25rem',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center' }}>
              <div>
                <h3 style={{ fontWeight:600,fontSize:'0.95rem',marginBottom:'0.15rem' }}>Variables personalizadas</h3>
                <p style={{ fontSize:'0.75rem',color:'var(--text-muted)' }}>Crea variables calculadas combinando otras variables</p>
              </div>
              <button onClick={addCustomVar} style={{ ...s.btnSm,background:'var(--accent)',color:'#0f1117',border:'none' }}>
                <Plus size={13} /> Nueva variable
              </button>
            </div>

            <div style={{ padding:'1.25rem' }}>
              {/* Info */}
              <div style={{ background:'var(--blue-dim)',border:'1px solid rgba(74,158,255,0.15)',borderRadius:'var(--radius)',padding:'0.75rem 1rem',marginBottom:'1.25rem' }}>
                <p style={{ fontSize:'0.78rem',color:'var(--text-secondary)',lineHeight:1.5 }}>
                  💡 Las variables personalizadas solo admiten <strong>sumas (+)</strong> y <strong>restas (-)</strong> de variables numéricas.<br />
                  Ejemplo: <code style={{ background:'rgba(255,255,255,0.1)',padding:'0 0.3rem',borderRadius:3 }}>{`{svc_luz} + {svc_internet}`}</code> → suma luz + internet de cada depto.
                </p>
              </div>

              {customVars.length === 0 ? (
                <div style={{ textAlign:'center',padding:'2rem',color:'var(--text-muted)' }}>
                  <Calculator size={32} style={{ marginBottom:'0.5rem',opacity:0.4 }} />
                  <p style={{ fontSize:'0.875rem' }}>No hay variables personalizadas</p>
                  <p style={{ fontSize:'0.8rem',marginTop:'0.25rem' }}>Crea una para combinar montos de servicios en la plantilla</p>
                </div>
              ) : (
                <div style={{ display:'flex',flexDirection:'column',gap:'0.75rem' }}>
                  {customVars.map((cv, i) => (
                    <div key={i} style={{ background:'var(--bg-elevated)',border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:'0.9rem' }}>
                      <div style={{ display:'flex',gap:'0.75rem',marginBottom:'0.6rem' }}>
                        <div style={{ flex:1 }}>
                          <label style={s.fieldLabel}>Nombre de la variable *</label>
                          <div style={{ display:'flex',alignItems:'center',gap:'0.4rem' }}>
                            <span style={{ color:'var(--text-muted)',fontSize:'0.9rem',fontFamily:'monospace' }}>{`{`}</span>
                            <input value={cv.nombre} onChange={e => updateCustomVar(i,'nombre',e.target.value)}
                              placeholder="ej: servicios_fijos" style={{ flex:1,fontFamily:'monospace' }} />
                            <span style={{ color:'var(--text-muted)',fontSize:'0.9rem',fontFamily:'monospace' }}>{`}`}</span>
                          </div>
                        </div>
                        <button onClick={() => removeCustomVar(i)}
                          style={{ background:'rgba(248,113,113,0.1)',border:'1px solid rgba(248,113,113,0.3)',borderRadius:6,width:30,height:30,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'#f87171',alignSelf:'flex-end',marginBottom:'0.25rem',flexShrink:0 }}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                      <div style={{ marginBottom:'0.6rem' }}>
                        <label style={s.fieldLabel}>Fórmula * (solo + y -)</label>
                        <input value={cv.formula} onChange={e => updateCustomVar(i,'formula',e.target.value)}
                          placeholder="ej: {svc_luz} + {svc_internet}" style={{ width:'100%',fontFamily:'monospace',fontSize:'0.85rem' }} />
                      </div>
                      <div>
                        <label style={s.fieldLabel}>Descripción</label>
                        <input value={cv.descripcion} onChange={e => updateCustomVar(i,'descripcion',e.target.value)}
                          placeholder="ej: Suma de servicios fijos sin agua" style={{ width:'100%' }} />
                      </div>
                      {/* Preview de la variable disponible */}
                      {cv.nombre && (
                        <div style={{ marginTop:'0.5rem',fontSize:'0.72rem',color:'var(--green)' }}>
                          ✓ Disponible en plantilla como <code style={{ background:'rgba(62,207,142,0.1)',padding:'0 0.3rem',borderRadius:3,fontFamily:'monospace' }}>{`{${cv.nombre}}`}</code>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {customVars.length > 0 && (
                <div style={{ marginTop:'1.25rem',display:'flex',justifyContent:'flex-end' }}>
                  <button onClick={saveCustomVars} disabled={savingVars} style={{ ...s.btnSm,background:'var(--accent)',color:'#0f1117',border:'none',padding:'0.55rem 1.2rem' }}>
                    {savingVars?<Loader2 size={14} style={{ animation:'spin 0.8s linear infinite' }}/>:<Save size={14}/>}
                    Guardar variables
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB PROGRAMACIÓN ── */}
      {tab === 'programacion' && (
        <ProgramacionTab
          isSupervisor={isSupervisor()}
          grupos={grupos}
          selectedGrupoNotif={selectedGrupoNotif}
          onGrupoChange={setSelectedGrupoNotif}
          edificiosGrupo={edificiosGrupo}
          selectedEdifNotif={selectedEdifNotif}
          onEdifChange={setSelectedEdifNotif}
          selBuilding={selBuilding}
          configs={notifConfigs}
          loadingConfigs={loadingConfigs}
          savingConfig={savingConfig}
          onSave={saveNotifConfig}
        />
      )}

      {/* ── TAB TIPOS (solo supervisor) ── */}
      {tab === 'tipos' && isSupervisor() && (
        <TiposNotifTab
          tipos={notifTipos}
          onReload={() => api.get('/notificacion-tipo?soloActivos=false').then(r => setNotifTipos(r.data || []))}
        />
      )}

      {/* Modales */}
      {modalMsg && <MensajeModal msg={modalMsg} onClose={() => setModalMsg(null)} onReload={async () => { setModalMsg(null); await loadMessages() }} />}

      {editModal && (
        <div style={s.overlay} onClick={() => setEditModal(null)}>
          <div style={{ ...s.modal, maxWidth:480 }} onClick={e => e.stopPropagation()} className="fade-up">
            <div style={s.modalHeader}>
              <h2 style={s.modalTitle}><Pencil size={16} /> Editar cuota — Depto {editModal.depto}</h2>
              <button onClick={() => setEditModal(null)} style={s.closeBtn}><X size={18} /></button>
            </div>
            <div style={{ padding:'1.5rem',display:'flex',flexDirection:'column',gap:'1rem' }}>
              <div>
                <label style={s.fieldLabel}>Fecha de vencimiento *</label>
                <input type="date" value={editData.fechaVencimiento||''} onChange={e => setEditData((p: any) => ({ ...p, fechaVencimiento: e.target.value }))} />
              </div>
              <div>
                <label style={s.fieldLabel}>Montos por servicio</label>
                <div style={{ display:'flex',flexDirection:'column',gap:'0.5rem' }}>
                  {editModal.desglose.lineas.map(l => (
                    <div key={l.key} style={{ display:'flex',alignItems:'center',gap:'0.75rem',background:'var(--bg-elevated)',borderRadius:'var(--radius)',padding:'0.5rem 0.75rem' }}>
                      <span style={{ flex:1,fontSize:'0.85rem' }}>{l.label}</span>
                      <span style={{ fontSize:'0.75rem',color:'var(--text-muted)' }}>S/.</span>
                      <input type="number" step="0.01" value={editData.montosServicios?.[l.key] ?? l.monto}
                        onChange={e => setEditData((p: any) => ({ ...p, montosServicios: { ...p.montosServicios, [l.key]: e.target.value } }))}
                        style={{ width:90,fontFamily:'monospace',textAlign:'right',fontWeight:600 }} />
                    </div>
                  ))}
                  <div style={{ display:'flex',justifyContent:'space-between',padding:'0.5rem 0.75rem',borderTop:'1px solid var(--border)',fontWeight:700 }}>
                    <span>Total</span>
                    <span style={{ color:'var(--accent)' }}>
                      S/. {Object.values(editData.montosServicios||{}).reduce((a:number,b) => a+(parseFloat(b as string)||0), 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div style={s.modalFooter}>
              <button onClick={() => setEditModal(null)} style={s.btnSecondary}>Cancelar</button>
              <button onClick={saveEdit} style={s.btnPrimary}><Save size={14} /> Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Panel de variables ────────────────────────────────────────

function VarsPanel({ title, vars, color, onInsert, hint }: any) {
  if (!vars?.length) return null
  return (
    <div style={{ background:'var(--bg-surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',padding:'1rem 1.25rem' }}>
      <h4 style={{ fontWeight:600,fontSize:'0.875rem',marginBottom:'0.2rem',color }}>
        <Info size={13} style={{ marginRight:'0.3rem',verticalAlign:'middle' }} />{title}
      </h4>
      {hint && <p style={{ fontSize:'0.7rem',color:'var(--text-muted)',marginBottom:'0.6rem' }}>{hint}</p>}
      <div style={{ display:'flex',flexDirection:'column',gap:'0.35rem',marginTop:'0.5rem' }}>
        {vars.map((v: any) => (
          <button key={v.variable} onClick={() => onInsert(v.variable)}
            style={{ display:'flex',justifyContent:'space-between',alignItems:'center',background:'var(--bg-elevated)',border:'1px solid var(--border)',borderRadius:6,padding:'0.4rem 0.6rem',cursor:'pointer',textAlign:'left',fontFamily:'var(--font-body)',gap:'0.5rem' }}>
            <code style={{ fontSize:'0.75rem',color,fontWeight:600,flexShrink:0 }}>{v.variable}</code>
            <span style={{ fontSize:'0.7rem',color:'var(--text-muted)',textAlign:'right' }}>{v.descripcion}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Fila de mensaje ───────────────────────────────────────────

function MensajeRow({ msg, onPreview, onEdit, onReload }: any) {
  const [copied, setCopied] = useState(false)
  const copy = () => { navigator.clipboard.writeText(msg.mensajeTexto); setCopied(true); setTimeout(() => setCopied(false), 2000) }
  return (
    <div style={{ background:'var(--bg-surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',padding:'1rem 1.25rem',display:'flex',alignItems:'center',gap:'1rem',flexWrap:'wrap' }}>
      <div style={{ width:36,height:36,borderRadius:'50%',background:msg.mensajeEnviado?'var(--green-dim)':'var(--bg-elevated)',border:`1px solid ${msg.mensajeEnviado?'rgba(62,207,142,0.3)':'var(--border)'}`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
        {msg.mensajeEnviado ? <CheckCircle2 size={18} color="var(--green)" /> : <AlertCircle size={18} color="var(--text-muted)" />}
      </div>
      <div style={{ flex:1,minWidth:120 }}>
        <p style={{ fontWeight:600,fontSize:'0.9rem' }}>Depto {msg.depto}</p>
        <p style={{ fontSize:'0.78rem',color:'var(--text-secondary)' }}>{msg.propietario} · {msg.telefono}</p>
      </div>
      <div style={{ textAlign:'right' }}>
        <p style={{ fontWeight:700,color:'var(--accent)',fontVariantNumeric:'tabular-nums' }}>S/. {msg.desglose.total.toFixed(2)}</p>
        {msg.fechaVencimiento && <p style={{ fontSize:'0.72rem',color:'var(--text-muted)' }}>Vence: {msg.fechaVencimiento}</p>}
      </div>
      <div style={{ display:'flex',gap:'0.4rem',flexShrink:0 }}>
        <button onClick={onEdit} style={s.btnSm}><Pencil size={13} /> Editar</button>
        <button onClick={copy} style={s.btnSm}>{copied?<><Check size={13}/> Copiado</>:<><Copy size={13}/> Copiar</>}</button>
        <button onClick={onPreview} style={{ ...s.btnSm,background:'var(--accent)',color:'#0f1117',border:'none' }}><Send size={13} /> Ver / Enviar</button>
      </div>
    </div>
  )
}

// ── Modal mensaje ─────────────────────────────────────────────

function MensajeModal({ msg, onClose, onReload }: any) {
  const [copied, setCopied]       = useState(false)
  const [confirming, setConfirming] = useState(false)
  const copy = () => { navigator.clipboard.writeText(msg.mensajeTexto); setCopied(true); setTimeout(() => setCopied(false), 2000) }
  const confirm = async () => {
    setConfirming(true)
    try { await api.post(`/notifications/confirm/${msg.feeId}`); toast.success('Confirmado'); await onReload() }
    catch (e: any) { toast.error(e?.response?.data?.message || 'Error') }
    finally { setConfirming(false) }
  }
  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={e => e.stopPropagation()} className="fade-up">
        <div style={s.modalHeader}>
          <h2 style={s.modalTitle}><MessageSquare size={16} color="var(--green)" /> Depto {msg.depto}</h2>
          <button onClick={onClose} style={s.closeBtn}><X size={18} /></button>
        </div>
        <div style={{ padding:'1.5rem',overflowY:'auto',maxHeight:'calc(90vh - 140px)' }}>
          <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',background:'var(--bg-elevated)',borderRadius:'var(--radius)',padding:'0.75rem 1rem',marginBottom:'1rem' }}>
            <div><p style={{ fontWeight:600 }}>{msg.propietario}</p><p style={{ fontSize:'0.8rem',color:'var(--text-secondary)' }}>{msg.telefono}</p></div>
            {msg.telefono && msg.telefono !== 'Sin teléfono' && (
              <a href={`https://wa.me/${msg.telefono.replace(/\D/g,'')}?text=${encodeURIComponent(msg.mensajeTexto)}`}
                target="_blank" rel="noreferrer"
                style={{ display:'flex',alignItems:'center',gap:'0.4rem',background:'#25d366',color:'#fff',fontWeight:600,fontSize:'0.8rem',padding:'0.45rem 0.9rem',borderRadius:'var(--radius)',textDecoration:'none' }}>
                <Send size={14} /> WhatsApp
              </a>
            )}
          </div>
          <pre style={{ whiteSpace:'pre-wrap',wordBreak:'break-word',fontSize:'0.85rem',lineHeight:1.65,color:'var(--text-primary)',background:'#1a1f2e',border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:'1rem',fontFamily:'var(--font-body)',marginBottom:'0.75rem' }}>
            {msg.mensajeTexto}
          </pre>
          <button onClick={copy} style={{ display:'flex',alignItems:'center',gap:'0.4rem',background:'var(--bg-elevated)',border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:'0.5rem 1rem',fontSize:'0.8rem',cursor:'pointer',color:'var(--text-secondary)',fontFamily:'var(--font-body)' }}>
            {copied?<><Check size={13}/> Copiado</>:<><Copy size={13}/> Copiar</>}
          </button>
        </div>
        <div style={{ ...s.modalFooter, justifyContent: msg.mensajeEnviado ? 'center' : 'space-between' }}>
          {msg.mensajeEnviado ? (
            <span style={{ color:'var(--green)',fontSize:'0.85rem',fontWeight:600,display:'flex',alignItems:'center',gap:'0.4rem' }}>
              <CheckCircle2 size={15} /> Mensaje confirmado
            </span>
          ) : (
            <>
              <p style={{ fontSize:'0.8rem',color:'var(--text-secondary)' }}>Confirma después de enviar por WhatsApp</p>
              <button onClick={confirm} disabled={confirming} style={s.btnPrimary}>
                {confirming?<Loader2 size={14} style={{ animation:'spin 0.8s linear infinite' }}/>:<CheckCircle2 size={14}/>}
                Confirmar envío
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Estilos ───────────────────────────────────────────────────

// ── Componente ProgramacionTab ────────────────────────────────
function ProgramacionTab({ isSupervisor, grupos, selectedGrupoNotif, onGrupoChange, edificiosGrupo, selectedEdifNotif, onEdifChange, selBuilding, configs, loadingConfigs, savingConfig, onSave }: any) {
  const [forms, setForms] = useState<Record<string, any>>({})
  const inp: React.CSSProperties = { background:'var(--bg-elevated)',border:'1px solid var(--border)',color:'var(--text-primary)',borderRadius:'var(--radius)',padding:'0.45rem 0.7rem',fontSize:'0.875rem',fontFamily:'var(--font-body)',outline:'none' }

  useEffect(() => {
    if (!configs || configs.length === 0) return
    const next: Record<string, any> = {}
    configs.forEach((c: any) => {
      const parsed = parseCronSimple(c.cronExpresion || '0 9 * * *')
      next[c.idTipo] = { ...c, ...parsed }
    })
    setForms(next)
  }, [configs])

  const parseCronSimple = (cron: string) => {
    const parts = cron.split(' ')
    const min = parts[0]; const hour = parts[1]; const day = parts[2]
    const hora = `${hour.padStart(2,'0')}:${min.padStart(2,'0')}`
    return { hora, frecuencia: day === '*' ? 'diario' : 'mensual', diaMes: day !== '*' ? parseInt(day) : 1 }
  }

  const buildCronSimple = (hora: string, frecuencia: string, diaMes: number) => {
    const [h, m] = hora.split(':')
    return frecuencia === 'mensual' ? `${m} ${h} ${diaMes} * *` : `${m} ${h} * * *`
  }

  const update = (idTipo: string, field: string, value: any) => {
    setForms(prev => ({ ...prev, [idTipo]: { ...prev[idTipo], [field]: value } }))
  }

  const handleSave = (idTipo: string) => {
    const form = forms[idTipo]
    if (!form) return
    const cronExpresion = buildCronSimple(form.hora || '09:00', form.frecuencia || 'diario', form.diaMes || 1)
    onSave({ idTipo, activo: form.activo ?? false, cronExpresion, diasOffset: form.diasOffset ?? 0 })
  }

  // Para supervisor: usa el edificio seleccionado en el selector de grupo+edificio
  // Para admin/gestión: usa el edificio del selector principal (selBuilding)
  const idEdificio = isSupervisor ? (selectedEdifNotif || selBuilding) : selBuilding
  const sinEdificio = !idEdificio

  return (
    <div style={{ display:'flex',flexDirection:'column',gap:'1rem' }}>
      {/* Selector grupo + edificio para supervisor */}
      {isSupervisor && (
        <div style={{ display:'flex',gap:'1rem',flexWrap:'wrap',padding:'1rem',background:'var(--bg-surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)' }}>
          <div>
            <label style={{ fontSize:'0.72rem',fontWeight:600,color:'var(--text-muted)',textTransform:'uppercase' as const,letterSpacing:'0.05em',display:'block',marginBottom:'0.35rem' }}>Grupo</label>
            <select value={selectedGrupoNotif} onChange={e => onGrupoChange(e.target.value)}
              style={{ ...inp, minWidth:200 }}>
              <option value="">— Seleccionar grupo —</option>
              {grupos.map((g: any) => <option key={g.id} value={g.id}>{g.nombre}</option>)}
            </select>
          </div>
          {edificiosGrupo.length > 0 && (
            <div>
              <label style={{ fontSize:'0.72rem',fontWeight:600,color:'var(--text-muted)',textTransform:'uppercase' as const,letterSpacing:'0.05em',display:'block',marginBottom:'0.35rem' }}>Edificio</label>
              <select value={selectedEdifNotif} onChange={e => onEdifChange(e.target.value)}
                style={{ ...inp, minWidth:200 }}>
                <option value="">— Seleccionar edificio —</option>
                {edificiosGrupo.map((b: any) => <option key={b.id} value={b.id}>{b.nombre}</option>)}
              </select>
            </div>
          )}
        </div>
      )}

      {sinEdificio ? (
        <div style={{ textAlign:'center' as const,padding:'3rem',color:'var(--text-muted)',fontSize:'0.875rem' }}>
          <Bell size={32} style={{ opacity:0.3,marginBottom:'0.75rem' }} />
          <p>{isSupervisor ? 'Selecciona un grupo y edificio' : 'Cargando configuración...'}</p>
        </div>
      ) : loadingConfigs ? (
        <div style={{ display:'flex',justifyContent:'center',padding:'3rem' }}>
          <Loader2 size={24} color="var(--accent)" style={{ animation:'spin 0.8s linear infinite' }} />
        </div>
      ) : (
        <>
          <div style={{ background:'rgba(74,158,255,0.07)',border:'1px solid rgba(74,158,255,0.2)',borderRadius:'var(--radius)',padding:'0.75rem 1rem',display:'flex',alignItems:'center',gap:'0.5rem' }}>
            <Bell size={14} color="var(--blue)" />
            <p style={{ fontSize:'0.82rem',color:'var(--blue)' }}>
              Las notificaciones se envían vía <strong>push web</strong>. El dispositivo debe tener habilitadas las notificaciones.
            </p>
          </div>
          {configs.map((config: any) => {
            const tipo = config.tipo
            const form = forms[config.idTipo]
            if (!form || !tipo) return null
            const isSaving = savingConfig === config.idTipo
            const esDestinatarioProp = tipo.destinatarios?.includes('propietarios')
            const tieneOffset = tipo.codigo === 'vencimiento_pago' || tipo.codigo === 'gastos_generales'
            const tieneDiaMes = form.frecuencia === 'mensual'
            const color = esDestinatarioProp ? '#4a9eff' : '#a78bfa'

            return (
              <div key={config.idTipo} style={{ background:'var(--bg-surface)',border:`1px solid ${form.activo ? color + '40' : 'var(--border)'}`,borderRadius:'var(--radius-lg)',padding:'1.25rem',transition:'border-color 0.2s' }}>
                <div style={{ display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:'1rem' }}>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex',alignItems:'center',gap:'0.6rem',marginBottom:'0.25rem',flexWrap:'wrap' as const }}>
                      <span style={{ fontSize:'0.72rem',fontWeight:700,color,background:`${color}15`,border:`1px solid ${color}30`,borderRadius:20,padding:'0.15rem 0.6rem',textTransform:'uppercase' as const,letterSpacing:'0.05em' }}>
                        {tipo.destinatarios}
                      </span>
                      <h3 style={{ fontWeight:600,fontSize:'0.95rem' }}>{tipo.nombre}</h3>
                    </div>
                    <p style={{ fontSize:'0.8rem',color:'var(--text-muted)',lineHeight:1.5 }}>{tipo.descripcion}</p>
                  </div>
                  <button onClick={() => update(config.idTipo, 'activo', !form.activo)}
                    style={{ background:'none',border:'none',cursor:'pointer',display:'flex',alignItems:'center',gap:'0.35rem',padding:'0 0 0 1rem',flexShrink:0,color:form.activo?'var(--green)':'var(--text-muted)',fontFamily:'var(--font-body)',fontSize:'0.82rem',fontWeight:600 }}>
                    {form.activo ? <ToggleRight size={24} color="var(--green)" /> : <ToggleLeft size={24} color="var(--text-muted)" />}
                    {form.activo ? 'Activo' : 'Inactivo'}
                  </button>
                </div>

                {form.activo && (
                  <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:'0.75rem',marginBottom:'1rem',padding:'1rem',background:'var(--bg-elevated)',borderRadius:'var(--radius)' }}>
                    <div>
                      <label style={{ fontSize:'0.72rem',fontWeight:600,color:'var(--text-muted)',textTransform:'uppercase' as const,letterSpacing:'0.04em',display:'flex',alignItems:'center',gap:'0.3rem',marginBottom:'0.35rem' }}>
                        <Clock size={11} /> Frecuencia
                      </label>
                      <select value={form.frecuencia || 'diario'} onChange={e => update(config.idTipo, 'frecuencia', e.target.value)} style={inp}>
                        <option value="diario">Diario</option>
                        <option value="mensual">Mensual</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize:'0.72rem',fontWeight:600,color:'var(--text-muted)',textTransform:'uppercase' as const,letterSpacing:'0.04em',display:'flex',alignItems:'center',gap:'0.3rem',marginBottom:'0.35rem' }}>
                        <Clock size={11} /> Hora de envío
                      </label>
                      <input type="time" value={form.hora || '09:00'} onChange={e => update(config.idTipo, 'hora', e.target.value)} style={inp} />
                    </div>
                    {tieneDiaMes && (
                      <div>
                        <label style={{ fontSize:'0.72rem',fontWeight:600,color:'var(--text-muted)',textTransform:'uppercase' as const,letterSpacing:'0.04em',display:'flex',alignItems:'center',gap:'0.3rem',marginBottom:'0.35rem' }}>
                          <Calendar size={11} /> Día del mes
                        </label>
                        <input type="number" min={1} max={28} value={form.diaMes || 1} onChange={e => update(config.idTipo, 'diaMes', parseInt(e.target.value) || 1)} style={{ ...inp, width:'80px' }} />
                      </div>
                    )}
                    {tieneOffset && (
                      <div>
                        <label style={{ fontSize:'0.72rem',fontWeight:600,color:'var(--text-muted)',textTransform:'uppercase' as const,letterSpacing:'0.04em',display:'flex',alignItems:'center',gap:'0.3rem',marginBottom:'0.35rem' }}>
                          <Clock size={11} /> Días de espera
                        </label>
                        <input type="number" min={0} max={60} value={form.diasOffset ?? 0} onChange={e => update(config.idTipo, 'diasOffset', parseInt(e.target.value) || 0)} style={{ ...inp, width:'80px' }} />
                        <p style={{ fontSize:'0.7rem',color:'var(--text-muted)',marginTop:'0.2rem' }}>
                          {tipo.codigo === 'vencimiento_pago' ? 'días desde envío del mensaje' : 'días desde creación del gasto'}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between' }}>
                  {form.activo && form.hora && (
                    <p style={{ fontSize:'0.75rem',color:'var(--text-muted)' }}>
                      Cron: <code style={{ background:'var(--bg-elevated)',padding:'0.1rem 0.4rem',borderRadius:4,fontSize:'0.75rem' }}>
                        {buildCronSimple(form.hora, form.frecuencia, form.diaMes)}
                      </code>
                    </p>
                  )}
                  <div style={{ marginLeft:'auto' }}>
                    <button onClick={() => handleSave(config.idTipo)} disabled={!!isSaving}
                      style={{ display:'flex',alignItems:'center',gap:'0.4rem',background:form.activo?'var(--accent)':'var(--bg-elevated)',color:form.activo?'#0f1117':'var(--text-secondary)',fontWeight:600,fontSize:'0.8rem',padding:'0.5rem 1rem',borderRadius:'var(--radius)',border:`1px solid ${form.activo?'var(--accent)':'var(--border)'}`,cursor:'pointer',fontFamily:'var(--font-body)' }}>
                      {isSaving ? <Loader2 size={13} style={{ animation:'spin 0.8s linear infinite' }} /> : <Save size={13} />}
                      Guardar
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </>
      )}
    </div>
  )

  function buildCronSimple(hora: string, frecuencia: string, diaMes: number) {
    const [h, m] = (hora || '09:00').split(':')
    return frecuencia === 'mensual' ? `${m} ${h} ${diaMes} * *` : `${m} ${h} * * *`
  }
}

// ── Componente TiposNotifTab (solo supervisor) ────────────────
function TiposNotifTab({ tipos, onReload }: any) {
  const [creating, setCreating] = useState(false)
  const [saving, setSaving]     = useState(false)
  const [form, setForm]         = useState({ codigo:'', nombre:'', descripcion:'', destinatarios:'propietarios', orden:0 })
  const inp: React.CSSProperties = { width:'100%',background:'var(--bg-elevated)',border:'1px solid var(--border)',color:'var(--text-primary)',borderRadius:'var(--radius)',padding:'0.45rem 0.7rem',fontSize:'0.875rem',fontFamily:'var(--font-body)',outline:'none' }

  const handleCreate = async () => {
    if (!form.codigo || !form.nombre) return toast.error('Código y nombre son requeridos')
    setSaving(true)
    try {
      await api.post('/notificacion-tipo', form)
      toast.success('Tipo creado')
      setCreating(false)
      setForm({ codigo:'', nombre:'', descripcion:'', destinatarios:'propietarios', orden:0 })
      onReload()
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Error') }
    finally { setSaving(false) }
  }

  const handleToggle = async (id: string) => {
    try {
      await api.patch(`/notificacion-tipo/${id}/toggle`)
      onReload()
    } catch { toast.error('Error') }
  }

  return (
    <div style={{ display:'flex',flexDirection:'column',gap:'1rem' }}>
      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center' }}>
        <div>
          <h3 style={{ fontWeight:600,fontSize:'1rem' }}>Tipos de notificación</h3>
          <p style={{ fontSize:'0.8rem',color:'var(--text-muted)' }}>Catálogo de notificaciones disponibles para todos los grupos</p>
        </div>
        <button onClick={() => setCreating(true)}
          style={{ display:'flex',alignItems:'center',gap:'0.4rem',background:'var(--accent)',color:'#0f1117',fontWeight:600,fontSize:'0.875rem',padding:'0.55rem 1rem',borderRadius:'var(--radius)',border:'none',cursor:'pointer',fontFamily:'var(--font-body)' }}>
          <Plus size={15} /> Nuevo tipo
        </button>
      </div>

      {creating && (
        <div style={{ background:'var(--bg-surface)',border:'1px solid var(--accent)',borderRadius:'var(--radius-lg)',padding:'1.25rem' }}>
          <h4 style={{ fontWeight:600,marginBottom:'1rem' }}>Nuevo tipo de notificación</h4>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.75rem',marginBottom:'1rem' }}>
            <div>
              <label style={{ fontSize:'0.75rem',fontWeight:600,color:'var(--text-secondary)',display:'block',marginBottom:'0.3rem' }}>Código * (letras y guiones bajos)</label>
              <input value={form.codigo} onChange={e => setForm(p => ({ ...p, codigo: e.target.value.toLowerCase().replace(/[^a-z_]/g,'') }))} placeholder="ej: recordatorio_reunion" style={inp} />
            </div>
            <div>
              <label style={{ fontSize:'0.75rem',fontWeight:600,color:'var(--text-secondary)',display:'block',marginBottom:'0.3rem' }}>Nombre *</label>
              <input value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} placeholder="ej: Recordatorio de reunión" style={inp} />
            </div>
            <div style={{ gridColumn:'span 2' }}>
              <label style={{ fontSize:'0.75rem',fontWeight:600,color:'var(--text-secondary)',display:'block',marginBottom:'0.3rem' }}>Descripción</label>
              <input value={form.descripcion} onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))} placeholder="Descripción del tipo de notificación" style={inp} />
            </div>
            <div>
              <label style={{ fontSize:'0.75rem',fontWeight:600,color:'var(--text-secondary)',display:'block',marginBottom:'0.3rem' }}>Destinatarios *</label>
              <select value={form.destinatarios} onChange={e => setForm(p => ({ ...p, destinatarios: e.target.value }))} style={inp}>
                <option value="propietarios">Propietarios</option>
                <option value="gestion">Gestión</option>
                <option value="admin">Administrador</option>
                <option value="gestion,admin">Gestión + Administrador</option>
                <option value="propietarios,gestion,admin">Todos</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize:'0.75rem',fontWeight:600,color:'var(--text-secondary)',display:'block',marginBottom:'0.3rem' }}>Orden</label>
              <input type="number" min={0} value={form.orden} onChange={e => setForm(p => ({ ...p, orden: parseInt(e.target.value) || 0 }))} style={{ ...inp, width:'80px' }} />
            </div>
          </div>
          <div style={{ display:'flex',gap:'0.75rem',justifyContent:'flex-end' }}>
            <button onClick={() => setCreating(false)} style={{ background:'var(--bg-elevated)',border:'1px solid var(--border)',color:'var(--text-secondary)',fontWeight:500,fontSize:'0.875rem',padding:'0.5rem 1rem',borderRadius:'var(--radius)',cursor:'pointer',fontFamily:'var(--font-body)' }}>Cancelar</button>
            <button onClick={handleCreate} disabled={saving}
              style={{ display:'flex',alignItems:'center',gap:'0.4rem',background:'var(--accent)',color:'#0f1117',fontWeight:600,fontSize:'0.875rem',padding:'0.55rem 1rem',borderRadius:'var(--radius)',border:'none',cursor:'pointer',fontFamily:'var(--font-body)' }}>
              {saving ? <Loader2 size={14} style={{ animation:'spin 0.8s linear infinite' }} /> : <Save size={14} />}
              Crear tipo
            </button>
          </div>
        </div>
      )}

      <div style={{ background:'var(--bg-surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',overflow:'hidden' }}>
        <table style={{ width:'100%',borderCollapse:'collapse',fontSize:'0.875rem' }}>
          <thead>
            <tr>
              {['Código','Nombre','Destinatarios','Descripción','Estado',''].map(h => (
                <th key={h} style={{ textAlign:'left',padding:'0.75rem 1rem',color:'var(--text-muted)',fontSize:'0.7rem',fontWeight:600,letterSpacing:'0.05em',textTransform:'uppercase' as const,borderBottom:'1px solid var(--border)',background:'var(--bg-elevated)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tipos.length === 0 ? (
              <tr><td colSpan={6} style={{ padding:'2rem',textAlign:'center',color:'var(--text-muted)' }}>No hay tipos registrados</td></tr>
            ) : tipos.map((t: any, i: number) => (
              <tr key={t.id} style={{ opacity:t.activo?1:0.5,...(i%2!==0?{background:'rgba(255,255,255,0.02)'}:{}) }}>
                <td style={{ padding:'0.75rem 1rem',borderBottom:'1px solid rgba(255,255,255,0.03)' }}>
                  <code style={{ fontSize:'0.8rem',background:'var(--bg-elevated)',padding:'0.1rem 0.4rem',borderRadius:4 }}>{t.codigo}</code>
                </td>
                <td style={{ padding:'0.75rem 1rem',borderBottom:'1px solid rgba(255,255,255,0.03)',fontWeight:600 }}>{t.nombre}</td>
                <td style={{ padding:'0.75rem 1rem',borderBottom:'1px solid rgba(255,255,255,0.03)' }}>
                  <span style={{ fontSize:'0.75rem',background:'var(--accent-dim)',color:'var(--accent)',border:'1px solid rgba(245,166,35,0.3)',borderRadius:4,padding:'0.15rem 0.5rem' }}>{t.destinatarios}</span>
                </td>
                <td style={{ padding:'0.75rem 1rem',borderBottom:'1px solid rgba(255,255,255,0.03)',fontSize:'0.8rem',color:'var(--text-muted)',maxWidth:200 }}>{t.descripcion || '—'}</td>
                <td style={{ padding:'0.75rem 1rem',borderBottom:'1px solid rgba(255,255,255,0.03)' }}>
                  <button onClick={() => handleToggle(t.id)}
                    style={{ display:'flex',alignItems:'center',gap:'0.3rem',background:'none',border:'none',cursor:'pointer',color:t.activo?'var(--green)':'var(--text-muted)',fontFamily:'var(--font-body)',fontSize:'0.8rem',padding:0 }}>
                    {t.activo ? <ToggleRight size={18} color="var(--green)" /> : <ToggleLeft size={18} color="var(--text-muted)" />}
                    {t.activo ? 'Activo' : 'Inactivo'}
                  </button>
                </td>
                <td style={{ padding:'0.75rem 1rem',borderBottom:'1px solid rgba(255,255,255,0.03)' }}>
                  <span style={{ fontSize:'0.72rem',color:'var(--text-muted)' }}>#{t.orden}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  ctrlLabel:    { fontSize:'0.72rem',fontWeight:600,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.05em' },
  select:       { background:'var(--bg-elevated)',border:'1px solid var(--border)',color:'var(--text-primary)',borderRadius:'var(--radius)',padding:'0.55rem 0.9rem',fontSize:'0.875rem',fontFamily:'var(--font-body)',minWidth:220 },
  mesNav:       { display:'flex',alignItems:'center',background:'var(--bg-elevated)',border:'1px solid var(--border)',borderRadius:'var(--radius)',overflow:'hidden' },
  navBtn:       { background:'none',border:'none',padding:'0.55rem 0.75rem',cursor:'pointer',color:'var(--text-secondary)',display:'flex',alignItems:'center' },
  mesLabel:     { padding:'0 1rem',fontWeight:600,fontSize:'0.9rem',minWidth:140,textAlign:'center' },
  fieldLabel:   { fontSize:'0.75rem',fontWeight:600,color:'var(--text-secondary)',textTransform:'uppercase',letterSpacing:'0.04em',display:'block',marginBottom:'0.4rem' },
  btnSm:        { display:'flex',alignItems:'center',gap:'0.35rem',background:'var(--bg-elevated)',border:'1px solid var(--border)',borderRadius:6,padding:'0.4rem 0.7rem',fontSize:'0.78rem',cursor:'pointer',fontFamily:'var(--font-body)',color:'var(--text-secondary)' },
  overlay:      { position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:'1rem',backdropFilter:'blur(4px)' },
  modal:        { background:'var(--bg-surface)',border:'1px solid var(--border-accent)',borderRadius:'var(--radius-lg)',width:'100%',maxWidth:540,maxHeight:'90vh',display:'flex',flexDirection:'column',boxShadow:'var(--shadow-lg)' },
  modalHeader:  { display:'flex',justifyContent:'space-between',alignItems:'center',padding:'1.25rem 1.5rem',borderBottom:'1px solid var(--border)' },
  modalTitle:   { fontFamily:'var(--font-display)',fontSize:'1rem',fontWeight:700,display:'flex',alignItems:'center',gap:'0.5rem' },
  closeBtn:     { background:'var(--bg-elevated)',border:'1px solid var(--border)',borderRadius:6,width:32,height:32,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'var(--text-secondary)' },
  modalFooter:  { display:'flex',justifyContent:'flex-end',alignItems:'center',gap:'0.75rem',padding:'1rem 1.5rem',borderTop:'1px solid var(--border)' },
  btnPrimary:   { display:'flex',alignItems:'center',gap:'0.5rem',background:'var(--accent)',color:'#0f1117',fontWeight:600,fontSize:'0.875rem',padding:'0.6rem 1.2rem',borderRadius:'var(--radius)',border:'none',cursor:'pointer',fontFamily:'var(--font-body)' },
  btnSecondary: { display:'flex',alignItems:'center',gap:'0.5rem',background:'var(--bg-elevated)',color:'var(--text-secondary)',fontWeight:500,fontSize:'0.875rem',padding:'0.6rem 1.2rem',borderRadius:'var(--radius)',border:'1px solid var(--border)',cursor:'pointer',fontFamily:'var(--font-body)' },
}
