import { create } from 'zustand'
import api from '../services/api'
import { APP_STORAGE_PREFIX } from '../config/brand'

const KEY_TOKEN = `${APP_STORAGE_PREFIX}_token`
const KEY_USER  = `${APP_STORAGE_PREFIX}_user`

interface AuthUser {
  id:              string
  email:           string
  role:            'supervisor' | 'administrador' | 'gestion' | 'propietario'
  idAccount?:      string   // ← nuevo
  idEdificio?:     string
  idDepartamento?: string
  idPropietario?:  string
}

interface AuthState {
  user:            AuthUser | null
  token:           string | null
  loading:         boolean
  login:           (email: string, password: string) => Promise<void>
  logout:          () => void
  // ── Helpers de rol ──────────────────────────────────────────
  isSupervisor:    () => boolean   // solo supervisor (acceso total global)
  isAdministrador: () => boolean   // solo administrador
  isGestion:       () => boolean   // solo gestion
  isPropietario:   () => boolean   // solo propietario
  // ── Helpers de acceso ───────────────────────────────────────
  canManageBuilding: () => boolean // supervisor | administrador
  canOperate:        () => boolean // supervisor | administrador | gestion
  canViewHistory:    () => boolean // supervisor | administrador | gestion | propietario
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

  // ── Helpers individuales ─────────────────────────────────────
  isSupervisor:    () => get().user?.role === 'supervisor',
  isAdministrador: () => get().user?.role === 'administrador',
  isGestion:       () => get().user?.role === 'gestion',
  isPropietario:   () => get().user?.role === 'propietario',

  // ── Helpers de acceso agrupados ──────────────────────────────
  // supervisor + administrador → gestionan edificios, recibos, config
  canManageBuilding: () => ['supervisor', 'administrador'].includes(get().user?.role ?? ''),

  // supervisor + administrador + gestion → operaciones diarias
  canOperate: () => ['supervisor', 'administrador', 'gestion'].includes(get().user?.role ?? ''),

  // todos
  canViewHistory: () => ['supervisor', 'administrador', 'gestion', 'propietario'].includes(get().user?.role ?? ''),
}))
