// src/components/common/BuildingSelector.tsx
import { useEffect, useState } from 'react'
import api from '../../services/api'
import { useAuthStore } from '../../store/auth.store'
import { Building2, ChevronDown } from 'lucide-react'

interface Building { id: string; nombre: string; idGrupo?: string }
interface Grupo    { id: string; nombre: string; edificios: Building[] }

interface Props {
  value:     string
  onChange:  (id: string) => void
  label?:    string
  autoSelect?: boolean
}

export default function BuildingSelector({ value, onChange, label, autoSelect }: Props) {
  const { isSupervisor, isAdministrador, user } = useAuthStore()
  const [buildings, setBuildings] = useState<Building[]>([])
  const [grupo, setGrupo]         = useState<Grupo | null>(null)
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    setLoading(true)
    try {
      if (isAdministrador()) {
        // Admin: obtener su grupo con edificios
        const { data } = await api.get('/grupos/mi-grupo')
        if (data) {
          setGrupo(data)
          const edifs: Building[] = data.edificios || []
          setBuildings(edifs)
          if (autoSelect && !value && edifs.length > 0) {
            onChange(edifs[0].id)
          }
        }
      } else {
        // Supervisor y otros: lista completa de edificios
        const { data } = await api.get('/buildings')
        setBuildings(data)
        if (autoSelect && !value && data.length > 0) {
          onChange(data[0].id)
        }
      }
    } catch (e) {
      console.error('Error cargando edificios', e)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={s.skeleton}>Cargando...</div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
      {/* Mostrar nombre del grupo como encabezado para el administrador */}
      {isAdministrador() && grupo && (
        <div style={s.grupoHeader}>
          <Building2 size={12} color="var(--blue)" />
          <span style={{ fontSize: '0.72rem', color: 'var(--blue)', fontWeight: 600 }}>
            {grupo.nombre}
          </span>
        </div>
      )}

      <div style={{ position: 'relative' }}>
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          style={s.select}
        >
          {!autoSelect && <option value="">— Seleccionar edificio —</option>}
          {buildings.map(b => (
            <option key={b.id} value={b.id}>{b.nombre}</option>
          ))}
          {buildings.length === 0 && (
            <option disabled>Sin edificios disponibles</option>
          )}
        </select>
        <ChevronDown size={14} style={s.chevron} />
      </div>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  grupoHeader: {
    display:     'flex',
    alignItems:  'center',
    gap:         '0.35rem',
    padding:     '0.2rem 0.5rem',
    background:  'rgba(74,158,255,0.08)',
    border:      '1px solid rgba(74,158,255,0.2)',
    borderRadius: '4px',
  },
  select: {
    background:  'var(--bg-elevated)',
    border:      '1px solid var(--border)',
    color:       'var(--text-primary)',
    borderRadius: 'var(--radius)',
    padding:     '0.5rem 2rem 0.5rem 0.85rem',
    fontSize:    '0.875rem',
    fontFamily:  'var(--font-body)',
    minWidth:    200,
    appearance:  'none',
    cursor:      'pointer',
    width:       '100%',
  },
  chevron: {
    position:      'absolute',
    right:         '0.6rem',
    top:           '50%',
    transform:     'translateY(-50%)',
    pointerEvents: 'none',
    color:         'var(--text-muted)',
  },
  skeleton: {
    background:  'var(--bg-elevated)',
    border:      '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding:     '0.5rem 0.85rem',
    fontSize:    '0.875rem',
    color:       'var(--text-muted)',
    minWidth:    200,
  },
}
