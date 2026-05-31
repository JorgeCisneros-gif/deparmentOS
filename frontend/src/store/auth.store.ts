// src/store/auth.store.ts
import { create } from 'zustand'
import api from '../services/api'
import { APP_STORAGE_PREFIX } from '../config/brand'
import { useConfigStore } from './config.store'

const KEY_TOKEN = `${APP_STORAGE_PREFIX}_token`
const KEY_USER  = `${APP_STORAGE_PREFIX}_user`

interface AuthUser {
  id:              string
  email:           string
  role:            'supervisor' | 'administrador' | 'gestion' | 'propietario'
  idGrupo?:        string
  idEdificio?:     string
  idDepartamento?: string
  idPropietario?:  string
}

interface AuthState {
  user:    AuthUser | null
  token:   string | null
  loading: boolean

  login:   (email: string, password: string) => Promise<void>
  logout:  () => void

  isSupervisor:    () => boolean
  isAdministrador: () => boolean
  isGestion:       () => boolean
  isPropietario:   () => boolean

  canManage:      () => boolean
  canOperate:     () => boolean
  canViewHistory: () => boolean
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: (() => {
    try { return JSON.parse(localStorage.getItem(KEY_USER) || 'null') }
    catch { return null }
  })(),
  token:   localStorage.getItem(KEY_TOKEN),
  loading: false,

  login: async (email, password) => {
    set({ loading: true })
    try {
      const { data } = await api.post('/auth/login', { email, password })

      // Guardar token y usuario
      localStorage.setItem(KEY_TOKEN, data.accessToken)
      localStorage.setItem(KEY_USER,  JSON.stringify(data.user))

      // ← Guardar config del sistema en el store de config
      if (data.config) {
        useConfigStore.getState().setConfig(data.config)
      }

      set({ user: data.user, token: data.accessToken, loading: false })
    } catch (err) {
      set({ loading: false })
      throw err
    }
  },

  logout: () => {
    localStorage.removeItem(KEY_TOKEN)
    localStorage.removeItem(KEY_USER)
    // Limpiar config de sesión
    useConfigStore.getState().clear()
    set({ user: null, token: null })
  },

  isSupervisor:    () => get().user?.role === 'supervisor',
  isAdministrador: () => get().user?.role === 'administrador',
  isGestion:       () => get().user?.role === 'gestion',
  isPropietario:   () => get().user?.role === 'propietario',

  canManage:      () => ['supervisor', 'administrador'].includes(get().user?.role ?? ''),
  canOperate:     () => ['supervisor', 'administrador', 'gestion'].includes(get().user?.role ?? ''),
  canViewHistory: () => ['supervisor', 'administrador', 'gestion', 'propietario'].includes(get().user?.role ?? ''),
}))
