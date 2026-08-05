import { register } from 'register-service-worker'

// The ready(), registered(), cached(), updatefound() and updated()
// events passes a ServiceWorkerRegistration instance in their arguments.
// ServiceWorkerRegistration: https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration

console.log('🔄 Enregistrement du Service Worker...')
console.log('Fichier SW:', process.env.SERVICE_WORKER_FILE)

// Guard anti-boucle de rechargement : ne recharger qu'une seule fois
// quand un nouveau SW prend le contrôle
let refreshing = false
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true
      console.log('🔄 Nouveau SW actif, rechargement unique...')
      window.location.reload()
    }
  })
}

register(process.env.SERVICE_WORKER_FILE, {
  // The registrationOptions object will be passed as the second argument
  // to ServiceWorkerContainer.register()
  // https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerContainer/register#Parameter

  // registrationOptions: { scope: './' },

  ready(registration) {
    console.log('✅ Service worker is active.')
    console.log('Registration scope:', registration.scope)
    console.log('SW state:', registration.active?.state)
  },

  registered(registration) {
    console.log('✅ Service worker has been registered.')
    console.log('Registration details:', {
      scope: registration.scope,
      updateViaCache: registration.updateViaCache,
      active: !!registration.active,
      waiting: !!registration.waiting,
      installing: !!registration.installing,
    })
  },

  cached(registration) {
    console.log('✅ Content has been cached for offline use.')
    console.log('Cached by SW in scope:', registration.scope)
  },

  updatefound(registration) {
    console.log('🔄 New content is downloading.')
    console.log('Update found for SW:', registration.scope)
  },

  updated(registration) {
    console.log('🔄 New content is available.')
    console.log('SW updated, registration:', registration.scope)

    // Le nouveau SW attend de prendre le contrôle.
    // On lui envoie SKIP_WAITING pour qu'il s'active immédiatement.
    // Le rechargement est géré par le listener 'controllerchange' ci-dessus
    // (avec un guard anti-boucle) — pas besoin de reload() ici.
    if (registration && registration.waiting) {
      console.log('⏳ Sending SKIP_WAITING to new service worker...')
      registration.waiting.postMessage({ type: 'SKIP_WAITING' })
    }
  },

  offline() {
    console.warn('⚠️ No internet connection found. App is running in offline mode.')
  },

  error(err) {
    console.error('❌ Error during service worker registration:', err)
    console.error('Error details:', {
      name: err.name,
      message: err.message,
      stack: err.stack,
    })
  },
})
