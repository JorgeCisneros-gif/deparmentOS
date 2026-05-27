// src/pages/AccountsPage.tsx
import { useEffect, useState } from 'react'
import api from '../services/api'
import toast from 'react-hot-toast'
import {
  Plus, Pencil, X, Loader2, Save, Layers, KeyRound,
  CheckCircle2, XCircle, AlertCircle, Building2,
  Users, Calendar, TrendingUp,
} from 'lucide-react'

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface Account {
  id:                string
  nombre:            string
  email:             string
  plan:              Plan
  status:            'active' | 'expired' | 'suspended'
  subscriptionStart: string
  subscriptionEnd:   string | null
  maxEdificios:      number
  maxDeptos:         number
  maxPeriodos:       number
  createdAt:         string
}

interface Stats {
  total: number; active: number; expired: number; suspended: number
  byPlan: Record<Plan, number>
}

type Plan = 'full' | 'demo' | 'standard' | 'premium' | 'enterprise'

// ── Configuración visual de planes ───────────────────────────────────────────
const PLAN_CFG: Record<Plan, { label: string; color: string; bg: string }> = {
  full:       { label: 'Full',       color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  demo:       { label: 'Demo',       color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' },
  standard:   { label: 'Standard',   color: '#4a9eff', bg: 'rgba(74,158,255,0.1)' },
  premium:    { label: 'Premium',    color: '#a78bfa', bg: 'rgba(167,139,250,0.1)' },
  enterprise: { label: 'Enterprise', color: '#4caf82', bg: 'rgba(76,175,130,0.1)' },
}

const STATUS_CFG = {
  active:    { label: 'Activa',     color: 'var(--green)', Icon: CheckCircle2 },
  expired:   { label: 'Vencida',    color: '#f87171',      Icon: XCircle },
  suspended: { label: 'Suspendida', color: 'var(--accent)', Icon: AlertCircle },
}

const EMPTY_FORM = {
  nombre: '', email: '', plan: 'demo' as Plan,
  subscriptionEnd: '', adminPassword: '',
}

// ── Componentes auxiliares ────────────────────────────────────────────────────
const btn: React.CSSProperties  = { display:'flex',alignItems:'center',gap:'0.5rem',background:'var(--accent)',color:'#0f1117',fontWeight:600,fontSize:'0.875rem',padding:'0.55rem 1rem',borderRadius:'var(--radius)',border:'none',cursor:'pointer',fontFamily:'var(--font-body)' }
const btn2: React.CSSProperties = { ...btn, background:'var(--bg-elevated)',color:'var(--text-secondary)',border:'1px solid var(--border)' }
const inp: React.CSSProperties  = { width:'100%',background:'var(--bg-elevated)',border:'1px solid var(--border)',color:'var(--text-primary)',borderRadius:'var(--radius)',padding:'0.5rem 0.75rem',fontSize:'0.875rem',fontFamily:'var(--font-body)',outline:'none' }

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ fontSize:'0.75rem',fontWeight:600,color:'var(--text-secondary)',textTransform:'uppercase' as const,letterSpacing:'0.04em',display:'block',marginBottom:'0.35rem' }}>{label}</label>
      {children}
    </div>
  )
}

