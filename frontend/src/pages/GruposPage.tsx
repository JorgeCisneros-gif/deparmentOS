// src/pages/GruposPage.tsx
import { useEffect, useState } from 'react'
import api from '../services/api'
import toast from 'react-hot-toast'
import {
  Plus, Pencil, X, Loader2, Save, Building2,
  Layers, Users, ChevronDown, ChevronRight,
} from 'lucide-react'

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface Building  { id: string; nombre: string; nroDepas: number }
interface Grupo {
  id:        string
  nombre:    string
  ruc?:      string
  direccion?: string
  status:    string
  idAccount: string | null
  edificios: Building[]
  createdAt: string
}

const EMPTY_FORM = { nombre: '', ruc: '', direccion: '' }

const btn:  React.CSSProperties = { display:'flex',alignItems:'center',gap:'0.5rem',background:'var(--accent)',color:'#0f1117',fontWeight:600,fontSize:'0.875rem',padding:'0.55rem 1rem',borderRadius:'var(--radius)',border:'none',cursor:'pointer',fontFamily:'var(--font-body)' }
const btn2: React.CSSProperties = { ...btn, background:'var(--bg-elevated)',color:'var(--text-secondary)',border:'1px solid var(--border)' }
const inp:  React.CSSProperties = { width:'100%',background:'var(--bg-elevated)',border:'1px solid var(--border)',color:'var(--text-primary)',borderRadius:'var(--radius)',padding:'0.5rem 0.75rem',fontSize:'0.875rem',fontFamily:'var(--font-body)',outline:'none' }

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ fontSize:'0.75rem',fontWeight:600,color:'var(--text-secondary)',textTransform:'uppercase' as const,letterSpacing:'0.04em',display:'block',marginBottom:'0.35rem' }}>{label}</label>
      {children}
    </div>
  )
}

