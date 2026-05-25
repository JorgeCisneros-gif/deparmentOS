// src/components/common/DeptCombo.tsx
//
// Select de departamentos autocontenido — recarga automáticamente
// cuando cambia el buildingId. No necesita estado externo de departamentos.
//
// USO:
//   <DeptCombo
//     buildingId={editing.idEdificio}
//     value={editing.idDepartamento}
//     onChange={(id) => setEditing(e => ({ ...e, idDepartamento: id }))}
//   />

import { useEffect, useState } from 'react'
import api from '../../services/api'

interface Dept { id: string; nrDepartamento: string; piso: number }

interface DeptComboProps {
  buildingId:  string           // cuando cambia, recarga los deptos automáticamente
  value:       string
  onChange:    (id: string) => void
  placeholder?: string
  disabled?:   boolean
  style?:      React.CSSProperties
}

export default function DeptCombo({
  buildingId,
  value,
  onChange,
  placeholder = '— Sin asignar —',
  disabled,
  style,
}: DeptComboProps) {
  const [depts, setDepts]     = useState<Dept[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!buildingId) {
      setDepts([])
      return
    }
    setLoading(true)
    api.get('/departments', { params: { buildingId } })
      .then(r => setDepts(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [buildingId])

  const isDisabled = disabled || !buildingId || loading

  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      disabled={isDisabled}
      style={{ width: '100%', opacity: isDisabled ? 0.7 : 1, ...style }}
    >
      <option value="">{loading ? 'Cargando...' : placeholder}</option>
      {depts.map(d => (
        <option key={d.id} value={d.id}>
          Depto {d.nrDepartamento} (Piso {d.piso})
        </option>
      ))}
    </select>
  )
}
