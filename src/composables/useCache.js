/**
 * Composable pour la gestion du cache avec TTL (Time To Live)
 * et déduplication des requêtes en cours.
 *
 * Fonctionnalités :
 * - Cache en mémoire avec expiration automatique
 * - Déduplication des requêtes simultanées
 * - Support du cache stale-while-revalidate
 * - Nettoyage automatique des entrées expirées
 */

/**
 * Structure du cache :
 * {
 *   [key]: {
 *     data: any,           // Données en cache
 *     timestamp: number,   // Date de mise en cache
 *     ttl: number,         // Durée de vie en ms
 *     promise: Promise     // Requête en cours (pour déduplication)
 *   }
 * }
 *
 * Note : le cache est un simple Map (pas de ref Vue) car il s'agit
 * d'un singleton module-level jamais utilisé dans un template.
 */
const cache = new Map()

/**
 * Vérifie si une entrée du cache est encore valide
 */
const isValid = (entry) => {
  if (!entry) return false
  const now = Date.now()
  return now - entry.timestamp < entry.ttl
}

/**
 * Récupère les données du cache si valides
 */
const get = (key) => {
  const entry = cache.get(key)
  if (entry && isValid(entry)) {
    return entry.data
  }
  return null
}

/**
 * Vérifie si une requête pour cette clé est en cours
 */
const hasPendingRequest = (key) => {
  const entry = cache.get(key)
  return entry && entry.promise instanceof Promise
}

/**
 * Récupère la promesse de la requête en cours
 */
const getPendingRequest = (key) => {
  const entry = cache.get(key)
  return entry?.promise
}

/**
 * Enregistre une promesse comme requête en cours
 */
const setPendingRequest = (key, promise, ttl) => {
  const entry = cache.get(key) || {}
  cache.set(key, {
    ...entry,
    promise,
    ttl,
  })
}

/**
 * Supprime la promesse en cours d'une entrée (ex: requête échouée)
 * sans toucher aux données éventuellement en cache.
 */
const clearPendingRequest = (key) => {
  const entry = cache.get(key)
  if (entry && entry.promise) {
    cache.set(key, { ...entry, promise: null })
  }
}

/**
 * Met à jour le cache avec de nouvelles données
 */
const set = (key, data, ttl) => {
  startAutoCleanup()
  cache.set(key, {
    data,
    timestamp: Date.now(),
    ttl,
    promise: null, // Clear pending request
  })
}

/**
 * Invalide une entrée du cache
 */
const invalidate = (key) => {
  cache.delete(key)
}

/**
 * Invalide toutes les entrées correspondant à un pattern
 */
const invalidatePattern = (pattern) => {
  const regex = new RegExp(pattern)
  const keys = Array.from(cache.keys())
  keys.forEach((key) => {
    if (regex.test(key)) {
      cache.delete(key)
    }
  })
}

/**
 * Vide complètement le cache
 */
const clear = () => {
  cache.clear()
}

/**
 * Nettoie les entrées expirées du cache
 */
const cleanup = () => {
  const now = Date.now()
  const keys = Array.from(cache.keys())

  keys.forEach((key) => {
    const entry = cache.get(key)
    if (entry && now - entry.timestamp >= entry.ttl) {
      cache.delete(key)
    }
  })
}

/**
 * Retourne l'âge d'une entrée du cache en millisecondes.
 * Utile pour le stale-while-revalidate intelligent :
 * ne revalider que si le cache vieillit (ex: > 50% du TTL).
 * @param {string} key
 * @returns {number} Âge en ms, ou Infinity si la clé n'existe pas
 */
const getAge = (key) => {
  const entry = cache.get(key)
  if (!entry || !entry.timestamp) return Infinity
  return Date.now() - entry.timestamp
}

/**
 * Retourne le timestamp de mise en cache d'une entrée.
 * @param {string} key
 * @returns {number|null} Timestamp en ms, ou null si la clé n'existe pas
 */
const getTimestamp = (key) => {
  const entry = cache.get(key)
  return entry?.timestamp || null
}

/**
 * Récupère des statistiques sur le cache
 */
const getStats = () => {
  const entries = Array.from(cache.entries())

  let size = 0
  try {
    size = JSON.stringify(Object.fromEntries(cache)).length
  } catch {
    // Fallback si les données contiennent des références circulaires
    size = -1
  }

  return {
    total: entries.length,
    valid: entries.filter(([, entry]) => isValid(entry)).length,
    expired: entries.filter(([, entry]) => !isValid(entry)).length,
    pending: entries.filter(([, entry]) => entry.promise instanceof Promise).length,
    size,
  }
}

// Nettoyage automatique toutes les 5 minutes (démarré paresseusement)
let cleanupIntervalId = null

const startAutoCleanup = () => {
  if (!cleanupIntervalId) {
    cleanupIntervalId = setInterval(cleanup, 5 * 60 * 1000)
  }
}

const stopAutoCleanup = () => {
  if (cleanupIntervalId) {
    clearInterval(cleanupIntervalId)
    cleanupIntervalId = null
  }
}

export function useCache() {
  return {
    get,
    getAge,
    getTimestamp,
    set,
    invalidate,
    invalidatePattern,
    clear,
    cleanup,
    getStats,
    hasPendingRequest,
    getPendingRequest,
    setPendingRequest,
    clearPendingRequest,
    startAutoCleanup,
    stopAutoCleanup,
  }
}