// ── Página ────────────────────────────────────────────────────────────────────
export default function GruposPage() {
  const [grupos, setGrupos]       = useState<Grupo[]>([])
  const [loading, setLoading]     = useState(true)
  const [modal, setModal]         = useState(false)
  const [editModal, setEditModal] = useState<Grupo | null>(null)
  const [form, setForm]           = useState(EMPTY_FORM)
  const [editForm, setEditForm]   = useState(EMPTY_FORM)
  const [saving, setSaving]       = useState(false)
  const [expanded, setExpanded]   = useState<Record<string, boolean>>({})

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/grupos')
      setGrupos(data)
    } catch { toast.error('Error cargando grupos') }
    finally  { setLoading(false) }
  }

  const handleCreate = async () => {
    if (!form.nombre) { toast.error('El nombre es requerido'); return }
    setSaving(true)
    try {
      // Supervisor crea el grupo sin cuenta aún — se asigna al crear la cuenta
      await api.post('/grupos', form)
      toast.success('Grupo creado correctamente')
      setModal(false); setForm(EMPTY_FORM); load()
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Error al crear grupo')
    } finally { setSaving(false) }
  }

  const handleUpdate = async () => {
    if (!editModal) return
    setSaving(true)
    try {
      await api.patch(`/grupos/${editModal.id}`, editForm)
      toast.success('Grupo actualizado')
      setEditModal(null); load()
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Error al actualizar')
    } finally { setSaving(false) }
  }

  const toggleExpand = (id: string) =>
    setExpanded(p => ({ ...p, [id]: !p[id] }))

  // Separar SuperGrupo del resto
  const superGrupo = grupos.find(g => g.nombre === 'SuperGrupo')
  const otrosGrupos = grupos.filter(g => g.nombre !== 'SuperGrupo')

  const totalEdificios = grupos.reduce((s, g) => s + (g.edificios?.length || 0), 0)
  const sinCuenta      = otrosGrupos.filter(g => !g.idAccount).length

  return (
    <div style={{ padding:'2rem', maxWidth:1100, margin:'0 auto' }}>

      {/* Header */}
      <div style={{ display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:'1.5rem',flexWrap:'wrap',gap:'1rem' }} className="fade-up">
        <div>
          <h1 style={{ fontFamily:'var(--font-display)',fontSize:'1.8rem',fontWeight:700,letterSpacing:'-0.02em',marginBottom:'0.25rem' }}>Grupos</h1>
          <p style={{ color:'var(--text-secondary)',fontSize:'0.875rem' }}>
            Gestiona los grupos de edificios. Crea el grupo antes de asignarlo a una suscripción.
          </p>
        </div>
        <button style={btn} onClick={() => setModal(true)}>
          <Plus size={16} /> Nuevo grupo
        </button>
      </div>

      {/* Stats rápidas */}
      <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:'0.75rem',marginBottom:'1.5rem' }} className="fade-up">
        {[
          { label:'Total grupos',    value: otrosGrupos.length, color:'var(--text-primary)' },
          { label:'Total edificios', value: totalEdificios,     color:'var(--blue)' },
          { label:'Sin suscripción', value: sinCuenta,          color:'var(--accent)' },
        ].map(s => (
          <div key={s.label} style={{ background:'var(--bg-surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',padding:'0.9rem 1rem' }}>
            <p style={{ fontSize:'0.68rem',color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:'0.3rem' }}>{s.label}</p>
            <p style={{ fontWeight:800,fontSize:'1.4rem',color:s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ display:'flex',justifyContent:'center',padding:'4rem' }}>
          <Loader2 size={28} color="var(--accent)" style={{ animation:'spin 0.8s linear infinite' }} />
        </div>
      ) : (
        <div style={{ display:'flex',flexDirection:'column',gap:'0.75rem' }} className="fade-up">

          {/* SuperGrupo */}
          {superGrupo && (
            <GrupoCard
              grupo={superGrupo}
              expanded={!!expanded[superGrupo.id]}
              onToggle={() => toggleExpand(superGrupo.id)}
              onEdit={null}  // no se edita el SuperGrupo
              isSuperGrupo
            />
          )}

          {/* Otros grupos */}
          {otrosGrupos.length === 0 ? (
            <div style={{ textAlign:'center',padding:'4rem',background:'var(--bg-surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',color:'var(--text-muted)' }}>
              <Layers size={40} style={{ marginBottom:'0.75rem',opacity:0.4 }} />
              <p>No hay grupos creados aún</p>
              <p style={{ fontSize:'0.8rem',marginTop:'0.5rem' }}>Crea un grupo antes de asignarlo a una suscripción</p>
            </div>
          ) : (
            otrosGrupos.map(g => (
              <GrupoCard
                key={g.id}
                grupo={g}
                expanded={!!expanded[g.id]}
                onToggle={() => toggleExpand(g.id)}
                onEdit={() => {
                  setEditModal(g)
                  setEditForm({ nombre: g.nombre, ruc: g.ruc || '', direccion: g.direccion || '' })
                }}
              />
            ))
          )}
        </div>
      )}

      {/* Modal crear */}
      {modal && (
        <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:'1rem' }}>
          <div style={{ background:'var(--bg-surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',padding:'2rem',width:'100%',maxWidth:460 }}>
            <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'1.5rem' }}>
              <h2 style={{ fontFamily:'var(--font-display)',fontSize:'1.3rem',fontWeight:700 }}>Nuevo grupo</h2>
              <button onClick={() => setModal(false)} style={{ background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)' }}><X size={18} /></button>
            </div>
            <div style={{ display:'flex',flexDirection:'column',gap:'1rem' }}>
              <Field label="Nombre del grupo *">
                <input style={inp} placeholder="Ej. Inmobiliaria Los Pinos S.A." value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} />
              </Field>
              <Field label="RUC / NIT (opcional)">
                <input style={inp} placeholder="20123456789" value={form.ruc} onChange={e => setForm(p => ({ ...p, ruc: e.target.value }))} />
              </Field>
              <Field label="Dirección (opcional)">
                <input style={inp} placeholder="Av. Principal 123" value={form.direccion} onChange={e => setForm(p => ({ ...p, direccion: e.target.value }))} />
              </Field>
            </div>
            <div style={{ display:'flex',gap:'0.75rem',marginTop:'1.5rem',justifyContent:'flex-end' }}>
              <button style={btn2} onClick={() => setModal(false)}>Cancelar</button>
              <button style={btn} onClick={handleCreate} disabled={saving}>
                {saving ? <Loader2 size={15} style={{ animation:'spin 0.8s linear infinite' }} /> : <Save size={15} />}
                Crear grupo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal editar */}
      {editModal && (
        <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:'1rem' }}>
          <div style={{ background:'var(--bg-surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',padding:'2rem',width:'100%',maxWidth:460 }}>
            <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'1.5rem' }}>
              <h2 style={{ fontFamily:'var(--font-display)',fontSize:'1.3rem',fontWeight:700 }}>Editar grupo</h2>
              <button onClick={() => setEditModal(null)} style={{ background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)' }}><X size={18} /></button>
            </div>
            <div style={{ display:'flex',flexDirection:'column',gap:'1rem' }}>
              <Field label="Nombre del grupo *">
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

// ── Tarjeta de grupo ──────────────────────────────────────────────────────────
function GrupoCard({
  grupo, expanded, onToggle, onEdit, isSuperGrupo = false,
}: {
  grupo: Grupo
  expanded: boolean
  onToggle: () => void
  onEdit: (() => void) | null
  isSuperGrupo?: boolean
}) {
  const hasAccount  = !!grupo.idAccount
  const edificios   = grupo.edificios || []
  const totalDeptos = edificios.reduce((s, e) => s + (e.nroDepas || 0), 0)

  return (
    <div style={{
      background:   'var(--bg-surface)',
      border:       `1px solid ${isSuperGrupo ? 'rgba(245,166,35,0.3)' : 'var(--border)'}`,
      borderRadius: 'var(--radius-lg)',
      overflow:     'hidden',
    }}>
      {/* Header de la card */}
      <div style={{ display:'flex',alignItems:'center',gap:'1rem',padding:'1rem 1.25rem' }}>
        <button onClick={onToggle} style={{ background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)',display:'flex',padding:0 }}>
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>

        <div style={{ width:38,height:38,borderRadius:10,background:isSuperGrupo ? 'rgba(245,166,35,0.12)' : 'var(--bg-elevated)',border:`1px solid ${isSuperGrupo ? 'rgba(245,166,35,0.3)' : 'var(--border)'}`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
          <Layers size={16} color={isSuperGrupo ? '#f59e0b' : 'var(--blue)'} />
        </div>

        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex',alignItems:'center',gap:'0.5rem',flexWrap:'wrap' }}>
            <span style={{ fontWeight:700,fontSize:'0.95rem' }}>{grupo.nombre}</span>
            {isSuperGrupo && (
              <span style={{ fontSize:'0.68rem',fontWeight:700,padding:'0.15rem 0.5rem',borderRadius:20,background:'rgba(245,166,35,0.12)',color:'#f59e0b',border:'1px solid rgba(245,166,35,0.3)',textTransform:'uppercase',letterSpacing:'0.05em' }}>
                Global
              </span>
            )}
            {!isSuperGrupo && (
              <span style={{ fontSize:'0.68rem',fontWeight:600,padding:'0.15rem 0.5rem',borderRadius:20,background:hasAccount ? 'var(--green-dim)' : 'var(--accent-dim)',color:hasAccount ? 'var(--green)' : 'var(--accent)',border:`1px solid ${hasAccount ? 'rgba(76,175,130,0.2)' : 'rgba(245,166,35,0.2)'}` }}>
                {hasAccount ? 'Con suscripción' : 'Sin asignar'}
              </span>
            )}
          </div>
          <div style={{ display:'flex',gap:'1rem',marginTop:'0.2rem',flexWrap:'wrap' }}>
            {grupo.ruc && <span style={{ fontSize:'0.75rem',color:'var(--text-muted)' }}>RUC: {grupo.ruc}</span>}
            {grupo.direccion && <span style={{ fontSize:'0.75rem',color:'var(--text-muted)' }}>{grupo.direccion}</span>}
          </div>
        </div>

        {/* Stats inline */}
        <div style={{ display:'flex',gap:'1.25rem',flexShrink:0 }}>
          <div style={{ textAlign:'center' as const }}>
            <p style={{ fontSize:'1.1rem',fontWeight:800,color:'var(--blue)' }}>{edificios.length}</p>
            <p style={{ fontSize:'0.65rem',color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.05em' }}>Edificios</p>
          </div>
          <div style={{ textAlign:'center' as const }}>
            <p style={{ fontSize:'1.1rem',fontWeight:800,color:'var(--green)' }}>{totalDeptos}</p>
            <p style={{ fontSize:'0.65rem',color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.05em' }}>Deptos</p>
          </div>
        </div>

        {/* Acciones */}
        {onEdit && (
          <button
            onClick={onEdit}
            style={{ background:'var(--bg-elevated)',border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:'0.35rem 0.6rem',cursor:'pointer',color:'var(--text-secondary)',display:'flex',alignItems:'center',gap:'0.3rem',fontSize:'0.78rem',fontFamily:'var(--font-body)' }}
          >
            <Pencil size={13} /> Editar
          </button>
        )}
      </div>

      {/* Lista de edificios (expandible) */}
      {expanded && (
        <div style={{ borderTop:'1px solid var(--border)',background:'var(--bg-elevated)' }}>
          {edificios.length === 0 ? (
            <div style={{ padding:'1rem 1.5rem',color:'var(--text-muted)',fontSize:'0.85rem',textAlign:'center' as const }}>
              Sin edificios asignados a este grupo
            </div>
          ) : (
            edificios.map((e, i) => (
              <div key={e.id} style={{ display:'flex',alignItems:'center',gap:'0.75rem',padding:'0.65rem 1.5rem',borderBottom:i < edificios.length-1 ? '1px solid rgba(255,255,255,0.03)' : 'none' }}>
                <Building2 size={14} color="var(--text-muted)" />
                <span style={{ flex:1,fontSize:'0.875rem',fontWeight:500 }}>{e.nombre}</span>
                <span style={{ fontSize:'0.75rem',color:'var(--text-muted)' }}>
                  {e.nroDepas} depto{e.nroDepas !== 1 ? 's' : ''}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
