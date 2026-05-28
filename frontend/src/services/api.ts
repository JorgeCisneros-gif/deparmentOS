// src/services/api.ts
import axios from 'axios'
import { APP_STORAGE_PREFIX } from '../config/brand'

const BASE_URL = import.meta.env.VITE_API_URL || '/api/v1'

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'ngrok-skip-browser-warning': 'true' },
})

const KEY_TOKEN   = `${APP_STORAGE_PREFIX}_token`
const KEY_REFRESH = `${APP_STORAGE_PREFIX}_refresh_token`
const KEY_USER    = `${APP_STORAGE_PREFIX}_user`

// ── Request interceptor ───────────────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(KEY_TOKEN)
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ── Response interceptor ──────────────────────────────────────
let isRefreshing = false
let failedQueue: { resolve: (v: any) => void; reject: (e: any) => void }[] = []

function processQueue(error: any, token: string | null) {
  failedQueue.forEach(({ resolve, reject }) =>
    error ? reject(error) : resolve(token),
  )
  failedQueue = []
}

api.interceptors.response.use(
  (r) => r,
  async (err) => {
    const original = err.config

    // ── 403 con código de suscripción → redirigir a pantalla de aviso
    if (err.response?.status === 403) {
      const code = err.response?.data?.message?.code || err.response?.data?.code
      if (code === 'SUBSCRIPTION_EXPIRED' || code === 'SUBSCRIPTION_SUSPENDED') {
        ;(window as any).__subscriptionCode = code
        window.location.href = '/subscription-expired'
        return Promise.reject(err)
      }
    }

    // ── 401: intentar refresh automático ─────────────────────
    if (err.response?.status !== 401 || original._retry) {
      return Promise.reject(err)
    }

    const refreshToken = localStorage.getItem(KEY_REFRESH)
    if (!refreshToken) {
      clearSessionAndRedirect()
      return Promise.reject(err)
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject })
      }).then((token) => {
        original.headers.Authorization = `Bearer ${token}`
        return api(original)
      })
    }

    original._retry = true
    isRefreshing    = true

    try {
      const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken })

      const newAccess  = data.accessToken
      const newRefresh = data.refreshToken ?? refreshToken

      localStorage.setItem(KEY_TOKEN,   newAccess)
      localStorage.setItem(KEY_REFRESH, newRefresh)
      api.defaults.headers.common.Authorization = `Bearer ${newAccess}`

      processQueue(null, newAccess)
      original.headers.Authorization = `Bearer ${newAccess}`
      return api(original)
    } catch (refreshErr) {
      processQueue(refreshErr, null)
      clearSessionAndRedirect()
      return Promise.reject(refreshErr)
    } finally {
      isRefreshing = false
    }
  },
)

function clearSessionAndRedirect() {
  localStorage.removeItem(KEY_TOKEN)
  localStorage.removeItem(KEY_REFRESH)
  localStorage.removeItem(KEY_USER)
  window.location.href = '/login'
}

export default api
