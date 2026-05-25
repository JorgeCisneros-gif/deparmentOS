// src/store/timezone.store.ts
// Store global de timezone — persiste en localStorage.
// El usuario selecciona su país desde el Sidebar y todas las fechas
// del frontend se formatean con esa timezone.

import { create } from 'zustand'
import api from '../services/api'
import { APP_STORAGE_PREFIX } from '../config/brand'

export interface PaisInfo {
  codigo:   string
  nombre:   string
  timezone: string   // IANA: 'America/Lima'
  moneda:   string   // 'PEN'
  locale:   string   // 'es-PE'
}

interface TimezoneState {
  pais:      PaisInfo | null
  paises:    PaisInfo[]
  loadPaises: () => Promise<void>
  setPais:   (p: PaisInfo) => void
  // Utilidades
  formatDate:     (date: Date | string | null, opts?: Intl.DateTimeFormatOptions) => string
  formatDateTime: (date: Date | string | null) => string
  formatCurrency: (amount: number) => string
  today:          () => string   // YYYY-MM-DD en la timezone activa
  parseLocalDate: (dateStr: string) => Date  // "YYYY-MM-DD" → UTC correcto
}

// País por defecto — Perú
const DEFAULT_PAIS: PaisInfo = {
  codigo:   'PE',
  nombre:   'Perú',
  timezone: 'America/Lima',
  moneda:   'PEN',
  locale:   'es-PE',
}

const STORAGE_KEY = `${APP_STORAGE_PREFIX}_pais`

function loadFromStorage(): PaisInfo | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

export const useTimezoneStore = create<TimezoneState>((set, get) => ({
  pais:   loadFromStorage() || DEFAULT_PAIS,
  paises: [],

  loadPaises: async () => {
    try {
      const { data } = await api.get('/paises')
      set({ paises: data })
    } catch {
      // Si falla, usar lista mínima offline
      set({ paises: [DEFAULT_PAIS] })
    }
  },

  setPais: (p: PaisInfo) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p))
    set({ pais: p })
  },

  // ── Formateo de fechas ────────────────────────────────────────

  formatDate: (date, opts) => {
    if (!date) return '—'
    const { timezone, locale } = get().pais || DEFAULT_PAIS
    try {
      const d = typeof date === 'string' ? new Date(date) : date
      if (isNaN(d.getTime())) return '—'
      return d.toLocaleDateString(locale, {
        timeZone: timezone,
        day:      '2-digit',
        month:    '2-digit',
        year:     'numeric',
        ...opts,
      })
    } catch { return String(date) }
  },

  formatDateTime: (date) => {
    if (!date) return '—'
    const { timezone, locale } = get().pais || DEFAULT_PAIS
    try {
      const d = typeof date === 'string' ? new Date(date) : date
      if (isNaN(d.getTime())) return '—'
      return d.toLocaleString(locale, {
        timeZone: timezone,
        day:      '2-digit',
        month:    '2-digit',
        year:     'numeric',
        hour:     '2-digit',
        minute:   '2-digit',
      })
    } catch { return String(date) }
  },

  formatCurrency: (amount) => {
    const { locale, moneda } = get().pais || DEFAULT_PAIS
    try {
      return new Intl.NumberFormat(locale, {
        style:    'currency',
        currency: moneda,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount)
    } catch {
      return `${moneda} ${amount.toFixed(2)}`
    }
  },

  // "Hoy" en la timezone activa → YYYY-MM-DD
  today: () => {
    const { timezone } = get().pais || DEFAULT_PAIS
    return new Date().toLocaleDateString('en-CA', { timeZone: timezone })
  },

  // Convierte "YYYY-MM-DD" en un Date UTC correcto para la timezone activa.
  // Usa mediodía local para evitar errores de cambio de día.
  parseLocalDate: (dateStr: string): Date => {
    const { timezone } = get().pais || DEFAULT_PAIS
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return new Date(dateStr)

    // Obtener el offset de la timezone activa
    const tempDate = new Date(`${dateStr}T12:00:00`)
    const utcStr   = tempDate.toLocaleString('en-US', { timeZone: 'UTC' })
    const tzStr    = tempDate.toLocaleString('en-US', { timeZone: timezone })
    const offsetMs = new Date(utcStr).getTime() - new Date(tzStr).getTime()

    // Mediodía local en UTC
    return new Date(tempDate.getTime() - offsetMs)
  },
}))

// ── Hook de conveniencia ──────────────────────────────────────
// Uso: const { fmt, fmtDT, currency } = useTz()
export function useTz() {
  const store = useTimezoneStore()
  return {
    fmt:      store.formatDate,
    fmtDT:    store.formatDateTime,
    currency: store.formatCurrency,
    today:    store.today,
    parse:    store.parseLocalDate,
    timezone: store.pais?.timezone || 'America/Lima',
    locale:   store.pais?.locale   || 'es-PE',
    moneda:   store.pais?.moneda   || 'PEN',
  }
}
