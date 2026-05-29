// src/pages/GruposPage.tsx
import { useEffect, useState } from 'react'
import api from '../services/api'
import toast from 'react-hot-toast'
import {
  Plus, Pencil, X, Loader2, Save, Building2, Layers,
  Users, KeyRound, Shield, ChevronRight, Trash2,
  CheckCircle2, XCircle, AlertCircle, CreditCard,
  ToggleLeft, ToggleRight,
} from 'lucide-react'

// ── Tipos ─────────────────────────────────────────────────────
type Plan   = 'full' | 'demo' | 'standard' | 'premium' | 'enterprise'
type Tab    = 'edificios' | 'usuarios' | 'suscripcion'

interface Building { id: string; nombre: string; nroDepas: number; idGrupo?: string }
interface UserItem {
  id: string; email: string
  role: 'administrador' | 'gestion' | 'propietario'
  isActive: boolean; lastLogin?: string
}
interface Grupo {
  id: string; nombre: string; ruc?: string; direccion?: string
  status: string; plan: Plan; subscriptionEnd: string | null
  maxEdificios: number; maxDeptos: number; maxPeriodos: number
  edificios: Building[]; usuarios: UserItem[]
  createdAt: string
}
interface Stats {
  total: number; activos: number; expirados: number; suspendidos: number
  byPlan: Record<Plan, number>
}

// ── Config planes ─────────────────────────────────────────────
const PLAN_CFG: Record<Plan, { label: string; color: string; bg: string }> = {
  full:       { label: 'Full',       color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  demo:       { label: 'Demo',       color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' },
  standard:   { label: 'Standard',   color: '#4a9eff', bg: 'rgba(74,158,255,0.1)' },
  premium:    { label: 'Premium',    color: '#a78bfa', bg: 'rgba(167,139,250,0.1)' },
  enterprise: { label: 'Enterprise', color: '#4caf82', bg: 'rgba(76,175,130,0.1)' },
}

const STATUS_LABEL: Record<string, { label: string; color: string; Icon: any }> = {
  activo:     { label: 'Activo',     color: 'var(--green)', Icon: CheckCircle2 },
  expirado:   { label: 'Expirado',   color: '#f87171',      Icon: XCircle },
  suspendido: { label: 'Suspendido', color: 'var(--accent)', Icon: AlertCircle },
}

const ROLE_CFG: Record<string, { label: string; color: string }> = {
  administrador: { label: 'Administrador', color: '#a78bfa' },
  gestion:       { label: 'Gestión',       color: 'var(--blue)' },
  propietario:   { label: 'Propietario',   color: 'var(--green)' },
}

// ── Estilos ───────────────────────────────────────────────────
const btn:  React.CSSProperties = { display:'flex',alignItems:'center',gap:'0.5rem',background:'var(--accent)',color:'#0f1117',fontWeight:600,fontSize:'0.875rem',padding:'0.55rem 1rem',borderRadius:'var(--radius)',border:'none',cursor:'pointer',fontFamily:'var(--font-body)' }
const btn2: React.CSSProperties = { ...btn, background:'var(--bg-elevated)',color:'var(--text-secondary)',border:'1px solid var(--border)' }
const inp:  React.CSSProperties = { width:'100%',background:'var(--bg-elevated)',border:'1px solid var(--border)',color:'var(--text-primary)',borderRadius:'var(--radius)',padding:'0.5rem 0.75rem',fontSize:'0.875rem',fontFamily:'var(--font-body)',outline:'none' }

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ fontSize:'0.75rem',fontWeight:600,color:'var(--text-secondary)',textTransform:'uppercase' as const,letterSpacing:'0.04em',display:'block',marginBottom:'0.35rem' }}>{label}</label>
      {children}
      {hint && <p style={{ fontSize:'0.72rem',color:'var(--text-muted)',marginTop:'0.25rem' }}>{hint}</p>}
    </div>
  )
}

function PlanBadge({ plan }: { plan: Plan }) {
  const cfg = PLAN_CFG[plan]
  return <span style={{ fontSize:'0.72rem',fontWeight:700,padding:'0.2rem 0.6rem',borderRadius:20,background:cfg.bg,color:cfg.color,border:`1px solid ${cfg.color}40`,textTransform:'uppercase',letterSpacing:'0.05em' }}>{cfg.label}</span>
}

