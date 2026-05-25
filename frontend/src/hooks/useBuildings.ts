// src/hooks/useBuildings.ts
// Hook centralizado para obtener edificios filtrados por rol.
//
// - Supervisor : ve todos los edificios
// - Administrador : ve SOLO su edificio asignado (idEdificio del JWT)
// - Propietario : no usa este hook (no tiene selector de edificio)
//
// USO en cualquier página:
//   const { buildings, loading: loadingBuildings } = useBuildings()
//   // Reemplaza: api.get('/buildings').then(r => setBuildings(r.data))

import { useEffect, useState } from 'react'
import api from '../services/api'
import { useAuthStore } from '../store/auth.store'

export interface Building {
  id: string
  nombre: string
}

interface UseBuildingsResult {
  buildings: Building[]
  loading: boolean
}

export function useBuildings(): UseBuildingsResult {
  const { user, isAdministrador } = useAuthStore()
  const [buildings, setBuildings] = useState<Building[]>([])
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    setLoading(true)
    api.get('/buildings')
      .then(r => {
        const all: Building[] = r.data || []

        if (isAdministrador() && user?.idEdificio) {
          // Administrador: filtrar solo su edificio asignado
          setBuildings(all.filter(b => b.id === user.idEdificio))
        } else {
          // Supervisor: todos los edificios
          setBuildings(all)
        }
      })
      .catch(() => setBuildings([]))
      .finally(() => setLoading(false))
  }, [user?.idEdificio])

  return { buildings, loading }
}
