import { onMounted, onUnmounted } from 'vue'

// Intervalle minimum entre deux rafraîchissements (en ms).
// Évite le flood de requêtes lors de changements rapides d'onglet.
const MIN_REFRESH_INTERVAL = 30 * 1000 // 30 secondes

/**
 * Composable pour charger les données au montage et détecter quand l'utilisateur
 * revient à l'application pour rafraîchir les données.
 *
 * Intègre un throttle : si l'utilisateur revient sur l'onglet moins de 30s
 * après le dernier chargement, le callback n'est pas relancé.
 *
 * @param {Function} callback - Fonction à exécuter au montage et au retour à l'application
 * @param {Object} options - Options de configuration
 * @param {number} options.minInterval - Intervalle minimum en ms entre deux appels (défaut: 30s)
 */
export function useVisibilityRefresh(callback, options = {}) {
  const { minInterval = MIN_REFRESH_INTERVAL } = options
  let lastRefreshAt = 0

  // Exécute le callback en absorbant un éventuel rejet de promesse.
  // Les erreurs de chargement sont déjà gérées par les stores (état `error`
  // + toast via useDataFetcher) : inutile de polluer la console avec un
  // unhandled rejection.
  const runCallback = () => {
    const result = callback()
    if (result && typeof result.then === 'function') {
      result.catch(() => {})
    }
  }

  const tryRefresh = () => {
    const now = Date.now()
    if (now - lastRefreshAt < minInterval) {
      return // Trop tôt, on ignore
    }
    lastRefreshAt = now
    runCallback()
  }

  const handleVisibilityChange = () => {
    // Si le document redevient visible
    if (document.visibilityState === 'visible') {
      tryRefresh()
    }
  }

  onMounted(() => {
    // Charger les données au montage initial (toujours, pas de throttle)
    lastRefreshAt = Date.now()
    runCallback()

    // Écouter les changements de visibilité du document
    document.addEventListener('visibilitychange', handleVisibilityChange)
  })

  onUnmounted(() => {
    // Nettoyer l'écouteur
    document.removeEventListener('visibilitychange', handleVisibilityChange)
  })

  return {
    // Permet de déclencher manuellement un rafraîchissement si nécessaire
    refresh: callback,
  }
}
