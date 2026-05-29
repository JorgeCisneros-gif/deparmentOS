// src/pages/OwnersPage.tsx
import { useEffect, useState } from 'react'
import api from '../services/api'
import toast from 'react-hot-toast'
import { useAuthStore } from '../store/auth.store'
import {
  Plus, Pencil, X, Loader2, Save, Phone, Mail,
  Building2, CreditCard, Users, AlertTriangle,
  KeyRound, User,
} from 'lucide-react'

interface Owner {
  id: string; nombre: string; telefono: string; correo: string
  banco: string; tipo_pago: string; status: string
  nr_departamento: string; edificio_nombre: string
  edificio_id: string; depto_id?: string; id_departamento?: string
}
interface Building  { id: string; nombre: string }
interface Department { id: string; nrDepartamento: string; piso: number }

const BANCO_OPTS = ['BCP','BBVA','Interbank','Scotiabank','Yape','Plin','Efectivo','Otro']
const PAGO_OPTS  = ['transferencia','yape','plin','efectivo','deposito']

const btn:  React.CSSProperties = { display:'flex',alignItems:'center',gap:'0.5rem',background:'var(--accent)',color:'#0f1117',fontWeight:600,fontSize:'0.875rem',padding:'0.6rem 1.1rem',borderRadius:'var(--radius)',border:'none',cursor:'pointer',fontFamily:'var(--font-body)' }
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

const EMPTY_FORM = {
  nombre: '', telefono: '', correo: '', banco: 'BCP', tipo_pago: 'transferencia',
  idEdificio: '', idDepartamento: '',
  // Usuario automático
  userEmail: '', userPassword: '',
}

