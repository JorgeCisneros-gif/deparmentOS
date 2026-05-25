// src/pages/OwnersPage.tsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import toast from 'react-hot-toast'
import { Plus, Pencil, Phone, Mail, Building2, CreditCard, Check, Loader2 } from 'lucide-react'
import { useAuthStore } from '../store/auth.store'

interface Owner {
  id: string; nombre: string; telefono: string; correo: string
  banco: string; tipo_pago: string; status: string
  nr_departamento: string; edificio_nombre: string
  edificio_id: string; depto_id?: string; id_departamento?: string
}
interface Building { id: string; nombre: string }

const btn: React.CSSProperties = {
  display:'flex', alignItems:'center', gap:'0.5rem',
  background:'var(--accent)', color:'#0f1117', fontWeight:600,
  fontSize:'0.875rem', padding:'0.6rem 1.1rem',
  borderRadius:'var(--radius)', border:'none',
  cursor:'pointer', fontFamily:'var(--font-body)',
}

export default function OwnersPage() {
  const navigate = useNavigate()
  const { user, isAdministrador } = useAuthStore()
  const isAdmin     = isAdministrador()
  const adminBldId  = isAdmin ? (user?.idEdificio ?? '') : ''

  const [owners,    setOwners]    = useState<Owner[]>([])
  const [buildings, setBuildings] = useState<Building[]>([])
  const [filterBld, setFilterBld] = useState(adminBldId)
  const [loading,   setLoading]   = useState(true)

  // Cargar edificios para el filtro
  useEffect(() => {
    api.get('/buildings').then(r => {
      const all: Building[] = r.data || []
      const filtered = adminBldId ? all.filter(b => b.id === adminBldId) : all
      setBuildings(filtered)
      // Si admin no tiene idEdificio en store, usar el primer edificio
      if (isAdmin && !adminBldId && filtered.length > 0) {
        setFilterBld(filtered[0].id)
      }
    }).catch(() => {})
  }, [])

  // Cargar propietarios cuando cambia el filtro
  useEffect(() => {
    setLoading(true)
    api.get('/propietarios', { params: filterBld ? { buildingId: filterBld } : {} })
      .then(r => setOwners(r.data || []))
      .catch(() => toast.error('Error cargando propietarios'))
      .finally(() => setLoading(false))
  }, [filterBld])

  const activos   = owners.filter(o => o.status === 'activo').length
  const inactivos = owners.filter(o => o.status !== 'activo').length

  return (
    <div style={{ padding:'2rem', maxWidth:1200, margin:'0 auto' }}>

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'1.5rem', flexWrap:'wrap', gap:'1rem' }} className="fade-up">
        <div>
          <h1 style={{ fontFamily:'var(--font-display)', fontSize:'1.8rem', fontWeight:700, letterSpacing:'-0.02em', marginBottom:'0.2rem' }}>
            Propietarios
          </h1>
          <p style={{ color:'var(--text-secondary)', fontSize:'0.875rem' }}>
            {activos} activos · {inactivos} inactivos
          </p>
        </div>
        <button onClick={() => navigate('/owners/new')} style={btn}>
          <Plus size={16} /> Nuevo propietario
        </button>
      </div>

      {/* Filtro — solo para supervisor */}
      {!isAdmin && (
        <div style={{ marginBottom:'1.25rem' }} className="fade-up">
          <label style={{ fontSize:'0.72rem', fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em', display:'block', marginBottom:'0.3rem' }}>
            Filtrar por edificio
          </label>
          <select value={filterBld} onChange={e => setFilterBld(e.target.value)} style={{ minWidth:220 }}>
            <option value="">Todos los edificios</option>
            {buildings.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
          </select>
        </div>
      )}

      {/* Tabla */}
      {loading ? (
        <div style={{ display:'flex', justifyContent:'center', padding:'4rem' }}>
          <Loader2 size={28} color="var(--accent)" style={{ animation:'spin 0.8s linear infinite' }} />
        </div>
      ) : (
        <div style={{ background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', overflow:'hidden' }} className="fade-up">
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.875rem' }}>
            <thead>
              <tr>
                {['Propietario','Contacto','Departamento','Banco / Pago','Estado',''].map(h => (
                  <th key={h} style={{ textAlign:'left', padding:'0.75rem 1rem', color:'var(--text-muted)', fontSize:'0.72rem', fontWeight:600, letterSpacing:'0.05em', textTransform:'uppercase', borderBottom:'1px solid var(--border)', background:'var(--bg-elevated)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {owners.length === 0 ? (
                <tr><td colSpan={6} style={{ padding:'3rem', textAlign:'center', color:'var(--text-muted)' }}>No hay propietarios registrados</td></tr>
              ) : owners.map((o, i) => (
                <tr key={o.id} style={i % 2 !== 0 ? { background:'rgba(255,255,255,0.02)' } : {}}>
                  <td style={{ padding:'0.75rem 1rem', borderBottom:'1px solid rgba(255,255,255,0.03)' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
                      <div style={{ width:34, height:34, borderRadius:'50%', background:'var(--accent-dim)', border:'1px solid rgba(245,166,35,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.85rem', fontWeight:700, color:'var(--accent)', flexShrink:0 }}>
                        {o.nombre?.[0]?.toUpperCase() || '?'}
                      </div>
                      <span style={{ fontWeight:500 }}>{o.nombre || '—'}</span>
                    </div>
                  </td>
                  <td style={{ padding:'0.75rem 1rem', borderBottom:'1px solid rgba(255,255,255,0.03)' }}>
                    <div style={{ display:'flex', flexDirection:'column', gap:'0.2rem' }}>
                      {o.correo   && <span style={{ display:'flex', alignItems:'center', gap:'0.35rem', fontSize:'0.8rem', color:'var(--text-secondary)' }}><Mail size={11} color="var(--text-muted)" />{o.correo}</span>}
                      {o.telefono && <span style={{ display:'flex', alignItems:'center', gap:'0.35rem', fontSize:'0.8rem', color:'var(--text-secondary)' }}><Phone size={11} color="var(--text-muted)" />{o.telefono}</span>}
                      {!o.correo && !o.telefono && <span style={{ color:'var(--text-muted)', fontSize:'0.8rem' }}>—</span>}
                    </div>
                  </td>
                  <td style={{ padding:'0.75rem 1rem', borderBottom:'1px solid rgba(255,255,255,0.03)' }}>
                    {o.nr_departamento ? (
                      <div style={{ display:'flex', flexDirection:'column', gap:'0.15rem' }}>
                        <span style={{ fontWeight:600 }}>Depto {o.nr_departamento}</span>
                        <span style={{ fontSize:'0.75rem', color:'var(--text-muted)', display:'flex', alignItems:'center', gap:'0.3rem' }}><Building2 size={10} />{o.edificio_nombre}</span>
                      </div>
                    ) : <span style={{ color:'var(--text-muted)', fontSize:'0.8rem' }}>Sin asignar</span>}
                  </td>
                  <td style={{ padding:'0.75rem 1rem', borderBottom:'1px solid rgba(255,255,255,0.03)' }}>
                    <div style={{ display:'flex', flexDirection:'column', gap:'0.2rem' }}>
                      {o.banco && <span style={{ textTransform:'uppercase', fontSize:'0.78rem', fontWeight:600 }}>{o.banco}</span>}
                      {o.tipo_pago && <span style={{ background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:4, padding:'0.1rem 0.45rem', fontSize:'0.72rem', display:'inline-flex', alignItems:'center', gap:'0.25rem', width:'fit-content' }}><CreditCard size={10} />{o.tipo_pago}</span>}
                    </div>
                  </td>
                  <td style={{ padding:'0.75rem 1rem', borderBottom:'1px solid rgba(255,255,255,0.03)' }}>
                    <span style={{ background:o.status==='activo'?'var(--green-dim)':'var(--bg-elevated)', border:`1px solid ${o.status==='activo'?'rgba(62,207,142,0.3)':'var(--border)'}`, color:o.status==='activo'?'var(--green)':'var(--text-muted)', borderRadius:4, padding:'0.15rem 0.5rem', fontSize:'0.75rem', display:'inline-flex', alignItems:'center', gap:'0.3rem' }}>
                      {o.status === 'activo' && <Check size={10} />}{o.status || 'activo'}
                    </span>
                  </td>
                  <td style={{ padding:'0.75rem 1rem', borderBottom:'1px solid rgba(255,255,255,0.03)', textAlign:'right' }}>
                    <button
                      onClick={() => navigate(`/owners/${o.id}/edit`)}
                      style={{ background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:6, width:30, height:30, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'var(--text-secondary)' }}
                    >
                      <Pencil size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
