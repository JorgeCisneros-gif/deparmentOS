// src/pages/UsersPage.tsx
import { useEffect, useState } from 'react'
import api from '../services/api'
import { useTz } from '../store/timezone.store'
import toast from 'react-hot-toast'
import {
  Plus, Pencil, X, Loader2, Save, Shield, User, Mail,
  ToggleLeft, ToggleRight, KeyRound, Send, Copy, Check,
  Building2, Home,
} from 'lucide-react'

interface UserItem {
  id: string; email: string; role: 'supervisor' | 'administrador' | 'propietario'
  isActive: boolean; lastLogin?: string; createdAt: string
  idEdificio?: string; idDepartamento?: string; idPropietario?: string
}
interface Building    { id: string; nombre: string }
interface Department  { id: string; nrDepartamento: string }
interface Propietario { id: string; nombre: string }

const EMPTY_FORM = { email:'', password:'', role:'propietario' as const, idEdificio:'', idDepartamento:'', idPropietario:'' }

const btn: React.CSSProperties  = { display:'flex',alignItems:'center',gap:'0.5rem',background:'var(--accent)',color:'#0f1117',fontWeight:600,fontSize:'0.875rem',padding:'0.55rem 1rem',borderRadius:'var(--radius)',border:'none',cursor:'pointer',fontFamily:'var(--font-body)' }
const btn2: React.CSSProperties = { ...btn, background:'var(--bg-elevated)',color:'var(--text-secondary)',border:'1px solid var(--border)' }

function Field({ label, children }: any) {
  return (
    <div>
      <label style={{ fontSize:'0.75rem',fontWeight:600,color:'var(--text-secondary)',textTransform:'uppercase' as const,letterSpacing:'0.04em',display:'block',marginBottom:'0.35rem' }}>{label}</label>
      {children}
    </div>
  )
}

