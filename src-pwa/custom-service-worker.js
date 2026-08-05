/*
 * This file (which will be your service worker)
 * is picked up by the build system ONLY if
 * quasar.config file > pwa > workboxMode is set to "InjectManifest"
 */

import { clientsClaim } from 'workbox-core'
import {
  precacheAndRoute,
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
} from 'workbox-precaching'
import { registerRoute, NavigationRoute } from 'workbox-routing'
import { StaleWhileRevalidate } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'

// ============================================
// Portabilité du chemin de déploiement
// ============================================
// Le service worker est servi depuis le `publicPath` du build : son `scope` est
// donc DÉJÀ la bonne racine, que l'app soit à la racine du domaine ou dans un
// sous-répertoire. Tout chemin absolu écrit en dur (`/lffi/...`) casserait
// SILENCIEUSEMENT le cache et les icônes lors d'un changement de déploiement —
// on dérive tout du scope.
const SCOPE = self.registration.scope
/** Chemin des données JSON, ex. « /data/ » ou « /lffi/data/ ». */
const DATA_PATH = new URL('data/', SCOPE).pathname
/** Construit l'URL absolue d'une ressource servie par l'app. */
const appUrl = (relativePath) => new URL(relativePath, SCOPE).href

// ============================================
// Système de logging pour Service Worker
// ============================================

let swLoggingEnabled = false

const originalConsole = {
  log: console.log.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
}

// Fonction pour envoyer les logs à l'app
const sendLogToApp = (type, ...args) => {
  // Toujours appeler le console original
  originalConsole[type](...args)

  if (!swLoggingEnabled) return

  // Envoyer aux clients (app)
  clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
    const message = {
      type: 'SW_LOG',
      payload: {
        type,
        message: args
          .map((arg) => (typeof arg === 'object' ? JSON.stringify(arg) : String(arg)))
          .join(' '),
        timestamp: Date.now(),
        args,
      },
    }

    clientList.forEach((client) => {
      client.postMessage(message)
    })
  })
}

// Helper pour logger (toujours via original console mais capture si enabled)
const swLog = (...args) => sendLogToApp('log', ...args)
const swWarn = (...args) => sendLogToApp('warn', ...args)
const swError = (...args) => sendLogToApp('error', ...args)

// ============================================
// Initialisation Service Worker
// ============================================

swLog('🔄 Service Worker custom en cours de chargement...')
swLog('Mode:', process.env.MODE)
swLog('Production:', process.env.PROD)

self.skipWaiting()
clientsClaim()

swLog('✅ skipWaiting() et clientsClaim() appelés')

// Note: Navigation Preload n'est PAS activé ici car la route de navigation
// utilise createHandlerBoundToURL() qui sert depuis le precache.
// Activer Navigation Preload enverrait une requête réseau à chaque navigation
// qui ne serait jamais consommée (gaspillage de bande passante).

// Use with precache injection
swLog('🔄 Précaching des ressources...')
precacheAndRoute(self.__WB_MANIFEST)

cleanupOutdatedCaches()
swLog('✅ Nettoyage des caches obsolètes effectué')

// Cache strategy pour les données JSON dynamiques
swLog('🔄 Enregistrement des routes de cache...')
registerRoute(
  ({ url }) => url.pathname.startsWith(DATA_PATH),
  new StaleWhileRevalidate({
    cacheName: 'aviation-data',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 60 * 60, // 1 heure (harmonisé avec le cache en mémoire)
      }),
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
    ],
  }),
)
swLog('✅ Route aviation-data enregistrée')

// Cache strategy pour les images
registerRoute(
  ({ request }) => request.destination === 'image',
  new StaleWhileRevalidate({
    cacheName: 'images-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 60 * 60 * 24 * 30, // 30 jours
      }),
    ],
  }),
)
swLog('✅ Route images-cache enregistrée')

// Non-SSR fallbacks to index.html
// Production SSR fallbacks to offline.html (except for dev)
swLog('🔄 Configuration des fallbacks de navigation...')
if (process.env.MODE !== 'ssr' || process.env.PROD) {
  registerRoute(
    new NavigationRoute(createHandlerBoundToURL(process.env.PWA_FALLBACK_HTML), {
      denylist: [new RegExp(process.env.PWA_SERVICE_WORKER_REGEX), /workbox-(.)*\.js$/],
    }),
  )
  swLog('✅ Navigation fallback configuré:', process.env.PWA_FALLBACK_HTML)
} else {
  swLog('ℹ️ Mode SSR, pas de navigation fallback')
}

swLog('✅ Service Worker custom chargé et configuré')

// ============================================
// Gestion des notifications push (FCM)
// ============================================

swLog('🔄 Installation des listeners de notifications...')

/**
 * Réception d'une notification push depuis Firebase Cloud Messaging
 * Le backend N8N envoie le payload avec structure:
 * {
 *   notification: { title, body },
 *   data: { on_click_url }
 * }
 */