function PlanBadge({ plan }: { plan: Plan }) {
  const cfg = PLAN_CFG[plan]
  return (
    <span style={{ fontSize:'0.72rem',fontWeight:700,padding:'0.2rem 0.6rem',borderRadius:20,background:cfg.bg,color:cfg.color,border:`1px solid ${cfg.color}40`,textTransform:'uppercase',letterSpacing:'0.05em' }}>
      {cfg.label}
    </span>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [stats, setStats]       = useState<Stats | null>(null)
  const [loading, setLoading]   = useState(true)
  const [modal, setModal]       = useState(false)
  const [editModal, setEditModal] = useState<Account | null>(null)
  const [resetModal, setResetModal] = useState<Account | null>(null)
  const [form, setForm]         = useState(EMPTY_FORM)
  const [editForm, setEditForm] = useState<Partial<Account & { subscriptionEnd: string }>>({})
  const [resetPwd, setResetPwd] = useState('')
  const [saving, setSaving]     = useState(false)
  const [filter, setFilter]     = useState<Plan | ''>('')

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    try {
      const [accRes, statsRes] = await Promise.all([
        api.get('/accounts'),
        api.get('/accounts/stats'),
      ])
      setAccounts(accRes.data)
      setStats(statsRes.data)
    } catch { toast.error('Error cargando cuentas') }
    finally  { setLoading(false) }
  }

  const handleCreate = async () => {
    if (!form.nombre || !form.email || !form.adminPassword) {
      toast.error('Completa todos los campos requeridos'); return
    }
    setSaving(true)
    try {
      await api.post('/accounts', form)
      toast.success('Cuenta creada correctamente')
      setModal(false); setForm(EMPTY_FORM); load()
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Error al crear cuenta')
    } finally { setSaving(false) }
  }

  const handleUpdate = async () => {
    if (!editModal) return
    setSaving(true)
    try {
      await api.patch(`/accounts/${editModal.id}`, editForm)
      toast.success('Cuenta actualizada')
      setEditModal(null); load()
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Error al actualizar')
    } finally { setSaving(false) }
  }

  const handleSuspend = async (acc: Account) => {
    if (!confirm(`¿Suspender la cuenta "${acc.nombre}"?`)) return
    try {
      await api.patch(`/accounts/${acc.id}/suspend`)
      toast.success('Cuenta suspendida'); load()
    } catch { toast.error('Error al suspender') }
  }

  const handleActivate = async (acc: Account) => {
    try {
      await api.patch(`/accounts/${acc.id}/activate`)
      toast.success('Cuenta reactivada'); load()
    } catch { toast.error('Error al reactivar') }
  }

  const handleResetPassword = async () => {
    if (!resetModal || !resetPwd || resetPwd.length < 8) {
      toast.error('La contraseña debe tener al menos 8 caracteres'); return
    }
    setSaving(true)
    try {
      await api.patch(`/accounts/${resetModal.id}/reset-password`, { newPassword: resetPwd })
      toast.success('Contraseña reseteada correctamente')
      setResetModal(null); setResetPwd('')
    } catch { toast.error('Error al resetear contraseña') }
    finally { setSaving(false) }
  }

  const filtered = filter ? accounts.filter(a => a.plan === filter) : accounts

  return (
    <div style={{ padding:'2rem', maxWidth:1200, margin:'0 auto' }}>

      {/* Header */}
      <div style={{ display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:'1.5rem',flexWrap:'wrap',gap:'1rem' }} className="fade-up">
        <div>
          <h1 style={{ fontFamily:'var(--font-display)',fontSize:'1.8rem',fontWeight:700,letterSpacing:'-0.02em',marginBottom:'0.25rem' }}>
            Suscripciones
          </h1>
          <p style={{ color:'var(--text-secondary)',fontSize:'0.875rem' }}>
            Gestiona las cuentas y planes de suscripción
          </p>
        </div>
        <button style={btn} onClick={() => setModal(true)}>
          <Plus size={16} /> Nueva cuenta
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:'0.75rem',marginBottom:'1.5rem' }} className="fade-up">
          {[
            { label:'Total',      value: stats.total,     color:'var(--text-primary)' },
            { label:'Activas',    value: stats.active,    color:'var(--green)' },
            { label:'Vencidas',   value: stats.expired,   color:'#f87171' },
            { label:'Suspendidas',value: stats.suspended, color:'var(--accent)' },
          ].map(s => (
            <div key={s.label} style={{ background:'var(--bg-surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',padding:'0.9rem 1rem' }}>
              <p style={{ fontSize:'0.68rem',color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:'0.3rem' }}>{s.label}</p>
              <p style={{ fontWeight:800,fontSize:'1.4rem',color:s.color }}>{s.value}</p>
            </div>
          ))}
          {Object.entries(PLAN_CFG).map(([plan, cfg]) => (
            <div key={plan} style={{ background:'var(--bg-surface)',border:`1px solid ${cfg.color}30`,borderRadius:'var(--radius-lg)',padding:'0.9rem 1rem',borderTop:`2px solid ${cfg.color}` }}>
              <p style={{ fontSize:'0.68rem',color:cfg.color,textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:'0.3rem',fontWeight:600 }}>{cfg.label}</p>
              <p style={{ fontWeight:800,fontSize:'1.4rem',color:cfg.color }}>{stats.byPlan[plan as Plan] || 0}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filtro por plan */}
      <div style={{ display:'flex',gap:'0.5rem',marginBottom:'1rem',flexWrap:'wrap' }} className="fade-up">
        <button onClick={() => setFilter('')} style={{ ...btn2, ...(filter==='' ? {background:'var(--accent-dim)',color:'var(--accent)',borderColor:'var(--accent)'} : {}) }}>
          Todos
        </button>
        {Object.entries(PLAN_CFG).map(([plan, cfg]) => (
          <button key={plan} onClick={() => setFilter(plan as Plan)}
            style={{ ...btn2, ...(filter===plan ? {background:cfg.bg,color:cfg.color,borderColor:`${cfg.color}40`} : {}) }}>
            {cfg.label}
          </button>
        ))}
      </div>

      {/* Tabla */}
      {loading ? (
        <div style={{ display:'flex',justifyContent:'center',padding:'4rem' }}>
          <Loader2 size={28} color="var(--accent)" style={{ animation:'spin 0.8s linear infinite' }} />
        </div>
      ) : (
        <div style={{ background:'var(--bg-surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',overflow:'auto' }} className="fade-up">
          <table style={{ width:'100%',borderCollapse:'collapse',fontSize:'0.875rem' }}>
            <thead>
              <tr>
                {['Cuenta','Plan','Estado','Edificios','Deptos','Períodos','Vencimiento','Acciones'].map(h => (
                  <th key={h} style={{ textAlign:'left',padding:'0.75rem 1rem',color:'var(--text-muted)',fontSize:'0.72rem',fontWeight:600,letterSpacing:'0.05em',textTransform:'uppercase' as const,borderBottom:'1px solid var(--border)',background:'var(--bg-elevated)',whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((acc, i) => {
                const stCfg     = STATUS_CFG[acc.status]
                const StatusIcon = stCfg.Icon
                return (
                  <tr key={acc.id} style={i%2!==0 ? {background:'rgba(255,255,255,0.02)'} : {}}>
                    <td style={{ padding:'0.75rem 1rem',borderBottom:'1px solid rgba(255,255,255,0.03)' }}>
                      <div style={{ fontWeight:600 }}>{acc.nombre}</div>
                      <div style={{ fontSize:'0.75rem',color:'var(--text-muted)' }}>{acc.email}</div>
                    </td>
                    <td style={{ padding:'0.75rem 1rem',borderBottom:'1px solid rgba(255,255,255,0.03)' }}>
                      <PlanBadge plan={acc.plan} />
                    </td>
                    <td style={{ padding:'0.75rem 1rem',borderBottom:'1px solid rgba(255,255,255,0.03)' }}>
                      <span style={{ display:'flex',alignItems:'center',gap:'0.3rem',fontSize:'0.78rem',color:stCfg.color,fontWeight:600 }}>
                        <StatusIcon size={13} /> {stCfg.label}
                      </span>
                    </td>
                    <td style={{ padding:'0.75rem 1rem',borderBottom:'1px solid rgba(255,255,255,0.03)',textAlign:'center' as const }}>
                      <span style={{ fontWeight:700 }}>{acc.maxEdificios === 9999 ? '∞' : acc.maxEdificios}</span>
                    </td>
                    <td style={{ padding:'0.75rem 1rem',borderBottom:'1px solid rgba(255,255,255,0.03)',textAlign:'center' as const }}>
                      <span style={{ fontWeight:700 }}>{acc.maxDeptos === 9999 ? '∞' : acc.maxDeptos}</span>
                    </td>
                    <td style={{ padding:'0.75rem 1rem',borderBottom:'1px solid rgba(255,255,255,0.03)',textAlign:'center' as const }}>
                      <span style={{ fontWeight:700 }}>{acc.maxPeriodos === 9999 ? '∞' : acc.maxPeriodos}</span>
                    </td>
                    <td style={{ padding:'0.75rem 1rem',borderBottom:'1px solid rgba(255,255,255,0.03)',color:'var(--text-muted)',fontSize:'0.82rem' }}>
                      {acc.subscriptionEnd ? new Date(acc.subscriptionEnd).toLocaleDateString('es-PE') : '—'}
                    </td>
                    <td style={{ padding:'0.75rem 1rem',borderBottom:'1px solid rgba(255,255,255,0.03)' }}>
                      <div style={{ display:'flex',gap:'0.4rem' }}>
                        <button title="Editar" onClick={() => { setEditModal(acc); setEditForm({ plan: acc.plan, subscriptionEnd: acc.subscriptionEnd || '' }) }} style={{ ...btn2, padding:'0.3rem 0.5rem' }}><Pencil size={13} /></button>
                        <button title="Reset contraseña" onClick={() => { setResetModal(acc); setResetPwd('') }} style={{ ...btn2, padding:'0.3rem 0.5rem' }}><KeyRound size={13} /></button>
                        {acc.status === 'active'
                          ? <button title="Suspender" onClick={() => handleSuspend(acc)} style={{ ...btn2, padding:'0.3rem 0.5rem',color:'#f87171',borderColor:'rgba(248,113,113,0.3)' }}><XCircle size={13} /></button>
                          : <button title="Reactivar" onClick={() => handleActivate(acc)} style={{ ...btn2, padding:'0.3rem 0.5rem',color:'var(--green)',borderColor:'rgba(76,175,130,0.3)' }}><CheckCircle2 size={13} /></button>
                        }
                      </div>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={8} style={{ textAlign:'center',padding:'3rem',color:'var(--text-muted)' }}>No hay cuentas registradas</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Modal crear cuenta ── */}
      {modal && (
        <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:'1rem' }}>
          <div style={{ background:'var(--bg-surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',padding:'2rem',width:'100%',maxWidth:480 }}>
            <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'1.5rem' }}>
              <h2 style={{ fontFamily:'var(--font-display)',fontSize:'1.3rem',fontWeight:700 }}>Nueva cuenta</h2>
              <button onClick={() => setModal(false)} style={{ background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)' }}><X size={18} /></button>
            </div>
            <div style={{ display:'flex',flexDirection:'column',gap:'1rem' }}>
              <Field label="Nombre de la cuenta *">
                <input style={inp} placeholder="Ej. Edificio Los Pinos" value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} />
              </Field>
              <Field label="Email del administrador *">
                <input style={inp} type="email" placeholder="admin@edificio.com" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
              </Field>
              <Field label="Contraseña del administrador *">
                <input style={inp} type="password" placeholder="Mínimo 8 caracteres" value={form.adminPassword} onChange={e => setForm(p => ({ ...p, adminPassword: e.target.value }))} />
              </Field>
              <Field label="Plan *">
                <select style={inp} value={form.plan} onChange={e => setForm(p => ({ ...p, plan: e.target.value as Plan }))}>
                  {Object.entries(PLAN_CFG).filter(([p]) => p !== 'full').map(([p, cfg]) => (
                    <option key={p} value={p}>{cfg.label}</option>
                  ))}
                </select>
              </Field>
              {['standard','premium','enterprise'].includes(form.plan) && (
                <Field label="Fecha de vencimiento">
                  <input style={inp} type="date" value={form.subscriptionEnd} onChange={e => setForm(p => ({ ...p, subscriptionEnd: e.target.value }))} />
                </Field>
              )}
            </div>
            <div style={{ display:'flex',gap:'0.75rem',marginTop:'1.5rem',justifyContent:'flex-end' }}>
              <button style={btn2} onClick={() => setModal(false)}>Cancelar</button>
              <button style={btn} onClick={handleCreate} disabled={saving}>
                {saving ? <Loader2 size={15} style={{ animation:'spin 0.8s linear infinite' }} /> : <Save size={15} />}
                Crear cuenta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal editar cuenta ── */}
      {editModal && (
        <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:'1rem' }}>
          <div style={{ background:'var(--bg-surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',padding:'2rem',width:'100%',maxWidth:420 }}>
            <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'1.5rem' }}>
              <h2 style={{ fontFamily:'var(--font-display)',fontSize:'1.3rem',fontWeight:700 }}>Editar cuenta</h2>
              <button onClick={() => setEditModal(null)} style={{ background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)' }}><X size={18} /></button>
            </div>
            <div style={{ display:'flex',flexDirection:'column',gap:'1rem' }}>
              <Field label="Plan">
                <select style={inp} value={editForm.plan || ''} onChange={e => setEditForm(p => ({ ...p, plan: e.target.value as Plan }))}>
                  {Object.entries(PLAN_CFG).filter(([p]) => p !== 'full').map(([p, cfg]) => (
                    <option key={p} value={p}>{cfg.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Fecha de vencimiento">
                <input style={inp} type="date" value={editForm.subscriptionEnd || ''} onChange={e => setEditForm(p => ({ ...p, subscriptionEnd: e.target.value }))} />
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

      {/* ── Modal reset contraseña ── */}
      {resetModal && (
        <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:'1rem' }}>
          <div style={{ background:'var(--bg-surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',padding:'2rem',width:'100%',maxWidth:400 }}>
            <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'1.5rem' }}>
              <h2 style={{ fontFamily:'var(--font-display)',fontSize:'1.3rem',fontWeight:700 }}>Resetear contraseña</h2>
              <button onClick={() => setResetModal(null)} style={{ background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)' }}><X size={18} /></button>
            </div>
            <p style={{ color:'var(--text-muted)',fontSize:'0.875rem',marginBottom:'1rem' }}>
              Cuenta: <strong style={{ color:'var(--text-primary)' }}>{resetModal.nombre}</strong>
            </p>
            <Field label="Nueva contraseña *">
              <input style={inp} type="password" placeholder="Mínimo 8 caracteres" value={resetPwd} onChange={e => setResetPwd(e.target.value)} />
            </Field>
            <div style={{ display:'flex',gap:'0.75rem',marginTop:'1.5rem',justifyContent:'flex-end' }}>
              <button style={btn2} onClick={() => setResetModal(null)}>Cancelar</button>
              <button style={btn} onClick={handleResetPassword} disabled={saving}>
                {saving ? <Loader2 size={15} style={{ animation:'spin 0.8s linear infinite' }} /> : <KeyRound size={15} />}
                Resetear
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
