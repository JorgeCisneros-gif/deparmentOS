// src/store/auth.store.ts
import { create } from 'zustand'
import api from '../services/api'
import { APP_STORAGE_PREFIX } from '../config/brand'

const KEY_TOKEN = `${APP_STORAGE_PREFIX}_token`
const KEY_USER  = `${APP_STORAGE_PREFIX}_user`

interface AuthUser {
  id:              string
  email:           string
  role:            'supervisor' | 'administrador' | 'gestion' | 'propietario'
  idGrupo?:        string   // grupo al que pertenece
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

  // ── Helpers de rol ─────────────────────────────────────────
  isSupervisor:    () => boolean  // solo supervisor
  isAdministrador: () => boolean  // solo administrador
  isGestion:       () => boolean  // solo gestion
  isPropietario:   () => boolean  // solo propietario

  // ── Helpers de acceso agrupados ────────────────────────────
  canManage:      () => boolean  // supervisor + administrador
  canOperate:     () => boolean  // supervisor + administrador + gestion
  canViewHistory: () => boolean  // todos
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

  isSupervisor:    () => get().user?.role === 'supervisor',
  isAdministrador: () => get().user?.role === 'administrador',
  isGestion:       () => get().user?.role === 'gestion',
  isPropietario:   () => get().user?.role === 'propietario',

  canManage:      () => ['supervisor', 'administrador'].includes(get().user?.role ?? ''),
  canOperate:     () => ['supervisor', 'administrador', 'gestion'].includes(get().user?.role ?? ''),
  canViewHistory: () => ['supervisor', 'administrador', 'gestion', 'propietario'].includes(get().user?.role ?? ''),
}))
