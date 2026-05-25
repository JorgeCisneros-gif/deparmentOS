import { create } from 'zustand'
import api from '../services/api'
import { APP_STORAGE_PREFIX } from '../config/brand'

// Claves de localStorage — deben coincidir con las de api.ts
const KEY_TOKEN = `${APP_STORAGE_PREFIX}_token`
const KEY_USER  = `${APP_STORAGE_PREFIX}_user`

interface AuthUser {
  id: string
  email: string
  role: 'supervisor' | 'administrador' | 'propietario'
  idEdificio?:     string
  idDepartamento?: string
  idPropietario?:  string
}

interface AuthState {
  user: AuthUser | null
  token: string | null
  loading: boolean
  login:           (email: string, password: string) => Promise<void>
  logout:          () => void
  isSupervisor:    () => boolean   // supervisor O administrador
  isAdministrador: () => boolean   // solo administrador
  isPropietario:   () => boolean   // solo propietario
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: (() => {
    try { return JSON.parse(localStorage.getItem(KEY_USER) || 'null') } catch { return null }
  })(),
  token: localStorage.getItem(KEY_TOKEN),
  loading: false,

  login: async (email, password) => {
    set({ loading: true })
    try {
      const { data } = await api.post('/auth/login', { email, password })
      localStorage.setItem(KEY_TOKEN, data.accessToken)
      localStorage.setItem(KEY_USER,  JSON.stringify(data.user))
      set({ user: data.user, token: data.accessToken, loading: false })
    } catch (err) {
      set({ loading: false })
      throw err
    }
  },

  logout: () => {
    localStorage.removeItem(KEY_TOKEN)
    localStorage.removeItem(KEY_USER)
    set({ user: null, token: null })
  },

  isSupervisor:    () => ['supervisor', 'administrador'].includes(get().user?.role ?? ''),
  isAdministrador: () => get().user?.role === 'administrador',
  isPropietario:   () => get().user?.role === 'propietario',
}))
