// public/sw.js
// Service Worker de DepartmOS
// Maneja notificaciones push aunque la app esté cerrada

const APP_NAME = self.APP_NAME || 'DepartmOS'
const CACHE_NAME = `${APP_NAME.toLowerCase().replace(/\s/g,'_')}-v1`

// ── Instalación ───────────────────────────────────────────────
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando Service Worker...')
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  console.log('[SW] Service Worker activado')
  event.waitUntil(clients.claim())
})

// ── Push: recibir notificación del servidor ───────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return

  let payload
  try {
    payload = event.data.json()
  } catch {
    payload = {
      title: APP_NAME,
      body:  event.data.text(),
      icon:  '/icons/icon-192.png',
      url:   '/',
    }
  }

  const options = {
    body:             payload.body,
    icon:             payload.icon  || '/icons/icon-192.png',
    badge:            payload.badge || '/icons/badge-72.png',
    tag:              payload.tag   || 'departmos-notification',
    renotify:         true,
    requireInteraction: false,
    vibrate:          [200, 100, 200],
    data: {
      url: payload.url || '/',
    },
    actions: [
      { action: 'open',    title: 'Ver detalle' },
      { action: 'dismiss', title: 'Descartar'   },
    ],
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, options)
  )
})

// ── Click en la notificación ──────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  if (event.action === 'dismiss') return

  const targetUrl = event.notification.data?.url || '/'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Si la app ya está abierta, enfoca esa pestaña
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus()
          client.navigate(targetUrl)
          return
        }
      }
      // Si no está abierta, abre una ventana nueva
      if (clients.openWindow) {
        return clients.openWindow(targetUrl)
      }
    })
  )
})

// ── Push subscription change (el browser rota las claves) ─────
self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('[SW] Suscripción push cambió — re-suscribiendo...')
  // El hook usePushNotifications en React maneja esto
})