self.addEventListener('push', (event) => {
  swLog('📬 Push notification reçue:', event)

  if (!event.data) {
    swWarn('⚠️ Push notification sans données')
    return
  }

  try {
    const payload = event.data.json()
    swLog('📦 Payload de la notification:', payload)

    const { notification, data } = payload

    // APP_NAME est injecté au build depuis club.config.js (ADR-030) : le SW n'a
    // accès ni aux stores ni aux imports applicatifs.
    const notificationTitle = notification?.title || process.env.APP_NAME || 'Airfield Brief'
    const notificationOptions = {
      body: notification?.body || 'Nouvelle notification',
      icon: appUrl('icons/icon-192x192.png'),
      badge: appUrl('icons/icon-128x128.png'),
      tag: data?.tag || 'brief-notification',
      data: {
        // Accepter 'url' ou 'on_click_url' pour la redirection
        url: data?.on_click_url || '/',
        timestamp: Date.now(),
      },
      vibrate: [200, 100, 200],
      requireInteraction: false,
    }

    swLog('🔔 Affichage de la notification:', {
      title: notificationTitle,
      body: notificationOptions.body,
      tag: notificationOptions.tag,
      url: notificationOptions.data.url,
    })

    event.waitUntil(self.registration.showNotification(notificationTitle, notificationOptions))
    swLog('✅ Notification affichée avec succès')
  } catch (error) {
    swError('❌ Erreur lors du traitement de la notification push:', error)
    swError('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
    })
  }
})

swLog('✅ Listener push installé')

/**
 * Gestion du clic sur une notification
 * Redirige vers l'URL spécifiée dans data.on_click_url
 */
self.addEventListener('notificationclick', (event) => {
  swLog('🖱️ Notification cliquée:', event.notification)
  swLog('Tag:', event.notification.tag)
  swLog('Data:', event.notification.data)

  event.notification.close()

  const urlToOpen = event.notification.data?.url || '/'
  // Le scope du service worker porte déjà le publicPath (cf. entête)
  const baseUrl = SCOPE
  const fullUrl = new URL(urlToOpen, baseUrl).href

  swLog('🔄 Redirection vers:', fullUrl)
  swLog('Base URL:', baseUrl)

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      swLog(`📱 ${clientList.length} client(s) trouvé(s)`)

      // Chercher une fenêtre déjà ouverte avec l'app
      for (const client of clientList) {
        if (client.url.startsWith(baseUrl) && 'focus' in client) {
          swLog('✅ Client trouvé, navigation + focus:', client.url)
          // Naviguer vers la bonne page puis focus
          return client.navigate(fullUrl).then((client) => client.focus())
        }
      }

      // Sinon ouvrir une nouvelle fenêtre
      if (clients.openWindow) {
        swLog("🆕 Ouverture d'une nouvelle fenêtre")
        return clients.openWindow(fullUrl)
      }

      swWarn('⚠️ openWindow non disponible')
    }),
  )
})

swLog('✅ Listener notificationclick installé')

// ============================================
// Message handler pour communication avec l'app
// ============================================
self.addEventListener('message', (event) => {
  const { type, payload } = event.data || {}

  swLog('💬 Message reçu dans SW:', { type, payload })

  if (type === 'SKIP_WAITING') {
    swLog('⏩ SKIP_WAITING demandé')
    self.skipWaiting()
  }

  if (type === 'ENABLE_LOGGING') {
    swLog('🔊 Activation du logging SW')
    swLoggingEnabled = true
    originalConsole.log("✅ SW Logging activé - Les logs seront envoyés à l'app")
  }

  if (type === 'DISABLE_LOGGING') {
    swLog('🔇 Désactivation du logging SW')
    swLoggingEnabled = false
    originalConsole.log('✅ SW Logging désactivé')
  }

  if (type === 'GET_CACHE_INFO') {
    swLog('📊 Récupération des informations de cache')
    // Récupérer les informations sur les caches
    caches.keys().then((cacheNames) => {
      swLog(`📦 ${cacheNames.length} cache(s) trouvé(s):`, cacheNames)
      const cachePromises = cacheNames.map((cacheName) => {
        return caches.open(cacheName).then((cache) => {
          return cache.keys().then((keys) => {
            const sizePromises = keys.map((request) => {
              return cache
                .match(request)
                .then((response) => {
                  if (response) {
                    return response.blob().then((blob) => blob.size)
                  }
                  return 0
                })
                .catch(() => 0)
            })

            return Promise.all(sizePromises).then((sizes) => {
              const totalSize = sizes.reduce((sum, size) => sum + size, 0)
              return {
                name: cacheName,
                entries: keys.length,
                sizeBytes: totalSize,
                sizeMB: (totalSize / 1024 / 1024).toFixed(2),
              }
            })
          })
        })
      })

      Promise.all(cachePromises).then((cacheInfos) => {
        swLog('✅ Informations de cache récupérées:', cacheInfos)
        // Répondre via MessageChannel si disponible
        if (event.ports && event.ports[0]) {
          event.ports[0].postMessage({
            cacheInfos,
            timestamp: Date.now(),
          })
        }
      })
    })
  }

  if (type === 'CLEAR_CACHE') {
    const cacheName = payload?.cacheName
    swLog(`🗑️ Suppression du cache: ${cacheName}`)
    if (cacheName) {
      caches.delete(cacheName).then((success) => {
        swLog(`${success ? '✅' : '❌'} Cache supprimé: ${cacheName}`)
        if (event.ports && event.ports[0]) {
          event.ports[0].postMessage({ success })
        }
      })
    }
  }

  if (type === 'CLEAR_ALL_CACHES') {
    swLog('🗑️ Suppression de tous les caches')
    caches.keys().then((cacheNames) => {
      swLog(`🗑️ Suppression de ${cacheNames.length} cache(s)`)
      Promise.all(cacheNames.map((name) => caches.delete(name))).then(() => {
        swLog('✅ Tous les caches supprimés')
        if (event.ports && event.ports[0]) {
          event.ports[0].postMessage({ success: true })
        }
      })
    })
  }
})

swLog('✅ Listener message installé')
swLog('🎉 Service Worker custom complètement initialisé')
