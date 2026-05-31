// src/store/config.store.ts
// Config del sistema cargada al login desde el backend.
// Se persiste en sessionStorage para durar solo la sesión.
import { create } from 'zustand'

const SESSION_KEY = 'app_config'

interface AppConfig {
  bancos:                 string[]
  tipos_pago:             string[]
  internet_default_monto: number
  monedas:                { codigo: string; simbolo: string; nombre: string }[]
  [key: string]:          any
}

interface ConfigState {
  config:    AppConfig | null
  loaded:    boolean
  setConfig: (c: AppConfig) => void
  clear:     () => void

  // ── Helpers de acceso directo ─────────────────────────────
  getBancos:           () => string[]
  getTiposPago:        () => string[]
  getInternetDefault:  () => number
  getBancoLabel:       (value: string) => string
  getTipoPagoLabel:    (value: string) => string
}

// Defaults usados mientras no carga la config
const DEFAULTS: AppConfig = {
  bancos:                 ['bcp','bbva','interbank','scotiabank','yape','plin','efectivo','otro'],
  tipos_pago:             ['transferencia','yape','plin','efectivo','deposito','otro'],
  internet_default_monto: 30,
  monedas:                [{ codigo:'PEN', simbolo:'S/.', nombre:'Sol peruano' }],
}

// Labels legibles
const BANCO_LABELS: Record<string, string> = {
  bcp: 'BCP', bbva: 'BBVA', interbank: 'Interbank',
  scotiabank: 'Scotiabank', yape: 'Yape', plin: 'Plin',
  efectivo: 'Efectivo', otro: 'Otro',
}

const PAGO_LABELS: Record<string, string> = {
  transferencia: 'Transferencia', yape: 'Yape', plin: 'Plin',
  efectivo: 'Efectivo', deposito: 'Depósito', otro: 'Otro',
}

function loadFromSession(): AppConfig | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

export const useConfigStore = create<ConfigState>((set, get) => ({
  config: loadFromSession(),
  loaded: !!loadFromSession(),

  setConfig: (c) => {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(c))
    set({ config: c, loaded: true })
  },

  clear: () => {
    sessionStorage.removeItem(SESSION_KEY)
    set({ config: null, loaded: false })
  },

  // ── Helpers ───────────────────────────────────────────────
  getBancos:          () => get().config?.bancos          || DEFAULTS.bancos,
  getTiposPago:       () => get().config?.tipos_pago      || DEFAULTS.tipos_pago,
  getInternetDefault: () => get().config?.internet_default_monto ?? DEFAULTS.internet_default_monto,

  getBancoLabel:    (v) => BANCO_LABELS[v] || v.toUpperCase(),
  getTipoPagoLabel: (v) => PAGO_LABELS[v]  || v,
}))
