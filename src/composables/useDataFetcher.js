import { ref, computed } from 'vue'
import { Notify } from 'quasar'
import { useCache } from './useCache'
import { logger } from '../utils/logger'
import { DATA_CACHE_PREFIX } from '../config/storageKeys'

/**
 * Composable pour le chargement de données avec gestion des états,
 * cache TTL et déduplication des requêtes.
 *
 * Fonctionnalités :
 * - Cache automatique avec TTL configurable
 * - Déduplication : si une requête est déjà en cours, retourne la même promesse
 * - Mode stale-while-revalidate : retourne les données en cache et rafraîchit en arrière-plan
 * - Invalidation manuelle du cache
 *
 * @param {string} endpoint - URL de l'endpoint
 * @param {Object} options - Options de configuration
 * @param {boolean} options.cacheBust - Force le rechargement (ignore le cache)
 * @param {number} options.ttl - Durée de vie du cache en ms (défaut: 5 min)
 * @param {boolean} options.staleWhileRevalidate - Active le mode stale-while-revalidate
 * @param {boolean} options.deduplicate - Active la déduplication des requêtes (défaut: true)
 * @param {string} options.errorLabel - Libellé humain de la donnée pour le toast d'erreur (ex: "météo")
 * @returns {Object} - { data, loading, error, fetchData, refetch, invalidate }
 */
