const offlineUrl = '/'
const cacheName = 'v4'

addEventListener('install', (event) => {
  skipWaiting() // not waiting for worker to become active to work with cache invalidation

  event.waitUntil(async function() {
    const cache = await caches.open(cacheName)
    await cache.addAll([offlineUrl])
    // TODO: add index.js. But it has hash? So atm we just give him 1 year cache through nginx.
    // Wordpos files from jsdelivr cdn also cached for 1 year.
  }())
})

addEventListener('fetch', (event) => {
  const { request } = event

  // Always bypass for range requests, due to browser bugs
  if (request.headers.has('range')) return

  if (request.method !== 'GET') return
  // Should be html doc
  if (!request.headers.get('accept').includes('text/html')) return
  // Should be our resource
  const url = new URL(request.url)
  if (url.pathname !== offlineUrl) return

  event.respondWith(async function() {
    try {
      response = await fetch(request)

      // Update cache
      const cache = await caches.open(cacheName)
      return cache.put(request, response.clone()).then(() => response)
    } catch (err) {
      // If this was a navigation, show the offline page:
      if (request.mode === 'navigate') {
        return caches.match(offlineUrl, { cacheName })
      }

      // Otherwise throw
      throw err
    }
  }())
})
