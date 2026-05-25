// AreasPage, OwnersPage, NewReadingPage — versiones completas
import { useEffect, useState } from 'react'
import api from '../services/api'
import toast from 'react-hot-toast'
import { LayoutGrid, Plus, Pencil, X, Loader2, Save } from 'lucide-react'
import BuildingSelector from '../components/common/BuildingSelector'

interface Area { id: string; nombre: string; descripcion: string; costoExtra: number; orden: number; activo: boolean }
interface Building { id: string; nombre: string }

const btn: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--accent)', color: '#0f1117', fontWeight: 600, fontSize: '0.875rem', padding: '0.6rem 1.1rem', borderRadius: 'var(--radius)', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)' }
const btn2: React.CSSProperties = { ...btn, background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }

function Field({ label, children, span = 1 }: any) {
  return (
    <div style={{ gridColumn: `span ${span}` }}>
      <label style={{ fontSize: '0.78rem', fontWeight: 500, color: 'var(--text-secondary)', textTransform: 'uppercase' as const, letterSpacing: '0.04em', display: 'block', marginBottom: '0.4rem' }}>{label}</label>
      {children}
    </div>
  )
}

export default function AreasPage() {
  const [areas, setAreas] = useState<Area[]>([])
  const [selectedBuilding, setSelectedBuilding] = useState('')
  const [loading, setLoading] = useState(false)
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Partial<Area>>({ nombre: '', descripcion: '', costoExtra: 0, orden: 1 })
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (selectedBuilding) loadAreas() }, [selectedBuilding])

  const loadAreas = async () => {
    setLoading(true)
    try { const { data } = await api.get('/cleaning/areas', { params: { buildingId: selectedBuilding } }); setAreas(data) }
    catch { toast.error('Error cargando áreas') }
    finally { setLoading(false) }
  }
  const close = () => { setModal(false); setEditing({ nombre: '', descripcion: '', costoExtra: 0, orden: 1 }) }
  const save = async () => {
    if (!selectedBuilding) return toast.error('Selecciona un edificio')
    setSaving(true)
    try {
      if (editing.id) { await api.patch(`/cleaning/areas/${editing.id}`, {
  nombre: editing.nombre,
  descripcion: editing.descripcion,
  costoExtra: editing.costoExtra,
  orden: editing.orden,
}); toast.success('Área actualizada') }
      else { await api.post('/cleaning/areas', { ...editing, idEdificio: selectedBuilding }); toast.success('Área creada') }
      await loadAreas(); close()
    } catch (e: any) { toast.error(e?.response?.data?.error || 'Error') }
    finally { setSaving(false) }
  }

  return (
    <div style={{ padding: '2rem', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }} className="fade-up">
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '0.2rem' }}>Áreas Comunes</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Ambientes del edificio sujetos a limpieza</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <BuildingSelector value={selectedBuilding} onChange={setSelectedBuilding} label="EDIFICIO" autoSelect />
          <button onClick={() => { setEditing({ nombre: '', descripcion: '', costoExtra: 0, orden: areas.length + 1 }); setModal(true) }} style={btn}><Plus size={16} /> Nueva área</button>
        </div>
      </div>

      {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><Loader2 size={24} color="var(--accent)" style={{ animation: 'spin 0.8s linear infinite' }} /></div>
        : areas.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '4rem', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
            <LayoutGrid size={36} color="var(--text-muted)" /><p style={{ color: 'var(--text-muted)' }}>No hay áreas comunes</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }} className="fade-up">
            {areas.map(a => (
              <div key={a.id} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', opacity: a.activo ? 1 : 0.5 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <span style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 4, padding: '0.15rem 0.5rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>#{a.orden}</span>
                  <button onClick={() => { setEditing({ ...a }); setModal(true) }} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)' }}><Pencil size={13} /></button>
                </div>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--accent-dim)', border: '1px solid rgba(245,166,35,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.75rem' }}><LayoutGrid size={20} color="var(--accent)" /></div>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.3rem' }}>{a.nombre}</h3>
                {a.descripcion && <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>{a.descripcion}</p>}
                <div style={{ display: 'flex', gap: '0.4rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
                  {a.costoExtra > 0
                    ? <span style={{ background: 'var(--accent-dim)', border: '1px solid rgba(245,166,35,0.2)', borderRadius: 4, padding: '0.15rem 0.5rem', fontSize: '0.72rem', color: 'var(--accent)', fontWeight: 600 }}>+ S/. {parseFloat(a.costoExtra as any).toFixed(2)}</span>
                    : <span style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 4, padding: '0.15rem 0.5rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>Sin costo extra</span>}
                </div>
              </div>
            ))}
          </div>
        )}

      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem', backdropFilter: 'blur(4px)' }} onClick={close}>
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-accent)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 500, boxShadow: 'var(--shadow-lg)' }} onClick={e => e.stopPropagation()} className="fade-up">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 700 }}>{editing.id ? 'Editar' : 'Nueva'} área</h2>
              <button onClick={close} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', padding: '1.5rem' }}>
              <Field label="Nombre *" span={2}><input value={editing.nombre || ''} onChange={e => setEditing({ ...editing, nombre: e.target.value })} placeholder="Lobby, Cochera..." /></Field>
              <Field label="Descripción" span={2}><textarea value={editing.descripcion || ''} onChange={e => setEditing({ ...editing, descripcion: e.target.value })} rows={2} style={{ resize: 'vertical' as const }} /></Field>
              <Field label="Costo extra (S/.)"><input type="number" step="0.01" min="0" value={editing.costoExtra || 0} onChange={e => setEditing({ ...editing, costoExtra: parseFloat(e.target.value) })} /></Field>
              <Field label="Orden"><input type="number" min="1" value={editing.orden || 1} onChange={e => setEditing({ ...editing, orden: parseInt(e.target.value) })} /></Field>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', padding: '1rem 1.5rem', borderTop: '1px solid var(--border)' }}>
              <button onClick={close} style={btn2}>Cancelar</button>
              <button onClick={save} disabled={saving} style={btn}>{saving ? <Loader2 size={15} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Save size={15} />}{editing.id ? 'Guardar' : 'Crear'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
