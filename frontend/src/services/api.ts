// src/services/api.ts
//
// Axios instance con interceptores para:
//  1. Adjuntar el access token a cada request
//  2. Renovar el access token automáticamente al recibir 401
//     usando el refresh token — transparente para el usuario
//  3. Si el refresh también falla, redirigir a /login

import axios from 'axios'
import { APP_STORAGE_PREFIX } from '../config/brand'

const BASE_URL = import.meta.env.VITE_API_URL || '/api/v1'

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'ngrok-skip-browser-warning': 'true',
  },
})


// ── Claves de localStorage ────────────────────────────────────
const KEY_TOKEN   = `${APP_STORAGE_PREFIX}_token`
const KEY_REFRESH = `${APP_STORAGE_PREFIX}_refresh_token`
const KEY_USER    = `${APP_STORAGE_PREFIX}_user`

// ── Request interceptor: adjuntar access token ────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(KEY_TOKEN)
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ── Response interceptor: refresh automático ─────────────────
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

    // Solo actuar en 401 y evitar loop infinito con _retry
    if (err.response?.status !== 401 || original._retry) {
      return Promise.reject(err)
    }

    const refreshToken = localStorage.getItem(KEY_REFRESH)

    // Sin refresh token → logout directo
    if (!refreshToken) {
      clearSessionAndRedirect()
      return Promise.reject(err)
    }

    // Si ya hay un refresh en curso, encolar la request fallida
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject })
      }).then((token) => {
        original.headers.Authorization = `Bearer ${token}`
        return api(original)
      })
    }

    original._retry  = true
    isRefreshing     = true

    try {
      const { data } = await axios.post(`${BASE_URL}/auth/refresh`, {
        refreshToken,
      })

      const newAccess  = data.accessToken
      const newRefresh = data.refreshToken ?? refreshToken

      // Guardar nuevos tokens
      localStorage.setItem(KEY_TOKEN,   newAccess)
      localStorage.setItem(KEY_REFRESH, newRefresh)

      // Actualizar header por defecto para las siguientes requests
      api.defaults.headers.common.Authorization = `Bearer ${newAccess}`

      processQueue(null, newAccess)

      // Reintentar la request original con el nuevo token
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
