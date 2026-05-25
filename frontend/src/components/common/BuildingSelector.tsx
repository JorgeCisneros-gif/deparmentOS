// src/components/common/BuildingSelector.tsx
//
// Componente unificado para seleccionar edificio.
// Aplica automáticamente el filtro por rol:
//   - Supervisor    → muestra todos los edificios
//   - Administrador → muestra solo su edificio asignado (idEdificio del JWT)
//
// USO BÁSICO:
//   <BuildingSelector value={selBuilding} onChange={setSelBuilding} />
//
// USO CON LABEL y PLACEHOLDER:
//   <BuildingSelector
//     value={selBuilding}
//     onChange={setSelBuilding}
//     label="EDIFICIO"
//     placeholder="— Seleccionar —"
//   />
//
// USO SIN OPCIÓN VACÍA (auto-selecciona el primero al cargar):
//   <BuildingSelector value={selBuilding} onChange={setSelBuilding} autoSelect />
//
// ACCEDER A LA LISTA COMPLETA si la página necesita más datos:
//   <BuildingSelector value={selBuilding} onChange={setSelBuilding} onLoad={setBuildings} />

import { useEffect } from 'react'
import { useAuthStore } from '../../store/auth.store'
import { useBuildings } from '../../hooks/useBuildings'
import type { Building } from '../../hooks/useBuildings'

interface BuildingSelectorProps {
  value: string
  onChange: (id: string) => void
  label?: string
  placeholder?: string
  /** Auto-selecciona el primer edificio al cargar (default: true) */
  autoSelect?: boolean
  /** Callback para acceder a la lista completa de edificios */
  onLoad?: (buildings: Building[]) => void
  style?: React.CSSProperties
  className?: string
  disabled?: boolean
}

export default function BuildingSelector({
  value,
  onChange,
  label,
  placeholder,
  autoSelect = true,
  onLoad,
  style,
  className,
  disabled,
}: BuildingSelectorProps) {
  const { buildings, loading } = useBuildings()
  const { isAdministrador } = useAuthStore()

  // Auto-seleccionar el primero al cargar
  useEffect(() => {
    if (autoSelect && buildings.length > 0 && !value) {
      onChange(buildings[0].id)
    }
  }, [buildings])

  // Exponer la lista si la página la necesita
  useEffect(() => {
    if (onLoad) onLoad(buildings)
  }, [buildings])

  const selectStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    color: 'var(--text-primary)',
    padding: '0.55rem 0.75rem',
    fontSize: '0.875rem',
    fontFamily: 'var(--font-body)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
    ...style,
  }

  const labelStyle: React.CSSProperties = {
    fontSize: '0.72rem',
    fontWeight: 600,
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    display: 'block',
    marginBottom: '0.35rem',
  }

  const select = (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={selectStyle}
      className={className}
      disabled={disabled || loading || isAdministrador()}
      // El administrador no puede cambiar de edificio — solo tiene uno
      title={isAdministrador() ? 'Tu cuenta está limitada a este edificio' : undefined}
    >
      {!autoSelect && !value && (
        <option value="">{placeholder ?? '— Seleccionar edificio —'}</option>
      )}
      {loading ? (
        <option value="" disabled>Cargando...</option>
      ) : (
        buildings.map(b => (
          <option key={b.id} value={b.id}>{b.nombre}</option>
        ))
      )}
    </select>
  )

  if (!label) return select

  return (
    <div>
      <label style={labelStyle}>{label}</label>
      {select}
    </div>
  )
}