export function useDataFetcher(endpoint, options = {}) {
  const {
    cacheBust = false,
    ttl = 5 * 60 * 1000, // 5 minutes par défaut
    staleWhileRevalidate = false,
    deduplicate = true,
    persist = false,
    errorLabel = null,
  } = options

  // Évite le spam de toasts : une seule notification par fenêtre d'erreur,
  // réarmée dès qu'un chargement réussit à nouveau.
  let errorNotified = false

  const notifyLoadError = () => {
    if (errorNotified) return
    errorNotified = true
    const label = errorLabel ? ` (${errorLabel})` : ''
    Notify.create({
      type: 'negative',
      message: `Impossible de charger les données${label}`,
      caption: 'Vérifiez votre connexion ou réessayez plus tard.',
      icon: 'cloud_off',
      position: 'top',
      timeout: 5000,
    })
  }

  const data = ref(null)
  const loading = ref(false)
  const error = ref(null)
  const isRefreshing = ref(false)
  const isStale = ref(false)
  const lastFetchedAt = ref(null)

  const activeRequestIds = new Set()

  const updateRefreshingState = (action, requestId) => {
    if (action === 'start') {
      activeRequestIds.add(requestId)
    } else if (action === 'end') {
      activeRequestIds.delete(requestId)
    }
    isRefreshing.value = activeRequestIds.size > 0
  }

  const cache = useCache()
  const cacheKey = endpoint

  // ===== Persistance localStorage =====
  const persistKey = `${DATA_CACHE_PREFIX}${endpoint}`

  /**
   * Persiste les données dans localStorage pour survie au rechargement
   */
  const persistToStorage = (fetchedData) => {
    if (!persist) return
    try {
      const entry = { data: fetchedData, timestamp: Date.now() }
      localStorage.setItem(persistKey, JSON.stringify(entry))
    } catch (e) {
      logger.warn(`Erreur persistance localStorage pour ${endpoint}:`, e)
    }
  }

  /**
   * Restaure les données depuis localStorage (cold start)
   * @returns {{ data: any, timestamp: number } | null}
   */
  const restoreFromStorage = () => {
    if (!persist) return null
    try {
      const raw = localStorage.getItem(persistKey)
      if (!raw) return null
      const entry = JSON.parse(raw)
      if (entry && entry.data != null && typeof entry.timestamp === 'number') {
        return entry
      }
    } catch (e) {
      logger.warn(`Erreur restauration localStorage pour ${endpoint}:`, e)
      localStorage.removeItem(persistKey)
    }
    return null
  }

  // ===== Computed =====

  /**
   * Timestamp prévu pour le prochain rafraîchissement (lastFetchedAt + TTL)
   */
  const nextRefreshAt = computed(() => {
    if (!lastFetchedAt.value) return null
    return lastFetchedAt.value + ttl
  })

  /**
   * Récupère les données (avec cache, persistance et déduplication)
   */
  const fetchData = async (forceRefresh = false) => {
    // Si cacheBust est activé, ignore le cache
    if (!cacheBust && !forceRefresh) {
      // Vérifie si les données sont en cache
      const cached = cache.get(cacheKey)
      if (cached) {
        data.value = cached
        lastFetchedAt.value = cache.getTimestamp(cacheKey)

        // En mode stale-while-revalidate INTELLIGENT :
        // On ne revalide en arrière-plan que si le cache vieillit (> 50% du TTL).
        // Cela évite les requêtes réseau inutiles lors de navigations rapides
        // tout en garantissant des données fraîches pour les sessions longues.
        if (staleWhileRevalidate) {
          const cacheAge = cache.getAge(cacheKey)
          const revalidateThreshold = ttl * 0.5

          if (cacheAge > revalidateThreshold) {
            logger.log(
              `♻️ Cache vieillissant pour ${endpoint} (${Math.round(cacheAge / 1000)}s), revalidation en arrière-plan`,
            )
            fetchDataFromNetwork({ background: true }).catch((err) => {
              logger.error(`Erreur rafraîchissement ${endpoint}:`, err)
              isStale.value = true
            })
          }
        }

        return cached
      }

      // Restauration depuis localStorage (cold start / rechargement de page)
      if (persist) {
        const persisted = restoreFromStorage()
        if (persisted) {
          logger.log(
            `📦 Données restaurées depuis localStorage pour ${endpoint} (âge: ${Math.round((Date.now() - persisted.timestamp) / 1000)}s)`,
          )
          data.value = persisted.data
          lastFetchedAt.value = persisted.timestamp
          isStale.value = true

          // Toujours revalider depuis le réseau au démarrage
          const bgPromise = fetchDataFromNetwork({ background: true })
          bgPromise.catch((err) => {
            logger.error(`Erreur rafraîchissement ${endpoint}:`, err)
          })

          // Enregistrer pour déduplication
          if (deduplicate) {
            cache.setPendingRequest(cacheKey, bgPromise, ttl)
          }

          return persisted.data
        }
      }

      // Déduplication : si une requête est déjà en cours, on attend son résultat
      if (deduplicate && cache.hasPendingRequest(cacheKey)) {
        try {
          const result = await cache.getPendingRequest(cacheKey)
          data.value = result
          return result
        } catch {
          // Si la requête en cours échoue, on réessaye
          logger.warn('Requête en cours échouée, nouvelle tentative...')
        }
      }
    }

    // Pas en cache ou forcé : on récupère du réseau
    return fetchDataFromNetwork({ force: cacheBust || forceRefresh })
  }

  /**
   * Récupère les données depuis le réseau
   */
  const fetchDataFromNetwork = async ({ background = false, force = false } = {}) => {
    const requestId = Symbol('request')

    if (!background) {
      loading.value = true
    }
    error.value = null
    updateRefreshingState('start', requestId)

    try {
      // Crée la promesse de fetch
      const shouldBustCache = cacheBust || force
      const cacheBustParam = shouldBustCache ? `?t=${Date.now()}` : ''
      const fetchPromise = fetch(`${endpoint}${cacheBustParam}`).then(async (response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }
        try {
          return await response.json()
        } catch (parseError) {
          throw new Error(`Invalid JSON response: ${parseError.message}`)
        }
      })

      // Enregistre la promesse pour déduplication
      if (deduplicate && !background) {
        cache.setPendingRequest(cacheKey, fetchPromise, ttl)
      }

      // Attend le résultat
      const result = await fetchPromise

      // Met à jour les données et le cache
      data.value = result
      cache.set(cacheKey, result, ttl)
      lastFetchedAt.value = Date.now()
      isStale.value = false
      // Réarme le toast d'erreur après un chargement réussi
      errorNotified = false

      // Persister dans localStorage
      persistToStorage(result)

      return result
    } catch (err) {
      // Purge la promesse rejetée du cache : sans cela, chaque fetchData
      // suivant attendrait la promesse en échec avant de retenter.
      if (deduplicate) {
        cache.clearPendingRequest(cacheKey)
      }
      if (!background) {
        error.value = err.message
        logger.error(`Erreur chargement ${endpoint}:`, err)
        // Toast utilisateur uniquement si aucune donnée à afficher (vrai échec visible).
        // En présence de cache/persistance, l'app reste utilisable → pas de toast.
        if (!data.value) {
          notifyLoadError()
        }
      } else if (!data.value) {
        // Échec en arrière-plan sans aucune donnée disponible : prévenir aussi.
        notifyLoadError()
      }
      throw err
    } finally {
      if (!background) {
        loading.value = false
      }
      updateRefreshingState('end', requestId)
    }
  }

  /**
   * Invalide le cache pour cet endpoint
   */
  const invalidate = () => {
    cache.invalidate(cacheKey)
  }

  /**
   * Force le rechargement (ignore le cache)
   */
  const refetch = () => {
    return fetchData(true)
  }

  return {
    data,
    loading,
    error,
    fetchData,
    refetch,
    invalidate,
    isRefreshing,
    isStale,
    lastFetchedAt,
    nextRefreshAt,
  }
}
