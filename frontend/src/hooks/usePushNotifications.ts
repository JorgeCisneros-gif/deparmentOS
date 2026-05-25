// src/hooks/usePushNotifications.ts
import { useState, useEffect, useCallback } from 'react'
import api from '../services/api'

export type PushEstado =
  | 'no_soportado'
  | 'sin_permiso'
  | 'denegado'
  | 'suscrito'
  | 'no_suscrito'
  | 'cargando'

export function usePushNotifications() {
  const [estado, setEstado]           = useState<PushEstado>('cargando')
  const [registro, setRegistro]       = useState<ServiceWorkerRegistration | null>(null)
  const [suscripcion, setSuscripcion] = useState<PushSubscriptionJSON | null>(null)

  useEffect(() => {
    // Verificar soporte básico
    if (!('serviceWorker' in navigator)) {
      console.warn('[Push] Service Worker no soportado en este browser')
      setEstado('no_soportado')
      return
    }
    if (!('PushManager' in window)) {
      console.warn('[Push] PushManager no soportado — ¿HTTP sin HTTPS?')
      setEstado('no_soportado')
      return
    }
    if (!('Notification' in window)) {
      console.warn('[Push] Notifications API no disponible')
      setEstado('no_soportado')
      return
    }

    console.log('[Push] Browser soportado — registrando SW...')
    console.log('[Push] Location:', window.location.href)
    console.log('[Push] Notification.permission:', Notification.permission)

    if (Notification.permission === 'denied') {
      setEstado('denegado')
      return
    }

    navigator.serviceWorker
      .register('/sw.js')
      .then(async (reg) => {
        console.log('[Push] SW registrado OK — scope:', reg.scope)
        setRegistro(reg)

        const sub = await reg.pushManager.getSubscription()
        if (sub) {
          console.log('[Push] Suscripción existente encontrada')
          setSuscripcion(sub.toJSON())
          setEstado('suscrito')
          // Heartbeat: avisar al backend que este dispositivo sigue activo
          api.patch('/push/heartbeat', { endpoint: sub.endpoint }).catch(() => {})
        } else {
          console.log('[Push] Sin suscripción previa')
          setEstado(
            Notification.permission === 'granted' ? 'no_suscrito' : 'sin_permiso'
          )
        }
      })
      .catch((err) => {
        console.error('[Push] Error registrando SW:', err?.message)
        alert(`[Push] Error registrando Service Worker:\n${err?.message}\n\nURL: ${window.location.href}`)
        setEstado('no_soportado')
      })
  }, [])

  const getVapidKey = useCallback(async (): Promise<Uint8Array | null> => {
    try {
      const { data } = await api.get('/push/vapid-public-key')
      console.log('[Push] VAPID key obtenida del backend:', data.publicKey?.substring(0, 20) + '...')
      if (!data.publicKey) return null
      return urlBase64ToUint8Array(data.publicKey)
    } catch (err: any) {
      console.error('[Push] Error obteniendo VAPID key:', err?.message)
      return null
    }
  }, [])

  const activar = useCallback(async (): Promise<boolean> => {
    if (!registro) {
      alert('[Push Error] No hay Service Worker registrado.\nEstado: ' + estado)
      return false
    }
    setEstado('cargando')

    try {
      // Paso 1: pedir permiso
      console.log('[Push] Paso 1: pidiendo permiso...')
      const permiso = await Notification.requestPermission()
      console.log('[Push] Permiso:', permiso)

      if (permiso !== 'granted') {
        setEstado('denegado')
        return false
      }

      // Paso 2: obtener VAPID key
      console.log('[Push] Paso 2: obteniendo VAPID key...')
      const vapidKey = await getVapidKey()
      if (!vapidKey) {
        alert('[Push Error] No se pudo obtener la VAPID key del backend.\nVerifica que VITE_API_URL apunte al backend correcto.')
        setEstado('no_suscrito')
        return false
      }
      console.log('[Push] VAPID key OK')

      // Paso 3: suscribir al PushManager
      console.log('[Push] Paso 3: suscribiendo al PushManager...')
      let sub: PushSubscription
      try {
        sub = await registro.pushManager.subscribe({
          userVisibleOnly:      true,
          applicationServerKey: vapidKey,
        })
      } catch (subErr: any) {
        // Capturar todos los detalles del error de FCM
        const errDetails = {
          name:    subErr?.name,
          message: subErr?.message,
          code:    subErr?.code,
          stack:   subErr?.stack?.split('\n').slice(0,3).join(' | '),
        }
        alert(
          `[Push Error Paso 3]\n` +
          `Nombre: ${errDetails.name}\n` +
          `Mensaje: ${errDetails.message}\n` +
          `Código: ${errDetails.code}\n` +
          `Permiso actual: ${Notification.permission}`
        )
        setEstado('no_suscrito')
        return false
      }

      const subJson = sub.toJSON() as {
        endpoint: string
        keys: { p256dh: string; auth: string }
      }
      console.log('[Push] Suscripción creada:', subJson.endpoint.substring(0, 50))

      // Paso 4: guardar en backend
      console.log('[Push] Paso 4: guardando en backend...')
      try {
        await api.post('/push/subscribe', {
          endpoint:  subJson.endpoint,
          p256dh:    subJson.keys.p256dh,
          authKey:   subJson.keys.auth,
          userAgent: navigator.userAgent,
        })
      } catch (apiErr: any) {
        alert(`[Push Error] Falló al guardar suscripción en backend:\n${apiErr?.response?.status} ${apiErr?.message}`)
        setEstado('no_suscrito')
        return false
      }

      console.log('[Push] ✓ Todo OK — suscrito!')
      setSuscripcion(sub.toJSON())
      setEstado('suscrito')
      return true

    } catch (err: any) {
      alert(`[Push Error] Error inesperado:\n${err?.message}`)
      console.error('[Push] Error al activar:', err)
      setEstado('no_suscrito')
      return false
    }
  }, [registro, getVapidKey])

  const desactivar = useCallback(async (): Promise<void> => {
    if (!registro) return
    setEstado('cargando')
    try {
      const sub = await registro.pushManager.getSubscription()
      if (sub) {
        await api.delete('/push/unsubscribe', { data: { endpoint: sub.endpoint } }).catch(() => {})
        await sub.unsubscribe()
        console.log('[Push] Desuscrito OK')
      }
      setSuscripcion(null)
      setEstado('no_suscrito')
    } catch {
      setEstado('suscrito')
    }
  }, [registro])

  return {
    estado,
    suscripcion,
    soportado: estado !== 'no_soportado',
    activo:    estado === 'suscrito',
    cargando:  estado === 'cargando',
    activar,
    desactivar,
  }
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64     = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw     = window.atob(b64)
  const arr     = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr
}
