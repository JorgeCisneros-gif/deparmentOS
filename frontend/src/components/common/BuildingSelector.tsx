// src/components/common/BuildingSelector.tsx
import { useEffect, useState } from 'react'
import api from '../../services/api'
import { useAuthStore } from '../../store/auth.store'
import { Building2, ChevronDown, Layers, Loader2 } from 'lucide-react'

interface Building { id: string; nombre: string }
interface Grupo    { id: string; nombre: string; edificios: Building[] }

interface Props {
  value:       string
  onChange:    (id: string) => void
  label?:      string
  autoSelect?: boolean
  placeholder?: string
}

export default function BuildingSelector({ value, onChange, autoSelect, placeholder }: Props) {
  const { isSupervisor, isAdministrador, isGestion } = useAuthStore()

  const [buildings, setBuildings] = useState<Building[]>([])
  const [grupo, setGrupo]         = useState<Grupo | null>(null)
  const [loading, setLoading]     = useState(true)

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    try {
      if (isAdministrador() || isGestion()) {
        // Admin y gestión: obtener su grupo con edificios
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
        // Supervisor: lista completa
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
      <div style={s.skeleton}>
        <Loader2 size={12} style={{ animation:'spin 0.8s linear infinite' }} />
        <span>Cargando...</span>
      </div>
    )
  }

  if (buildings.length === 0) {
    return (
      <div style={s.empty}>
        <Building2 size={14} color="var(--text-muted)" />
        <span style={{ fontSize:'0.82rem',color:'var(--text-muted)' }}>Sin edificios disponibles</span>
      </div>
    )
  }

  return (
    <div style={{ display:'flex',flexDirection:'column',gap:'0.25rem' }}>
      {/* Badge del grupo para admin/gestión */}
      {(isAdministrador() || isGestion()) && grupo && (
        <div style={s.grupoHeader}>
          <Layers size={11} color="var(--blue)" />
          <span style={{ fontSize:'0.7rem',color:'var(--blue)',fontWeight:700,letterSpacing:'0.02em' }}>
            {grupo.nombre}
          </span>
        </div>
      )}

      <div style={{ position:'relative' }}>
        <select value={value} onChange={e => onChange(e.target.value)} style={s.select}>
          {!autoSelect && (
            <option value="">{placeholder || '— Seleccionar edificio —'}</option>
          )}
          {buildings.map(b => (
            <option key={b.id} value={b.id}>{b.nombre}</option>
          ))}
        </select>
        <ChevronDown size={13} style={s.chevron} />
      </div>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  grupoHeader: {
    display:      'flex',
    alignItems:   'center',
    gap:          '0.35rem',
    padding:      '0.2rem 0.6rem',
    background:   'rgba(74,158,255,0.07)',
    border:       '1px solid rgba(74,158,255,0.2)',
    borderRadius: '4px',
    width:        'fit-content',
  },
  select: {
    background:   'var(--bg-elevated)',
    border:       '1px solid var(--border)',
    color:        'var(--text-primary)',
    borderRadius: 'var(--radius)',
    padding:      '0.5rem 2rem 0.5rem 0.85rem',
    fontSize:     '0.875rem',
    fontFamily:   'var(--font-body)',
    minWidth:     200,
    appearance:   'none',
    cursor:       'pointer',
    width:        '100%',
    outline:      'none',
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
    display:      'flex',
    alignItems:   'center',
    gap:          '0.4rem',
    background:   'var(--bg-elevated)',
    border:       '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding:      '0.5rem 0.85rem',
    fontSize:     '0.875rem',
    color:        'var(--text-muted)',
    minWidth:     200,
  },
  empty: {
    display:      'flex',
    alignItems:   'center',
    gap:          '0.4rem',
    background:   'var(--bg-elevated)',
    border:       '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding:      '0.5rem 0.85rem',
    minWidth:     200,
  },
}