// ── Página principal ──────────────────────────────────────────
export default function GruposPage() {
  const [grupos, setGrupos]       = useState<Grupo[]>([])
  const [stats, setStats]         = useState<Stats | null>(null)
  const [loading, setLoading]     = useState(true)
  const [selectedGrupo, setSelectedGrupo] = useState<Grupo | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('edificios')

  // Modales
  const [createModal, setCreateModal] = useState(false)
  const [editModal, setEditModal]     = useState(false)
  const [addAdminModal, setAddAdminModal] = useState(false)
  const [resetModal, setResetModal]   = useState<UserItem | null>(null)
  const [deleteModal, setDeleteModal] = useState<Grupo | null>(null)
  const [saving, setSaving]           = useState(false)

  // Forms
  const [createForm, setCreateForm] = useState({
    nombre: '', ruc: '', direccion: '', plan: 'demo' as Plan,
    subscriptionEnd: '', adminEmail: '', adminPassword: '',
  })
  const [editForm, setEditForm]     = useState({ nombre: '', ruc: '', direccion: '' })
  const [suscForm, setSuscForm]     = useState({ plan: 'demo' as Plan, subscriptionEnd: '' })
  const [adminForm, setAdminForm]   = useState({ email: '', password: '' })
  const [resetPwd, setResetPwd]     = useState('')

  // Edificios disponibles para asignar al grupo
  const [allBuildings, setAllBuildings] = useState<Building[]>([])

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    try {
      const [gRes, sRes, bRes] = await Promise.all([
        api.get('/grupos'),
        api.get('/grupos/stats'),
        api.get('/buildings'),
      ])
      const gruposData = gRes.data.filter((g: Grupo) => g.nombre !== 'SuperGrupo')
      setGrupos(gruposData)
      setStats(sRes.data)
      setAllBuildings(bRes.data)
      // Refrescar el grupo seleccionado si hay uno
      if (selectedGrupo) {
        const updated = gruposData.find((g: Grupo) => g.id === selectedGrupo.id)
        if (updated) setSelectedGrupo(updated)
      }
    } catch { toast.error('Error cargando grupos') }
    finally  { setLoading(false) }
  }

  const handleCreate = async () => {
  if (!createForm.nombre || !createForm.adminEmail || !createForm.adminPassword) {
    toast.error('Nombre, email y contraseña del admin son requeridos'); return
  }
  setSaving(true)
  try {
    const payload: any = {
      nombre:        createForm.nombre,
      ruc:           createForm.ruc       || undefined,
      direccion:     createForm.direccion || undefined,
      plan:          createForm.plan,
      adminEmail:    createForm.adminEmail,
      adminPassword: createForm.adminPassword,
    }
    if (createForm.subscriptionEnd) payload.subscriptionEnd = createForm.subscriptionEnd

    const { data } = await api.post('/grupos', payload)
    toast.success(`Grupo "${data.grupo.nombre}" creado con su administrador`)
    setCreateModal(false)
    setCreateForm({ nombre:'',ruc:'',direccion:'',plan:'demo',subscriptionEnd:'',adminEmail:'',adminPassword:'' })
    load()
  } catch (e: any) {
    toast.error(e?.response?.data?.message || 'Error al crear grupo')
  } finally { setSaving(false) }
}

  const handleUpdate = async () => {
    if (!selectedGrupo) return
    setSaving(true)
    try {
      await api.patch(`/grupos/${selectedGrupo.id}`, editForm)
      toast.success('Grupo actualizado')
      setEditModal(false); load()
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Error al actualizar')
    } finally { setSaving(false) }
  }

  const handleUpdateSuscripcion = async () => {
    if (!selectedGrupo) return
    setSaving(true)
    try {
      await api.patch(`/grupos/${selectedGrupo.id}/suscripcion`, suscForm)
      toast.success('Suscripción actualizada'); load()
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Error al actualizar suscripción')
    } finally { setSaving(false) }
  }

  const handleSuspend = async (g: Grupo) => {
    if (!confirm(`¿Suspender "${g.nombre}"? Todos sus usuarios perderán acceso.`)) return
    try {
      await api.patch(`/grupos/${g.id}/suspend`)
      toast.success('Grupo suspendido'); load()
    } catch { toast.error('Error') }
  }

  const handleActivate = async (g: Grupo) => {
    try {
      await api.patch(`/grupos/${g.id}/activate`)
      toast.success('Grupo reactivado'); load()
    } catch { toast.error('Error') }
  }

  const handleDelete = async () => {
    if (!deleteModal) return
    setSaving(true)
    try {
      await api.delete(`/grupos/${deleteModal.id}`)
      toast.success('Grupo eliminado')
      setDeleteModal(null)
      if (selectedGrupo?.id === deleteModal.id) setSelectedGrupo(null)
      load()
    } catch { toast.error('Error al eliminar') }
    finally { setSaving(false) }
  }

  const handleAddAdmin = async () => {
    if (!selectedGrupo || !adminForm.email || !adminForm.password) {
      toast.error('Email y contraseña son requeridos'); return
    }
    setSaving(true)
    try {
      await api.post(`/grupos/${selectedGrupo.id}/admins`, adminForm)
      toast.success('Administrador agregado')
      setAddAdminModal(false); setAdminForm({ email:'', password:'' }); load()
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Error al agregar admin')
    } finally { setSaving(false) }
  }

  const handleResetPassword = async () => {
    if (!selectedGrupo || !resetModal || resetPwd.length < 8) {
      toast.error('Mínimo 8 caracteres'); return
    }
    setSaving(true)
    try {
      await api.patch(`/grupos/${selectedGrupo.id}/users/${resetModal.id}/reset-password`, { newPassword: resetPwd })
      toast.success('Contraseña reseteada')
      setResetModal(null); setResetPwd('')
    } catch { toast.error('Error') }
    finally { setSaving(false) }
  }

  const handleToggleUser = async (u: UserItem) => {
    try {
      await api.patch(`/users/${u.id}/${u.isActive ? 'deactivate' : 'activate'}`)
      toast.success(u.isActive ? 'Usuario desactivado' : 'Usuario reactivado'); load()
    } catch { toast.error('Error') }
  }

  // Edificios sin grupo (disponibles para asignar)
  const edificiosSinGrupo = allBuildings.filter(b => !b.idGrupo)
  const edificiosDelGrupo = selectedGrupo?.edificios || []

  const selectGrupo = (g: Grupo) => {
    setSelectedGrupo(g)
    setActiveTab('edificios')
    setSuscForm({ plan: g.plan, subscriptionEnd: g.subscriptionEnd || '' })
  }

  return (
    <div style={{ padding:'2rem', maxWidth:1200, margin:'0 auto' }}>

      {/* Header */}
      <div style={{ display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:'1.5rem',flexWrap:'wrap',gap:'1rem' }} className="fade-up">
        <div>
          <h1 style={{ fontFamily:'var(--font-display)',fontSize:'1.8rem',fontWeight:700,letterSpacing:'-0.02em',marginBottom:'0.25rem' }}>Grupos</h1>
          <p style={{ color:'var(--text-secondary)',fontSize:'0.875rem' }}>Gestiona los grupos de clientes y sus suscripciones</p>
        </div>
        <button style={btn} onClick={() => setCreateModal(true)}><Plus size={16} /> Nuevo grupo</button>
      </div>

      {/* Stats */}
      {stats && (
        <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))',gap:'0.75rem',marginBottom:'1.5rem' }} className="fade-up">
          {[
            { label:'Total',       value: stats.total,       color:'var(--text-primary)' },
            { label:'Activos',     value: stats.activos,     color:'var(--green)' },
            { label:'Expirados',   value: stats.expirados,   color:'#f87171' },
            { label:'Suspendidos', value: stats.suspendidos, color:'var(--accent)' },
          ].map(s => (
            <div key={s.label} style={{ background:'var(--bg-surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',padding:'0.9rem 1rem' }}>
              <p style={{ fontSize:'0.68rem',color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:'0.3rem' }}>{s.label}</p>
              <p style={{ fontWeight:800,fontSize:'1.4rem',color:s.color }}>{s.value}</p>
            </div>
          ))}
          {Object.entries(PLAN_CFG).filter(([p]) => p !== 'full').map(([plan, cfg]) => (
            <div key={plan} style={{ background:'var(--bg-surface)',border:`1px solid ${cfg.color}30`,borderRadius:'var(--radius-lg)',padding:'0.9rem 1rem',borderTop:`2px solid ${cfg.color}` }}>
              <p style={{ fontSize:'0.68rem',color:cfg.color,textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:'0.3rem',fontWeight:600 }}>{cfg.label}</p>
              <p style={{ fontWeight:800,fontSize:'1.4rem',color:cfg.color }}>{stats.byPlan?.[plan as Plan] || 0}</p>
            </div>
          ))}
        </div>
      )}

      {/* Layout: lista izquierda + detalle derecha */}
      <div style={{ display:'grid',gridTemplateColumns:'300px 1fr',gap:'1rem',alignItems:'start' }} className="fade-up">

        {/* Lista de grupos */}
        <div style={{ background:'var(--bg-surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',overflow:'hidden' }}>
          <div style={{ padding:'0.75rem 1rem',borderBottom:'1px solid var(--border)',background:'var(--bg-elevated)',fontSize:'0.72rem',fontWeight:600,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.05em' }}>
            Grupos ({grupos.length})
          </div>
          {loading ? (
            <div style={{ display:'flex',justifyContent:'center',padding:'2rem' }}>
              <Loader2 size={22} color="var(--accent)" style={{ animation:'spin 0.8s linear infinite' }} />
            </div>
          ) : grupos.length === 0 ? (
            <div style={{ padding:'2rem',textAlign:'center',color:'var(--text-muted)',fontSize:'0.85rem' }}>
              <Layers size={32} style={{ opacity:0.3,marginBottom:'0.5rem' }} />
              <p>Sin grupos aún</p>
            </div>
          ) : (
            grupos.map(g => {
              const stCfg  = STATUS_LABEL[g.status] || STATUS_LABEL.activo
              const isExpired = g.subscriptionEnd && new Date() > new Date(g.subscriptionEnd)
              const efectiveStatus = isExpired ? STATUS_LABEL.expirado : stCfg
              const isSelected = selectedGrupo?.id === g.id

              return (
                <button key={g.id} onClick={() => selectGrupo(g)}
                  style={{ width:'100%',padding:'0.85rem 1rem',display:'flex',alignItems:'center',gap:'0.75rem',background:isSelected?'var(--accent-dim)':'transparent',border:'none',borderBottom:'1px solid var(--border)',cursor:'pointer',textAlign:'left' as const,fontFamily:'var(--font-body)',transition:'background 0.15s' }}>
                  <div style={{ width:36,height:36,borderRadius:9,background:'var(--bg-elevated)',border:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
                    <Layers size={15} color={isSelected ? 'var(--accent)' : 'var(--text-muted)'} />
                  </div>
                  <div style={{ flex:1,minWidth:0 }}>
                    <p style={{ fontWeight:600,fontSize:'0.85rem',color:isSelected?'var(--accent)':'var(--text-primary)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{g.nombre}</p>
                    <div style={{ display:'flex',alignItems:'center',gap:'0.4rem',marginTop:'0.15rem' }}>
                      <PlanBadge plan={g.plan} />
                      <efectiveStatus.Icon size={11} color={efectiveStatus.color} />
                    </div>
                  </div>
                  <ChevronRight size={14} color="var(--text-muted)" />
                </button>
              )
            })
          )}
        </div>

        {/* Detalle del grupo seleccionado */}
        {selectedGrupo ? (
          <div style={{ background:'var(--bg-surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',overflow:'hidden' }}>

            {/* Header del detalle */}
            <div style={{ padding:'1rem 1.25rem',borderBottom:'1px solid var(--border)',background:'var(--bg-elevated)',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:'0.75rem' }}>
              <div>
                <div style={{ display:'flex',alignItems:'center',gap:'0.75rem',flexWrap:'wrap' }}>
                  <h2 style={{ fontFamily:'var(--font-display)',fontSize:'1.1rem',fontWeight:700 }}>{selectedGrupo.nombre}</h2>
                  <PlanBadge plan={selectedGrupo.plan} />
                  {(() => {
                    const isExp = selectedGrupo.subscriptionEnd && new Date() > new Date(selectedGrupo.subscriptionEnd)
                    const st = isExp ? STATUS_LABEL.expirado : (STATUS_LABEL[selectedGrupo.status] || STATUS_LABEL.activo)
                    return <span style={{ display:'flex',alignItems:'center',gap:'0.25rem',fontSize:'0.78rem',color:st.color,fontWeight:600 }}><st.Icon size={13}/> {st.label}</span>
                  })()}
                </div>
                <p style={{ fontSize:'0.78rem',color:'var(--text-muted)',marginTop:'0.2rem' }}>
                  {selectedGrupo.ruc && `RUC: ${selectedGrupo.ruc} · `}
                  {selectedGrupo.edificios?.length || 0} edificios · {selectedGrupo.usuarios?.length || 0} usuarios
                </p>
              </div>
              <div style={{ display:'flex',gap:'0.5rem',flexWrap:'wrap' }}>
                <button onClick={() => { setEditForm({ nombre: selectedGrupo.nombre, ruc: selectedGrupo.ruc||'', direccion: selectedGrupo.direccion||'' }); setEditModal(true) }} style={btn2}>
                  <Pencil size={13} /> Editar
                </button>
                {selectedGrupo.status === 'activo'
                  ? <button onClick={() => handleSuspend(selectedGrupo)} style={{ ...btn2, color:'var(--accent)',borderColor:'rgba(245,166,35,0.3)' }}><XCircle size={13} /> Suspender</button>
                  : <button onClick={() => handleActivate(selectedGrupo)} style={{ ...btn2, color:'var(--green)',borderColor:'rgba(76,175,130,0.3)' }}><CheckCircle2 size={13} /> Reactivar</button>
                }
                <button onClick={() => setDeleteModal(selectedGrupo)} style={{ ...btn2, color:'#f87171',borderColor:'rgba(248,113,113,0.3)' }}>
                  <Trash2 size={13} /> Eliminar
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div style={{ display:'flex',borderBottom:'1px solid var(--border)',background:'var(--bg-elevated)' }}>
              {([
                { key:'edificios',   label:'Edificios',   Icon: Building2 },
                { key:'usuarios',    label:'Usuarios',    Icon: Users },
                { key:'suscripcion', label:'Suscripción', Icon: CreditCard },
              ] as { key: Tab; label: string; Icon: any }[]).map(tab => (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  style={{ display:'flex',alignItems:'center',gap:'0.4rem',padding:'0.75rem 1.25rem',background:'none',border:'none',borderBottom:`2px solid ${activeTab===tab.key?'var(--accent)':'transparent'}`,cursor:'pointer',fontFamily:'var(--font-body)',fontSize:'0.85rem',fontWeight:activeTab===tab.key?600:400,color:activeTab===tab.key?'var(--accent)':'var(--text-secondary)',transition:'all 0.15s' }}>
                  <tab.Icon size={14} /> {tab.label}
                </button>
              ))}
            </div>

            {/* Tab: Edificios */}
            {activeTab === 'edificios' && (
              <div style={{ padding:'1rem' }}>
                {edificiosDelGrupo.length === 0 ? (
                  <div style={{ textAlign:'center',padding:'2.5rem',color:'var(--text-muted)' }}>
                    <Building2 size={36} style={{ opacity:0.3,marginBottom:'0.5rem' }} />
                    <p style={{ marginBottom:'1rem' }}>Sin edificios asignados</p>
                    <p style={{ fontSize:'0.8rem' }}>Crea un edificio desde la pantalla de Edificios y asígnalo a este grupo.</p>
                  </div>
                ) : (
                  <div style={{ display:'flex',flexDirection:'column',gap:'0.5rem' }}>
                    {edificiosDelGrupo.map(e => (
                      <div key={e.id} style={{ display:'flex',alignItems:'center',gap:'0.75rem',padding:'0.75rem 1rem',background:'var(--bg-elevated)',border:'1px solid var(--border)',borderRadius:'var(--radius)' }}>
                        <Building2 size={16} color="var(--blue)" />
                        <div style={{ flex:1 }}>
                          <p style={{ fontWeight:600,fontSize:'0.875rem' }}>{e.nombre}</p>
                          <p style={{ fontSize:'0.75rem',color:'var(--text-muted)' }}>{e.nroDepas} departamentos</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab: Usuarios */}
            {activeTab === 'usuarios' && (
              <div style={{ padding:'1rem' }}>
                <div style={{ display:'flex',justifyContent:'flex-end',marginBottom:'0.75rem' }}>
                  <button onClick={() => setAddAdminModal(true)} style={btn}>
                    <Plus size={14} /> Agregar administrador
                  </button>
                </div>
                {(selectedGrupo.usuarios || []).length === 0 ? (
                  <div style={{ textAlign:'center',padding:'2rem',color:'var(--text-muted)' }}>
                    <Users size={32} style={{ opacity:0.3,marginBottom:'0.5rem' }} />
                    <p>Sin usuarios en este grupo</p>
                  </div>
                ) : (
                  <div style={{ display:'flex',flexDirection:'column',gap:'0.5rem' }}>
                    {(selectedGrupo.usuarios || []).map(u => {
                      const roleCfg = ROLE_CFG[u.role] || { label: u.role, color: 'var(--text-muted)' }
                      return (
                        <div key={u.id} style={{ display:'flex',alignItems:'center',gap:'0.75rem',padding:'0.75rem 1rem',background:'var(--bg-elevated)',border:'1px solid var(--border)',borderRadius:'var(--radius)',opacity:u.isActive?1:0.55 }}>
                          <div style={{ width:34,height:34,borderRadius:'50%',background:'var(--bg-surface)',border:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.8rem',fontWeight:700,color:roleCfg.color,flexShrink:0 }}>
                            {u.email[0].toUpperCase()}
                          </div>
                          <div style={{ flex:1,minWidth:0 }}>
                            <p style={{ fontWeight:600,fontSize:'0.85rem',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{u.email}</p>
                            <span style={{ fontSize:'0.72rem',fontWeight:600,color:roleCfg.color }}>{roleCfg.label}</span>
                          </div>
                          <div style={{ display:'flex',gap:'0.4rem',flexShrink:0 }}>
                            <button onClick={() => handleToggleUser(u)} title={u.isActive ? 'Desactivar' : 'Activar'}
                              style={{ background:'none',border:'none',cursor:'pointer',padding:0,display:'flex',alignItems:'center' }}>
                              {u.isActive
                                ? <ToggleRight size={20} color="var(--green)" />
                                : <ToggleLeft  size={20} color="var(--text-muted)" />}
                            </button>
                            <button onClick={() => { setResetModal(u); setResetPwd('') }} title="Resetear contraseña"
                              style={{ ...btn2, padding:'0.3rem 0.5rem' }}>
                              <KeyRound size={13} />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Tab: Suscripción */}
            {activeTab === 'suscripcion' && (
              <div style={{ padding:'1.25rem' }}>
                {/* Info actual */}
                <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'0.75rem',marginBottom:'1.5rem' }}>
                  {[
                    { label:'Máx. Edificios', value: selectedGrupo.maxEdificios >= 9999 ? '∞' : selectedGrupo.maxEdificios, color:'var(--blue)' },
                    { label:'Máx. Deptos',    value: selectedGrupo.maxDeptos    >= 9999 ? '∞' : selectedGrupo.maxDeptos,    color:'var(--green)' },
                    { label:'Máx. Períodos',  value: selectedGrupo.maxPeriodos  >= 9999 ? '∞' : selectedGrupo.maxPeriodos,  color:'#a78bfa' },
                  ].map(s => (
                    <div key={s.label} style={{ background:'var(--bg-elevated)',border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:'0.75rem 1rem',textAlign:'center' as const }}>
                      <p style={{ fontSize:'0.68rem',color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.04em',marginBottom:'0.3rem' }}>{s.label}</p>
                      <p style={{ fontWeight:800,fontSize:'1.4rem',color:s.color }}>{s.value}</p>
                    </div>
                  ))}
                </div>

                {/* Formulario actualización */}
                <div style={{ display:'flex',flexDirection:'column',gap:'1rem',background:'var(--bg-elevated)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',padding:'1.25rem' }}>
                  <p style={{ fontSize:'0.78rem',fontWeight:600,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.05em' }}>Actualizar suscripción</p>
                  <Field label="Plan">
                    <select style={inp} value={suscForm.plan} onChange={e => setSuscForm(p => ({ ...p, plan: e.target.value as Plan }))}>
                      {Object.entries(PLAN_CFG).filter(([p]) => p !== 'full').map(([p, cfg]) => (
                        <option key={p} value={p}>{cfg.label}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Fecha de vencimiento" hint="Dejar vacío = sin vencimiento (planes enterprise/premium)">
                    <input style={inp} type="date" value={suscForm.subscriptionEnd} onChange={e => setSuscForm(p => ({ ...p, subscriptionEnd: e.target.value }))} />
                  </Field>
                  <button style={btn} onClick={handleUpdateSuscripcion} disabled={saving}>
                    {saving ? <Loader2 size={14} style={{ animation:'spin 0.8s linear infinite' }} /> : <Save size={14} />}
                    Guardar suscripción
                  </button>
                </div>

                {selectedGrupo.subscriptionEnd && (
                  <p style={{ marginTop:'0.75rem',fontSize:'0.8rem',color:'var(--text-muted)',textAlign:'center' as const }}>
                    Vence el {new Date(selectedGrupo.subscriptionEnd).toLocaleDateString('es-PE')}
                  </p>
                )}
              </div>
            )}
          </div>
        ) : (
          <div style={{ background:'var(--bg-surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',display:'flex',alignItems:'center',justifyContent:'center',padding:'4rem',color:'var(--text-muted)',flexDirection:'column',gap:'0.75rem' }}>
            <Layers size={40} style={{ opacity:0.3 }} />
            <p>Selecciona un grupo para ver su detalle</p>
          </div>
        )}
      </div>

      {/* ── Modal crear grupo ── */}
      {createModal && (
        <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:'1rem' }}>
          <div style={{ background:'var(--bg-surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',padding:'2rem',width:'100%',maxWidth:520,maxHeight:'92vh',overflowY:'auto' }}>
            <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'1.5rem' }}>
              <h2 style={{ fontFamily:'var(--font-display)',fontSize:'1.25rem',fontWeight:700 }}>Nuevo grupo</h2>
              <button onClick={() => setCreateModal(false)} style={{ background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)' }}><X size={18} /></button>
            </div>
            <div style={{ display:'flex',flexDirection:'column',gap:'1rem' }}>
              <p style={{ fontSize:'0.78rem',color:'var(--text-muted)',padding:'0.5rem 0.75rem',background:'var(--bg-elevated)',borderRadius:'var(--radius)',borderLeft:'3px solid var(--blue)' }}>
                Al crear el grupo se creará automáticamente su primer usuario administrador.
              </p>
              <Field label="Nombre del grupo *">
                <input style={inp} placeholder="Ej. Inmobiliaria Los Pinos S.A." value={createForm.nombre} onChange={e => setCreateForm(p => ({ ...p, nombre: e.target.value }))} />
              </Field>
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem' }}>
                <Field label="RUC / NIT">
                  <input style={inp} placeholder="20123456789" value={createForm.ruc} onChange={e => setCreateForm(p => ({ ...p, ruc: e.target.value }))} />
                </Field>
                <Field label="Plan">
                  <select style={inp} value={createForm.plan} onChange={e => setCreateForm(p => ({ ...p, plan: e.target.value as Plan }))}>
                    {Object.entries(PLAN_CFG).filter(([p]) => p !== 'full').map(([p, cfg]) => (
                      <option key={p} value={p}>{cfg.label}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="Dirección">
                <input style={inp} placeholder="Av. Principal 123" value={createForm.direccion} onChange={e => setCreateForm(p => ({ ...p, direccion: e.target.value }))} />
              </Field>
              {['standard','premium','enterprise'].includes(createForm.plan) && (
                <Field label="Fecha de vencimiento">
                  <input style={inp} type="date" value={createForm.subscriptionEnd} onChange={e => setCreateForm(p => ({ ...p, subscriptionEnd: e.target.value }))} />
                </Field>
              )}
              <div style={{ height:1,background:'var(--border)',margin:'0.25rem 0' }} />
              <p style={{ fontSize:'0.72rem',fontWeight:600,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.05em' }}>Usuario administrador</p>
              <Field label="Email del administrador *">
                <input style={inp} type="email" placeholder="admin@empresa.com" value={createForm.adminEmail} onChange={e => setCreateForm(p => ({ ...p, adminEmail: e.target.value }))} />
              </Field>
              <Field label="Contraseña del administrador *">
                <input style={inp} type="password" placeholder="Mínimo 8 caracteres" value={createForm.adminPassword} onChange={e => setCreateForm(p => ({ ...p, adminPassword: e.target.value }))} />
              </Field>
            </div>
            <div style={{ display:'flex',gap:'0.75rem',marginTop:'1.5rem',justifyContent:'flex-end' }}>
              <button style={btn2} onClick={() => setCreateModal(false)}>Cancelar</button>
              <button style={btn} onClick={handleCreate} disabled={saving}>
                {saving ? <Loader2 size={15} style={{ animation:'spin 0.8s linear infinite' }} /> : <Save size={15} />}
                Crear grupo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal editar grupo ── */}
      {editModal && selectedGrupo && (
        <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:'1rem' }}>
          <div style={{ background:'var(--bg-surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',padding:'2rem',width:'100%',maxWidth:440 }}>
            <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'1.5rem' }}>
              <h2 style={{ fontFamily:'var(--font-display)',fontSize:'1.25rem',fontWeight:700 }}>Editar grupo</h2>
              <button onClick={() => setEditModal(false)} style={{ background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)' }}><X size={18} /></button>
            </div>
            <div style={{ display:'flex',flexDirection:'column',gap:'1rem' }}>
              <Field label="Nombre *">
                <input style={inp} value={editForm.nombre} onChange={e => setEditForm(p => ({ ...p, nombre: e.target.value }))} />
              </Field>
              <Field label="RUC / NIT">
                <input style={inp} value={editForm.ruc} onChange={e => setEditForm(p => ({ ...p, ruc: e.target.value }))} />
              </Field>
              <Field label="Dirección">
                <input style={inp} value={editForm.direccion} onChange={e => setEditForm(p => ({ ...p, direccion: e.target.value }))} />
              </Field>
            </div>
            <div style={{ display:'flex',gap:'0.75rem',marginTop:'1.5rem',justifyContent:'flex-end' }}>
              <button style={btn2} onClick={() => setEditModal(false)}>Cancelar</button>
              <button style={btn} onClick={handleUpdate} disabled={saving}>
                {saving ? <Loader2 size={15} style={{ animation:'spin 0.8s linear infinite' }} /> : <Save size={15} />}
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal agregar admin ── */}
      {addAdminModal && (
        <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:'1rem' }}>
          <div style={{ background:'var(--bg-surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',padding:'2rem',width:'100%',maxWidth:420 }}>
            <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'1.5rem' }}>
              <h2 style={{ fontFamily:'var(--font-display)',fontSize:'1.25rem',fontWeight:700 }}>Agregar administrador</h2>
              <button onClick={() => setAddAdminModal(false)} style={{ background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)' }}><X size={18} /></button>
            </div>
            <div style={{ display:'flex',flexDirection:'column',gap:'1rem' }}>
              <Field label="Email *">
                <input style={inp} type="email" value={adminForm.email} onChange={e => setAdminForm(p => ({ ...p, email: e.target.value }))} />
              </Field>
              <Field label="Contraseña *">
                <input style={inp} type="password" placeholder="Mínimo 8 caracteres" value={adminForm.password} onChange={e => setAdminForm(p => ({ ...p, password: e.target.value }))} />
              </Field>
            </div>
            <div style={{ display:'flex',gap:'0.75rem',marginTop:'1.5rem',justifyContent:'flex-end' }}>
              <button style={btn2} onClick={() => setAddAdminModal(false)}>Cancelar</button>
              <button style={btn} onClick={handleAddAdmin} disabled={saving}>
                {saving ? <Loader2 size={15} style={{ animation:'spin 0.8s linear infinite' }} /> : <Shield size={15} />}
                Agregar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal reset contraseña ── */}
      {resetModal && (
        <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:'1rem' }}>
          <div style={{ background:'var(--bg-surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',padding:'2rem',width:'100%',maxWidth:400 }}>
            <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'1rem' }}>
              <h2 style={{ fontFamily:'var(--font-display)',fontSize:'1.2rem',fontWeight:700 }}>Resetear contraseña</h2>
              <button onClick={() => setResetModal(null)} style={{ background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)' }}><X size={18} /></button>
            </div>
            <p style={{ color:'var(--text-muted)',fontSize:'0.85rem',marginBottom:'1rem' }}>
              Usuario: <strong style={{ color:'var(--text-primary)' }}>{resetModal.email}</strong>
            </p>
            <Field label="Nueva contraseña *">
              <input style={inp} type="password" placeholder="Mínimo 8 caracteres" value={resetPwd} onChange={e => setResetPwd(e.target.value)} />
            </Field>
            <div style={{ display:'flex',gap:'0.75rem',marginTop:'1.25rem',justifyContent:'flex-end' }}>
              <button style={btn2} onClick={() => setResetModal(null)}>Cancelar</button>
              <button style={btn} onClick={handleResetPassword} disabled={saving}>
                {saving ? <Loader2 size={14} style={{ animation:'spin 0.8s linear infinite' }} /> : <KeyRound size={14} />}
                Resetear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal eliminar ── */}
      {deleteModal && (
        <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:'1rem' }}>
          <div style={{ background:'var(--bg-surface)',border:'1px solid rgba(248,113,113,0.3)',borderRadius:'var(--radius-lg)',padding:'2rem',width:'100%',maxWidth:420 }}>
            <div style={{ display:'flex',alignItems:'center',gap:'0.75rem',marginBottom:'1rem' }}>
              <div style={{ width:40,height:40,borderRadius:'50%',background:'rgba(248,113,113,0.1)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
                <Trash2 size={18} color="#f87171" />
              </div>
              <h2 style={{ fontFamily:'var(--font-display)',fontSize:'1.15rem',fontWeight:700 }}>Eliminar grupo</h2>
            </div>
            <p style={{ color:'var(--text-secondary)',fontSize:'0.875rem',marginBottom:'0.5rem' }}>
              ¿Eliminar <strong>"{deleteModal.nombre}"</strong>?
            </p>
            <p style={{ color:'#f87171',fontSize:'0.82rem',marginBottom:'1.5rem' }}>
              Se eliminarán todos sus usuarios, edificios, departamentos, mediciones y pagos. Esta acción no se puede deshacer.
            </p>
            <div style={{ display:'flex',gap:'0.75rem',justifyContent:'flex-end' }}>
              <button style={btn2} onClick={() => setDeleteModal(null)}>Cancelar</button>
              <button onClick={handleDelete} disabled={saving}
                style={{ ...btn, background:'#f87171',color:'#fff' }}>
                {saving ? <Loader2 size={14} style={{ animation:'spin 0.8s linear infinite' }} /> : <Trash2 size={14} />}
                Eliminar todo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