export default function UsersPage() {
  const { fmtDT } = useTz()
  const [users, setUsers]           = useState<UserItem[]>([])
  const [buildings, setBuildings]   = useState<Building[]>([])
  const [depts, setDepts]           = useState<Department[]>([])
  const [props, setProps]           = useState<Propietario[]>([])
  const [loading, setLoading]       = useState(true)
  const [modal, setModal]           = useState(false)
  const [editing, setEditing]       = useState<any>(null)
  const [form, setForm]             = useState(EMPTY_FORM)
  const [saving, setSaving]             = useState(false)
  const [propietarioDepto, setPropietarioDepto] = useState<{id:string;nombre:string}|null>(null)
  const [filterRole, setFilterRole]     = useState('')
  const [resetModal, setResetModal] = useState<UserItem | null>(null)
  const [resetResult, setResetResult] = useState<any>(null)
  const [sendingReset, setSendingReset] = useState(false)
  const [copied, setCopied]         = useState(false)

  useEffect(() => {
    load()
    api.get('/buildings').then(r => setBuildings(r.data))
    api.get('/propietarios').then(r => setProps(r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    if (form.idEdificio) {
      api.get('/departments', { params: { buildingId: form.idEdificio } }).then(r => setDepts(r.data))
    } else { setDepts([]) }
  }, [form.idEdificio])

  // Al seleccionar departamento, buscar el propietario vinculado
  useEffect(() => {
    if (!form.idDepartamento || !form.idEdificio) { setPropietarioDepto(null); return }
    api.get('/propietarios', { params: { buildingId: form.idEdificio } })
      .then(r => {
        const owners = r.data || []
        // El servicio devuelve depto_id en los resultados del join
        const match = owners.find((o: any) =>
          o.depto_id === form.idDepartamento
        )
        if (match) {
          setPropietarioDepto({ id: match.id, nombre: match.nombre })
          setForm(prev => ({ ...prev, idPropietario: match.id }))
        } else {
          setPropietarioDepto(null)
          setForm(prev => ({ ...prev, idPropietario: '' }))
        }
      })
      .catch(() => setPropietarioDepto(null))
  }, [form.idDepartamento, form.idEdificio])

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/users', { params: filterRole ? { role: filterRole } : {} })
      setUsers(data)
    } catch { toast.error('Error cargando usuarios') }
    finally { setLoading(false) }
  }

  const openNew  = () => { setForm(EMPTY_FORM); setEditing(null); setPropietarioDepto(null); setModal(true) }
  const openEdit = (u: UserItem) => {
    setPropietarioDepto(null)
    setForm({ email:u.email, password:'', role:u.role, idEdificio:u.idEdificio||'', idDepartamento:u.idDepartamento||'', idPropietario:u.idPropietario||'' })
    setEditing(u); setModal(true)
  }
  const close = () => { setModal(false); setEditing(null); setForm(EMPTY_FORM) }

  const save = async () => {
    if (!form.email) return toast.error('El email es obligatorio')
    if (!editing && !form.password) return toast.error('La contraseña es obligatoria')
    if (!editing && form.password.length < 8) return toast.error('La contraseña debe tener al menos 8 caracteres')
    setSaving(true)
    try {
      const payload: any = {
        email:           form.email,
        role:            form.role,
        idEdificio:      form.idEdificio    || undefined,
        idDepartamento:  form.idDepartamento || undefined,
        idPropietario:   form.idPropietario  || undefined,
      }
      if (!editing || form.password) payload.password = form.password
      if (editing) {
        await api.patch(`/users/${editing.id}`, payload)
        toast.success('Usuario actualizado')
      } else {
        await api.post('/users', payload)
        toast.success('Usuario creado')
      }
      await load(); close()
    } catch (e: any) {
      const msg = e?.response?.data?.message
      toast.error(Array.isArray(msg) ? msg.join(', ') : (msg || 'Error guardando'))
    } finally { setSaving(false) }
  }

  const toggleActive = async (u: UserItem) => {
    try {
      await api.patch(`/users/${u.id}/${u.isActive ? 'deactivate' : 'activate'}`)
      setUsers(prev => prev.map(x => x.id===u.id ? {...x, isActive:!u.isActive} : x))
      toast.success(u.isActive ? 'Usuario desactivado' : 'Usuario reactivado')
    } catch { toast.error('Error actualizando') }
  }

  const sendReset = async () => {
    if (!resetModal) return
    setSendingReset(true); setResetResult(null)
    try {
      const { data } = await api.post('/users/reset/request', { email: resetModal.email })
      setResetResult(data)
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Error') }
    finally { setSendingReset(false) }
  }

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  const filteredUsers = filterRole ? users.filter(u => u.role === filterRole) : users

  return (
    <div style={{ padding:'2rem',maxWidth:1100,margin:'0 auto' }}>
      {/* Header */}
      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'1.5rem',flexWrap:'wrap',gap:'1rem' }} className="fade-up">
        <div>
          <h1 style={{ fontFamily:'var(--font-display)',fontSize:'1.8rem',fontWeight:700,letterSpacing:'-0.02em',marginBottom:'0.2rem' }}>Usuarios</h1>
          <p style={{ color:'var(--text-secondary)',fontSize:'0.875rem' }}>Gestión de acceso al sistema</p>
        </div>
        <button onClick={openNew} style={btn}><Plus size={15}/> Nuevo usuario</button>
      </div>

      {/* Filtro */}
      <div style={{ display:'flex',gap:'0.5rem',marginBottom:'1.25rem' }} className="fade-up">
        {[['','Todos'],['supervisor','Supervisores'],['administrador','Administradores'],['propietario','Propietarios']].map(([val,label]) => (
          <button key={val} onClick={() => { setFilterRole(val); load() }}
            style={{ padding:'0.4rem 0.9rem',borderRadius:'var(--radius)',border:`1px solid ${filterRole===val?'var(--accent)':'var(--border)'}`,background:filterRole===val?'var(--accent-dim)':'var(--bg-elevated)',color:filterRole===val?'var(--accent)':'var(--text-secondary)',cursor:'pointer',fontSize:'0.82rem',fontFamily:'var(--font-body)',fontWeight:filterRole===val?600:400 }}>
            {label}
          </button>
        ))}
      </div>

      {/* Tabla */}
      {loading ? (
        <div style={{ display:'flex',justifyContent:'center',padding:'4rem' }}><Loader2 size={24} color="var(--accent)" style={{ animation:'spin 0.8s linear infinite' }}/></div>
      ) : (
        <div style={{ background:'var(--bg-surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',overflow:'auto' }} className="fade-up">
          <table style={{ width:'100%',borderCollapse:'collapse',fontSize:'0.875rem' }}>
            <thead>
              <tr>
                {['Usuario','Rol','Edificio/Depto','Estado','Último acceso','Acciones'].map(h => (
                  <th key={h} style={{ textAlign:'left',padding:'0.75rem 1rem',color:'var(--text-muted)',fontSize:'0.7rem',fontWeight:600,letterSpacing:'0.05em',textTransform:'uppercase' as const,borderBottom:'1px solid var(--border)',background:'var(--bg-elevated)',whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr><td colSpan={6} style={{ padding:'3rem',textAlign:'center',color:'var(--text-muted)' }}>No hay usuarios</td></tr>
              ) : filteredUsers.map((u, i) => (
                <tr key={u.id} style={{ opacity:u.isActive?1:0.5,...(i%2!==0?{background:'rgba(255,255,255,0.02)'}:{}) }}>
                  <td style={{ padding:'0.85rem 1rem',borderBottom:'1px solid rgba(255,255,255,0.03)' }}>
                    <div style={{ display:'flex',alignItems:'center',gap:'0.6rem' }}>
                      <div style={{ width:32,height:32,borderRadius:'50%',background:u.role==='supervisor'?'var(--accent-dim)':u.role==='administrador'?'rgba(167,139,250,0.12)':'var(--blue-dim)',border:`1px solid ${u.role==='supervisor'?'rgba(245,166,35,0.3)':u.role==='administrador'?'rgba(167,139,250,0.3)':'rgba(74,158,255,0.3)'}`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
                        {u.role==='supervisor' ? <Shield size={14} color="var(--accent)"/> : u.role==='administrador' ? <Shield size={14} color="#a78bfa"/> : <User size={14} color="var(--blue)"/>}
                      </div>
                      <div>
                        <p style={{ fontWeight:600,fontSize:'0.875rem' }}>{u.email}</p>
                        {!u.isActive && <span style={{ fontSize:'0.7rem',color:'#f87171' }}>Inactivo</span>}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding:'0.85rem 1rem',borderBottom:'1px solid rgba(255,255,255,0.03)' }}>
                    <span style={{ fontSize:'0.78rem',fontWeight:600,
                      color:u.role==='supervisor'?'var(--accent)':u.role==='administrador'?'#a78bfa':'var(--blue)',
                      background:u.role==='supervisor'?'var(--accent-dim)':u.role==='administrador'?'rgba(167,139,250,0.1)':'var(--blue-dim)',
                      border:`1px solid ${u.role==='supervisor'?'rgba(245,166,35,0.3)':u.role==='administrador'?'rgba(167,139,250,0.3)':'rgba(74,158,255,0.3)'}`,
                      borderRadius:4,padding:'0.2rem 0.5rem' }}>
                      {u.role==='supervisor'?'Supervisor':u.role==='administrador'?'Administrador':'Propietario'}
                    </span>
                  </td>
                  <td style={{ padding:'0.85rem 1rem',borderBottom:'1px solid rgba(255,255,255,0.03)',fontSize:'0.8rem',color:'var(--text-secondary)' }}>
                    {u.idEdificio ? <span style={{ display:'flex',alignItems:'center',gap:'0.3rem' }}><Building2 size={12}/>edificio asignado</span>
                    : u.idDepartamento ? <span style={{ display:'flex',alignItems:'center',gap:'0.3rem' }}><Home size={12}/>depto asignado</span>
                    : <span style={{ color:'var(--text-muted)' }}>—</span>}
                  </td>
                  <td style={{ padding:'0.85rem 1rem',borderBottom:'1px solid rgba(255,255,255,0.03)' }}>
                    <button onClick={() => toggleActive(u)} style={{ display:'flex',alignItems:'center',gap:'0.35rem',background:'none',border:'none',cursor:'pointer',fontFamily:'var(--font-body)',color:u.isActive?'var(--green)':'var(--text-muted)',fontSize:'0.8rem',padding:0 }}>
                      {u.isActive ? <ToggleRight size={18} color="var(--green)"/> : <ToggleLeft size={18} color="var(--text-muted)"/>}
                      {u.isActive?'Activo':'Inactivo'}
                    </button>
                  </td>
                  <td style={{ padding:'0.85rem 1rem',borderBottom:'1px solid rgba(255,255,255,0.03)',fontSize:'0.78rem',color:'var(--text-muted)' }}>
                    {u.lastLogin ? fmtDT(u.lastLogin) : 'Nunca'}
                  </td>
                  <td style={{ padding:'0.85rem 1rem',borderBottom:'1px solid rgba(255,255,255,0.03)' }}>
                    <div style={{ display:'flex',gap:'0.35rem' }}>
                      <button onClick={() => openEdit(u)} title="Editar"
                        style={{ background:'var(--bg-elevated)',border:'1px solid var(--border)',borderRadius:6,width:28,height:28,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'var(--text-secondary)' }}>
                        <Pencil size={12}/>
                      </button>
                      <button onClick={() => { setResetModal(u); setResetResult(null) }} title="Enviar reset de contraseña"
                        style={{ background:'var(--bg-elevated)',border:'1px solid var(--border)',borderRadius:6,width:28,height:28,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'#a78bfa' }}>
                        <KeyRound size={12}/>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal crear/editar */}
      {modal && (
        <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:'1rem',backdropFilter:'blur(4px)' }} onClick={close}>
          <div style={{ background:'var(--bg-surface)',border:'1px solid var(--border-accent)',borderRadius:'var(--radius-lg)',width:'100%',maxWidth:480,boxShadow:'var(--shadow-lg)' }} onClick={e=>e.stopPropagation()} className="fade-up">
            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',padding:'1.25rem 1.5rem',borderBottom:'1px solid var(--border)' }}>
              <h2 style={{ fontFamily:'var(--font-display)',fontSize:'1.05rem',fontWeight:700 }}>{editing?'Editar usuario':'Nuevo usuario'}</h2>
              <button onClick={close} style={{ background:'var(--bg-elevated)',border:'1px solid var(--border)',borderRadius:6,width:30,height:30,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'var(--text-secondary)' }}><X size={16}/></button>
            </div>
            <div style={{ display:'flex',flexDirection:'column',gap:'1rem',padding:'1.5rem' }}>
              <Field label="Email *">
                <input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="usuario@email.com" autoFocus style={{ width:'100%' }}/>
              </Field>
              <Field label={editing?'Nueva contraseña (dejar vacío para no cambiar)':'Contraseña *'}>
                <input type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} placeholder="Mín. 8 caracteres" style={{ width:'100%' }}/>
              </Field>
              <Field label="Rol *">
                <select value={form.role} onChange={e=>setForm({...form,role:e.target.value as any})} style={{ width:'100%' }}>
                  <option value="propietario">Propietario</option>
                  <option value="supervisor">Supervisor</option>
                  <option value="administrador">Administrador</option>
                </select>
              </Field>
              <Field label="Edificio">
                <select value={form.idEdificio} onChange={e=>setForm({...form,idEdificio:e.target.value,idDepartamento:''})} style={{ width:'100%' }}>
                  <option value="">— Sin asignar —</option>
                  {buildings.map(b=><option key={b.id} value={b.id}>{b.nombre}</option>)}
                </select>
              </Field>
              {form.role==='propietario' && form.idEdificio && (
                <Field label="Departamento">
                  <select value={form.idDepartamento} onChange={e=>setForm({...form,idDepartamento:e.target.value})} style={{ width:'100%' }}>
                    <option value="">— Sin asignar —</option>
                    {depts.map(d=><option key={d.id} value={d.id}>Depto {d.nrDepartamento}</option>)}
                  </select>
                </Field>
              )}
              {form.role==='propietario' && form.idDepartamento && (
                <div style={{ gridColumn:'1/-1', background:'var(--bg-elevated)', border:`1px solid ${propietarioDepto?'rgba(62,207,142,0.3)':'var(--border)'}`, borderRadius:'var(--radius)', padding:'0.65rem 1rem' }}>
                  <p style={{ fontSize:'0.72rem', color:'var(--text-muted)', marginBottom:'0.2rem', textTransform:'uppercase', letterSpacing:'0.04em' }}>Propietario del departamento</p>
                  {propietarioDepto
                    ? <p style={{ fontWeight:600, color:'var(--green)', display:'flex', alignItems:'center', gap:'0.4rem' }}>✓ {propietarioDepto.nombre}</p>
                    : <p style={{ color:'var(--text-muted)', fontSize:'0.85rem' }}>⚠ Este departamento no tiene propietario asignado en el sistema</p>
                  }
                </div>
              )}
            </div>
            <div style={{ display:'flex',justifyContent:'flex-end',gap:'0.75rem',padding:'1rem 1.5rem',borderTop:'1px solid var(--border)' }}>
              <button onClick={close} style={btn2}>Cancelar</button>
              <button onClick={save} disabled={saving} style={btn}>
                {saving?<Loader2 size={14} style={{ animation:'spin 0.8s linear infinite' }}/>:<Save size={14}/>}
                {editing?'Guardar':'Crear usuario'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal reset contraseña */}
      {resetModal && (
        <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:'1rem',backdropFilter:'blur(4px)' }} onClick={()=>setResetModal(null)}>
          <div style={{ background:'var(--bg-surface)',border:'1px solid var(--border-accent)',borderRadius:'var(--radius-lg)',width:'100%',maxWidth:460,boxShadow:'var(--shadow-lg)' }} onClick={e=>e.stopPropagation()} className="fade-up">
            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',padding:'1.25rem 1.5rem',borderBottom:'1px solid var(--border)' }}>
              <h2 style={{ fontFamily:'var(--font-display)',fontSize:'1.05rem',fontWeight:700,display:'flex',alignItems:'center',gap:'0.5rem' }}>
                <KeyRound size={16} color="#a78bfa"/> Restablecer contraseña
              </h2>
              <button onClick={()=>setResetModal(null)} style={{ background:'var(--bg-elevated)',border:'1px solid var(--border)',borderRadius:6,width:30,height:30,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'var(--text-secondary)' }}><X size={16}/></button>
            </div>
            <div style={{ padding:'1.5rem' }}>
              <div style={{ background:'var(--bg-elevated)',border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:'0.75rem 1rem',marginBottom:'1.25rem' }}>
                <p style={{ fontSize:'0.78rem',color:'var(--text-muted)',marginBottom:'0.15rem' }}>Usuario</p>
                <p style={{ fontWeight:600 }}>{resetModal.email}</p>
              </div>
              <p style={{ fontSize:'0.85rem',color:'var(--text-secondary)',marginBottom:'1.25rem',lineHeight:1.55 }}>
                Se enviará un enlace de recuperación según la configuración de notificaciones del sistema (<code style={{ background:'var(--bg-elevated)',padding:'0.1rem 0.3rem',borderRadius:3,fontSize:'0.8rem' }}>RESET_NOTIFICATION</code> en .env).
              </p>

              {!resetResult ? (
                <button onClick={sendReset} disabled={sendingReset} style={{ ...btn, width:'100%', justifyContent:'center' }}>
                  {sendingReset ? <Loader2 size={14} style={{ animation:'spin 0.8s linear infinite' }}/> : <Send size={14}/>}
                  Enviar instrucciones
                </button>
              ) : (
                <div style={{ display:'flex',flexDirection:'column',gap:'0.75rem' }}>
                  <div style={{ background:'rgba(62,207,142,0.07)',border:'1px solid rgba(62,207,142,0.2)',borderRadius:'var(--radius)',padding:'0.75rem 1rem' }}>
                    <p style={{ fontSize:'0.85rem',color:'var(--green)',fontWeight:600 }}>✓ {resetResult.message}</p>
                  </div>
                  {/* Link WhatsApp */}
                  {resetResult.whatsappUrl && (
                    <a href={resetResult.whatsappUrl} target="_blank" rel="noreferrer"
                      style={{ display:'flex',alignItems:'center',justifyContent:'center',gap:'0.5rem',background:'#25d366',color:'#fff',fontWeight:600,fontSize:'0.875rem',padding:'0.6rem 1rem',borderRadius:'var(--radius)',textDecoration:'none' }}>
                      <Send size={14}/> Abrir en WhatsApp
                    </a>
                  )}
                  {/* URL de desarrollo */}
                  {resetResult.resetUrl && (
                    <div style={{ background:'var(--bg-elevated)',border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:'0.75rem 1rem' }}>
                      <p style={{ fontSize:'0.7rem',color:'var(--accent)',fontWeight:600,marginBottom:'0.3rem' }}>🛠 URL de desarrollo (no visible en producción)</p>
                      <div style={{ display:'flex',gap:'0.5rem',alignItems:'center' }}>
                        <code style={{ fontSize:'0.72rem',color:'var(--text-secondary)',flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{resetResult.resetUrl}</code>
                        <button onClick={()=>copyUrl(resetResult.resetUrl)} style={{ background:'none',border:'1px solid var(--border)',borderRadius:4,padding:'0.2rem 0.5rem',cursor:'pointer',color:'var(--text-muted)',flexShrink:0,fontFamily:'var(--font-body)',fontSize:'0.72rem',display:'flex',alignItems:'center',gap:'0.25rem' }}>
                          {copied?<><Check size={11}/>Copiado</>:<><Copy size={11}/>Copiar</>}
                        </button>
                      </div>
                    </div>
                  )}
                  <button onClick={()=>setResetModal(null)} style={btn2}>Cerrar</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