export default function OwnersPage() {
  const { isSupervisor, isAdministrador, user } = useAuthStore()

  const [owners, setOwners]       = useState<Owner[]>([])
  const [buildings, setBuildings] = useState<Building[]>([])
  const [depts, setDepts]         = useState<Department[]>([])
  const [loading, setLoading]     = useState(true)
  const [filterBld, setFilterBld] = useState('')
  const [modal, setModal]         = useState(false)
  const [editModal, setEditModal] = useState<Owner | null>(null)
  const [form, setForm]           = useState(EMPTY_FORM)
  const [editForm, setEditForm]   = useState<Partial<Owner>>({})
  const [saving, setSaving]       = useState(false)
  const [hasEdificioConDeptos, setHasEdificioConDeptos] = useState(true)
  const [checkingReq, setCheckingReq] = useState(false)

  useEffect(() => { loadBuildings() }, [])

  useEffect(() => {
    loadOwners()
  }, [filterBld])

  useEffect(() => {
    if (!form.idEdificio) { setDepts([]); return }
    api.get('/departments', { params: { buildingId: form.idEdificio } })
      .then(r => setDepts(r.data || []))
      .catch(() => setDepts([]))
  }, [form.idEdificio])

  const loadBuildings = async () => {
    try {
      const { data } = await api.get('/buildings')
      setBuildings(data)
      if (isAdministrador() && data.length > 0) {
        setFilterBld(data[0].id)
      }
    } catch {}
  }

  const loadOwners = async () => {
  setLoading(true)
  try {
    // Si es admin y no hay filtro de edificio, cargar todos los de sus edificios
    let params: any = {}
    if (filterBld) {
      params.buildingId = filterBld
    } else if (isAdministrador() && buildings.length > 0) {
      // Cargar propietarios de todos los edificios del grupo
      const allOwners: Owner[] = []
      for (const b of buildings) {
        const { data } = await api.get('/propietarios', { params: { buildingId: b.id } })
        allOwners.push(...(data || []))
      }
      setOwners(allOwners)
      setLoading(false)
      return
    }
    const { data } = await api.get('/propietarios', { params })
    setOwners(data || [])
  } catch { toast.error('Error cargando propietarios') }
  finally { setLoading(false) }
}

  const checkRequisitos = async () => {
    setCheckingReq(true)
    try {
      // Verificar que el grupo tenga edificios con departamentos
      const { data } = await api.get('/grupos/mi-grupo')
      const grupoId = data?.id
      if (!grupoId) return

      // Verificar si hay departamentos en los edificios del grupo
      let totalDeptos = 0
      for (const edificio of (data.edificios || [])) {
        const dRes = await api.get('/departments', { params: { buildingId: edificio.id } })
        totalDeptos += (dRes.data || []).length
      }
      setHasEdificioConDeptos(totalDeptos > 0)
    } catch {} finally { setCheckingReq(false) }
  }

  const openNew = async () => {
    setForm(EMPTY_FORM)
    await checkRequisitos()
    setModal(true)
  }

  const handleCreate = async () => {
    if (!form.nombre)          return toast.error('El nombre es requerido')
    if (!form.idEdificio)      return toast.error('Selecciona un edificio')
    if (!form.idDepartamento)  return toast.error('Selecciona un departamento')
    if (!form.userEmail)       return toast.error('El email del usuario es requerido')
    if (form.userPassword.length < 8) return toast.error('La contraseña debe tener mínimo 8 caracteres')

    setSaving(true)
    try {
      // 1. Crear el propietario
      const { data: newOwner } = await api.post('/propietarios', {
        nombre:           form.nombre,
        telefono:         form.telefono,
        correo:           form.correo,
        banco:            form.banco,
        tipo_pago:        form.tipo_pago,
        idDepartamento:   form.idDepartamento,
      })

      // 2. Crear el usuario de tipo propietario automáticamente
      await api.post('/users', {
        email:          form.userEmail,
        password:       form.userPassword,
        role:           'propietario',
        idGrupo:        user?.idGrupo || undefined,
        idEdificio:     form.idEdificio,
        idDepartamento: form.idDepartamento,
        idPropietario:  newOwner.id,
      })

      toast.success(`Propietario creado con acceso al sistema`)
      setModal(false); setForm(EMPTY_FORM); loadOwners()
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Error al crear propietario')
    } finally { setSaving(false) }
  }

  const handleUpdate = async () => {
    if (!editModal) return
    setSaving(true)
    try {
      await api.patch(`/propietarios/${editModal.id}`, editForm)
      toast.success('Propietario actualizado')
      setEditModal(null); loadOwners()
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Error al actualizar')
    } finally { setSaving(false) }
  }

  const activos   = owners.filter(o => o.status === 'activo').length
  const inactivos = owners.filter(o => o.status !== 'activo').length

  return (
    <div style={{ padding:'2rem', maxWidth:1200, margin:'0 auto' }}>

      {/* Header */}
      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'1.5rem',flexWrap:'wrap',gap:'1rem' }} className="fade-up">
        <div>
          <h1 style={{ fontFamily:'var(--font-display)',fontSize:'1.8rem',fontWeight:700,letterSpacing:'-0.02em',marginBottom:'0.2rem' }}>Propietarios</h1>
          <p style={{ color:'var(--text-secondary)',fontSize:'0.875rem' }}>{activos} activos · {inactivos} inactivos</p>
        </div>
        <button onClick={openNew} style={btn}><Plus size={16} /> Nuevo propietario</button>
      </div>

      {/* Filtro edificio */}
      {isSupervisor() && (
        <div style={{ marginBottom:'1.25rem' }} className="fade-up">
          <label style={{ fontSize:'0.72rem',fontWeight:600,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.05em',display:'block',marginBottom:'0.3rem' }}>
            Filtrar por edificio
          </label>
          <select value={filterBld} onChange={e => setFilterBld(e.target.value)}
            style={{ ...inp, minWidth:220, width:'auto' }}>
            <option value="">Todos los edificios</option>
            {buildings.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
          </select>
        </div>
      )}

      {/* Tabla */}
      {loading ? (
        <div style={{ display:'flex',justifyContent:'center',padding:'4rem' }}>
          <Loader2 size={28} color="var(--accent)" style={{ animation:'spin 0.8s linear infinite' }} />
        </div>
      ) : owners.length === 0 ? (
        <div style={{ textAlign:'center',padding:'4rem',background:'var(--bg-surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',color:'var(--text-muted)' }}>
          <Users size={40} style={{ opacity:0.3,marginBottom:'0.75rem' }} />
          <p>No hay propietarios registrados</p>
        </div>
      ) : (
        <div style={{ background:'var(--bg-surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',overflow:'auto' }} className="fade-up">
          <table style={{ width:'100%',borderCollapse:'collapse',fontSize:'0.875rem' }}>
            <thead>
              <tr>
                {['Propietario','Contacto','Departamento','Banco / Pago','Estado'].map(h => (
                  <th key={h} style={{ textAlign:'left',padding:'0.75rem 1rem',color:'var(--text-muted)',fontSize:'0.7rem',fontWeight:600,letterSpacing:'0.05em',textTransform:'uppercase' as const,borderBottom:'1px solid var(--border)',background:'var(--bg-elevated)',whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {owners.map((o, i) => (
                <tr key={o.id} style={i%2!==0 ? {background:'rgba(255,255,255,0.02)'} : {}}>
                  <td style={{ padding:'0.85rem 1rem',borderBottom:'1px solid rgba(255,255,255,0.03)' }}>
                    <div style={{ display:'flex',alignItems:'center',gap:'0.6rem' }}>
                      <div style={{ width:32,height:32,borderRadius:'50%',background:'var(--bg-elevated)',border:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.8rem',fontWeight:700,color:'var(--accent)',flexShrink:0 }}>
                        {o.nombre?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p style={{ fontWeight:600 }}>{o.nombre}</p>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding:'0.85rem 1rem',borderBottom:'1px solid rgba(255,255,255,0.03)' }}>
                    <div style={{ fontSize:'0.8rem',color:'var(--text-secondary)' }}>
                      {o.telefono && <div style={{ display:'flex',alignItems:'center',gap:'0.3rem' }}><Phone size={11} /> {o.telefono}</div>}
                      {o.correo   && <div style={{ display:'flex',alignItems:'center',gap:'0.3rem' }}><Mail  size={11} /> {o.correo}</div>}
                    </div>
                  </td>
                  <td style={{ padding:'0.85rem 1rem',borderBottom:'1px solid rgba(255,255,255,0.03)' }}>
                    <div style={{ fontSize:'0.8rem' }}>
                      <div style={{ display:'flex',alignItems:'center',gap:'0.3rem',fontWeight:600 }}><Building2 size={11} /> {o.edificio_nombre}</div>
                      <div style={{ color:'var(--text-muted)' }}>Depto {o.nr_departamento}</div>
                    </div>
                  </td>
                  <td style={{ padding:'0.85rem 1rem',borderBottom:'1px solid rgba(255,255,255,0.03)',fontSize:'0.8rem',color:'var(--text-secondary)' }}>
                    <div style={{ display:'flex',alignItems:'center',gap:'0.3rem' }}><CreditCard size={11} /> {o.banco}</div>
                    <div style={{ color:'var(--text-muted)',fontSize:'0.75rem' }}>{o.tipo_pago}</div>
                  </td>
                  <td style={{ padding:'0.85rem 1rem',borderBottom:'1px solid rgba(255,255,255,0.03)' }}>
                    <div style={{ display:'flex',alignItems:'center',gap:'0.5rem' }}>
                      <span style={{ display:'inline-flex',alignItems:'center',gap:'0.25rem',fontSize:'0.78rem',fontWeight:600,color:o.status==='activo'?'var(--green)':'var(--text-muted)',background:o.status==='activo'?'var(--green-dim)':'var(--bg-elevated)',padding:'0.2rem 0.6rem',borderRadius:20,border:`1px solid ${o.status==='activo'?'rgba(76,175,130,0.3)':'var(--border)'}` }}>
                        {o.status === 'activo' ? '● Activo' : '○ Inactivo'}
                      </span>
                      <button onClick={() => { setEditModal(o); setEditForm({ nombre:o.nombre,telefono:o.telefono,correo:o.correo,banco:o.banco,tipo_pago:o.tipo_pago }) }}
                        style={{ background:'var(--bg-elevated)',border:'1px solid var(--border)',borderRadius:6,width:26,height:26,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'var(--text-secondary)' }}>
                        <Pencil size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal crear propietario */}
      {modal && (
        <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:'1rem' }}>
          <div style={{ background:'var(--bg-surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',padding:'2rem',width:'100%',maxWidth:540,maxHeight:'92vh',overflowY:'auto' }}>
            <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'1.5rem' }}>
              <h2 style={{ fontFamily:'var(--font-display)',fontSize:'1.25rem',fontWeight:700 }}>Nuevo propietario</h2>
              <button onClick={() => setModal(false)} style={{ background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)' }}><X size={18} /></button>
            </div>

            {/* Advertencia si no hay edificios con departamentos */}
            {checkingReq ? (
              <div style={{ display:'flex',justifyContent:'center',padding:'2rem' }}>
                <Loader2 size={22} color="var(--accent)" style={{ animation:'spin 0.8s linear infinite' }} />
              </div>
            ) : !hasEdificioConDeptos ? (
              <div style={{ background:'rgba(245,166,35,0.07)',border:'1px solid rgba(245,166,35,0.3)',borderRadius:'var(--radius-lg)',padding:'1.25rem',textAlign:'center' as const }}>
                <AlertTriangle size={32} color="var(--accent)" style={{ marginBottom:'0.75rem' }} />
                <p style={{ fontWeight:600,marginBottom:'0.5rem' }}>Sin edificios configurados</p>
                <p style={{ fontSize:'0.85rem',color:'var(--text-muted)',lineHeight:1.6 }}>
                  Debes configurar al menos un edificio con departamentos antes de crear propietarios.
                  Ve a <strong>Edificios</strong> y crea un edificio con sus departamentos.
                </p>
                <button onClick={() => setModal(false)} style={{ ...btn2, margin:'1rem auto 0' }}>Entendido</button>
              </div>
            ) : (
              <div style={{ display:'flex',flexDirection:'column',gap:'1rem' }}>
                {/* Datos del propietario */}
                <p style={{ fontSize:'0.72rem',fontWeight:600,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.05em' }}>Datos del propietario</p>

                <Field label="Nombre completo *">
                  <input style={inp} placeholder="Carlos Izaguirre Flores" value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} />
                </Field>
                <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem' }}>
                  <Field label="Teléfono">
                    <input style={inp} placeholder="999 123 456" value={form.telefono} onChange={e => setForm(p => ({ ...p, telefono: e.target.value }))} />
                  </Field>
                  <Field label="Correo">
                    <input style={inp} type="email" placeholder="carlos@email.com" value={form.correo} onChange={e => setForm(p => ({ ...p, correo: e.target.value }))} />
                  </Field>
                  <Field label="Banco">
                    <select style={inp} value={form.banco} onChange={e => setForm(p => ({ ...p, banco: e.target.value }))}>
                      {BANCO_OPTS.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </Field>
                  <Field label="Tipo de pago">
                    <select style={inp} value={form.tipo_pago} onChange={e => setForm(p => ({ ...p, tipo_pago: e.target.value }))}>
                      {PAGO_OPTS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </Field>
                </div>

                {/* Asignación */}
                <div style={{ height:1,background:'var(--border)',margin:'0.25rem 0' }} />
                <p style={{ fontSize:'0.72rem',fontWeight:600,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.05em' }}>Asignación de departamento</p>

                <Field label="Edificio *">
                  <select style={inp} value={form.idEdificio} onChange={e => setForm(p => ({ ...p, idEdificio: e.target.value, idDepartamento: '' }))}>
                    <option value="">— Seleccionar edificio —</option>
                    {buildings.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
                  </select>
                </Field>

                {form.idEdificio && (
                  <Field label="Departamento *">
                    <select style={inp} value={form.idDepartamento} onChange={e => setForm(p => ({ ...p, idDepartamento: e.target.value }))}>
                      <option value="">— Seleccionar departamento —</option>
                      {depts.map(d => <option key={d.id} value={d.id}>Depto {d.nrDepartamento} — Piso {d.piso}</option>)}
                    </select>
                  </Field>
                )}

                {/* Usuario del sistema */}
                <div style={{ height:1,background:'var(--border)',margin:'0.25rem 0' }} />
                <div style={{ display:'flex',alignItems:'center',gap:'0.5rem' }}>
                  <User size={14} color="var(--blue)" />
                  <p style={{ fontSize:'0.72rem',fontWeight:600,color:'var(--blue)',textTransform:'uppercase',letterSpacing:'0.05em' }}>Acceso al sistema</p>
                </div>
                <p style={{ fontSize:'0.8rem',color:'var(--text-muted)',marginTop:'-0.5rem' }}>
                  Se creará automáticamente un usuario para que el propietario pueda ver su historial de pagos.
                </p>

                <Field label="Email de acceso *">
                  <input style={inp} type="email" placeholder="carlos@email.com" value={form.userEmail}
                    onChange={e => setForm(p => ({ ...p, userEmail: e.target.value }))} />
                </Field>
                <Field label="Contraseña inicial *">
                  <input style={inp} type="password" placeholder="Mínimo 8 caracteres" value={form.userPassword}
                    onChange={e => setForm(p => ({ ...p, userPassword: e.target.value }))} />
                </Field>

                <div style={{ display:'flex',gap:'0.75rem',marginTop:'0.5rem',justifyContent:'flex-end' }}>
                  <button style={btn2} onClick={() => setModal(false)}>Cancelar</button>
                  <button style={btn} onClick={handleCreate} disabled={saving}>
                    {saving ? <Loader2 size={15} style={{ animation:'spin 0.8s linear infinite' }} /> : <Save size={15} />}
                    Crear propietario
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal editar */}
      {editModal && (
        <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:'1rem' }}>
          <div style={{ background:'var(--bg-surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',padding:'2rem',width:'100%',maxWidth:440 }}>
            <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'1.5rem' }}>
              <h2 style={{ fontFamily:'var(--font-display)',fontSize:'1.2rem',fontWeight:700 }}>Editar propietario</h2>
              <button onClick={() => setEditModal(null)} style={{ background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)' }}><X size={18} /></button>
            </div>
            <div style={{ display:'flex',flexDirection:'column',gap:'1rem' }}>
              <Field label="Nombre *">
                <input style={inp} value={editForm.nombre || ''} onChange={e => setEditForm(p => ({ ...p, nombre: e.target.value }))} />
              </Field>
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem' }}>
                <Field label="Teléfono">
                  <input style={inp} value={editForm.telefono || ''} onChange={e => setEditForm(p => ({ ...p, telefono: e.target.value }))} />
                </Field>
                <Field label="Correo">
                  <input style={inp} type="email" value={editForm.correo || ''} onChange={e => setEditForm(p => ({ ...p, correo: e.target.value }))} />
                </Field>
                <Field label="Banco">
                  <select style={inp} value={editForm.banco || ''} onChange={e => setEditForm(p => ({ ...p, banco: e.target.value }))}>
                    {BANCO_OPTS.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </Field>
                <Field label="Tipo de pago">
                  <select style={inp} value={editForm.tipo_pago || ''} onChange={e => setEditForm(p => ({ ...p, tipo_pago: e.target.value }))}>
                    {PAGO_OPTS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </Field>
              </div>
            </div>
            <div style={{ display:'flex',gap:'0.75rem',marginTop:'1.5rem',justifyContent:'flex-end' }}>
              <button style={btn2} onClick={() => setEditModal(null)}>Cancelar</button>
              <button style={btn} onClick={handleUpdate} disabled={saving}>
                {saving ? <Loader2 size={15} style={{ animation:'spin 0.8s linear infinite' }} /> : <Save size={15} />}
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
