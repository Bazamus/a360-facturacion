// Service Worker A360 SAT - Cache básico para instalabilidad PWA
const CACHE_NAME = 'a360-sat-v1'
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
]

// Instalar: cachear assets estáticos
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {
        // Continuar aunque algún asset falle
      })
    }),
  )
  self.skipWaiting()
})

// Activar: limpiar caches antiguas
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      ),
    ),
  )
  self.clients.claim()
})

// Fetch: network-first para API, cache-first para assets estáticos
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // No cachear peticiones a Supabase u otras APIs externas
  if (
    url.hostname.includes('supabase') ||
    url.hostname.includes('resend') ||
    request.method !== 'GET'
  ) {
    return
  }

  // Para assets estáticos (js, css, imágenes): cache-first
  if (
    url.pathname.match(/\.(js|css|jpg|jpeg|png|svg|woff2?)$/)
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
          }
          return response
        })
      }),
    )
    return
  }

  // Para todo lo demás: network-first con fallback
  event.respondWith(
    fetch(request).catch(() => caches.match(request)),
  )
})
