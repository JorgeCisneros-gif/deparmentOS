// public/sw.js
// Service Worker para notificaciones push web (PWA)
// IMPORTANTE: la URL de click siempre usa la URL de producción,
// nunca la URL donde se registró el SW (evita redirects a ngrok u otros orígenes)

const APP_URL = 'https://deparmentos.suite-os.app'

self.addEventListener('install', (event) => {
  console.log('[SW] Instalado')
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  console.log('[SW] Activado')
  event.waitUntil(self.clients.claim())
})

// ── Recibir notificación push ─────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return

  let data
  try {
    data = event.data.json()
  } catch {
    data = { title: 'DepartmOS', body: event.data.text(), url: '/' }
  }

  const title   = data.title || 'DepartmOS'
  const options = {
    body:    data.body   || '',
    icon:    data.icon   || '/icons/icon-192.png',
    badge:   data.badge  || '/icons/badge-72.png',
    tag:     data.tag    || 'departmos',
    data:    { url: data.url || '/' },  // guardar URL en data para usarla en click
    actions: [{ action: 'open', title: 'Ver detalles' }],
    requireInteraction: false,
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

// ── Click en notificación ─────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const relativeUrl = event.notification.data?.url || '/'

  // Siempre construir URL absoluta con dominio de producción
  // Esto evita que se abra la URL de ngrok u otro origen
  const absoluteUrl = relativeUrl.startsWith('http')
    ? relativeUrl
    : `${APP_URL}${relativeUrl}`

  console.log('[SW] Click en notificación → abriendo:', absoluteUrl)

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        // Si ya hay una ventana de la app abierta, enfocarla y navegar
        for (const client of clients) {
          if (client.url.startsWith(APP_URL) && 'focus' in client) {
            client.focus()
            if ('navigate' in client) client.navigate(absoluteUrl)
            return
          }
        }
        // Si no hay ventana abierta, abrir una nueva
        if (self.clients.openWindow) {
          return self.clients.openWindow(absoluteUrl)
        }
      })
  )
})
