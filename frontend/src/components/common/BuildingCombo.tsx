// src/components/common/BuildingCombo.tsx
//
// Select de edificios autocontenido — carga su propia data desde el API.
// No depende de hooks externos ni de estado del padre para funcionar.
//
// USO:
//   <BuildingCombo
//     value={editing.idEdificio}
//     onChange={(id, nombre) => setEditing(e => ({ ...e, idEdificio: id, nombre }))}
//   />
//
// Para administrador (solo ve su edificio):
//   <BuildingCombo
//     value={editing.idEdificio}
//     onChange={(id) => setEditing(e => ({ ...e, idEdificio: id }))}
//     adminBuildingId={user?.idEdificio}
//   />

import { useEffect, useState } from 'react'
import api from '../../services/api'

interface Building { id: string; nombre: string }

interface BuildingComboProps {
  value:            string
  onChange:         (id: string, nombre: string) => void
  adminBuildingId?: string        // si se pasa, filtra y deshabilita al edificio del admin
  placeholder?:     string        // texto de opción vacía
  disabled?:        boolean
  style?:           React.CSSProperties
}

export default function BuildingCombo({
  value,
  onChange,
  adminBuildingId,
  placeholder = '— Sin asignar —',
  disabled,
  style,
}: BuildingComboProps) {
  const [buildings, setBuildings] = useState<Building[]>([])
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    api.get('/buildings')
      .then(r => {
        const all: Building[] = r.data || []
        const filtered = adminBuildingId
          ? all.filter(b => b.id === adminBuildingId)
          : all
        setBuildings(filtered)

        // Auto-seleccionar si hay exactamente uno y aún no hay valor
        if (filtered.length === 1 && !value) {
          onChange(filtered[0].id, filtered[0].nombre)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const isDisabled = disabled || !!adminBuildingId || loading

  return (
    <select
      value={value}
      onChange={e => {
        const b = buildings.find(x => x.id === e.target.value)
        onChange(e.target.value, b?.nombre || '')
      }}
      disabled={isDisabled}
      style={{ width: '100%', opacity: isDisabled ? 0.8 : 1, ...style }}
    >
      {!value && <option value="">{loading ? 'Cargando...' : placeholder}</option>}
      {buildings.map(b => (
        <option key={b.id} value={b.id}>{b.nombre}</option>
      ))}
    </select>
  )
}
