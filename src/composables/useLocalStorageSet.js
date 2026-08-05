import { ref, computed } from 'vue'
import { logger } from '../utils/logger'

/**
 * Composable générique pour gérer un Set d'items dans localStorage avec expiration
 * Utilisé pour les NOTAMs cachés et vus
 *
 * @param {string} storageKey - Clé localStorage
 * @param {number} expirationDays - Nombre de jours avant expiration (défaut: 7)
 * @returns {Object} - Méthodes pour gérer le set
 */
export function useLocalStorageSet(storageKey, expirationDays = 7) {
  const items = ref({})

  /**
   * Charge les données depuis localStorage
   */
  const loadFromStorage = () => {
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        items.value = JSON.parse(stored)
      }
    } catch (error) {
      logger.error(`Erreur chargement ${storageKey}:`, error)
      items.value = {}
    }
  }

  /**
   * Sauvegarde les données dans localStorage
   */
  const saveToStorage = () => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(items.value))
    } catch (error) {
      logger.error(`Erreur sauvegarde ${storageKey}:`, error)
    }
  }

  /**
   * Nettoie les items expirés
   */
  const cleanupExpired = () => {
    const now = new Date()
    let hasChanges = false

    for (const [id, item] of Object.entries(items.value)) {
      // Pas d'expiresAt = permanent, ne jamais supprimer automatiquement
      if (!item.expiresAt) continue
      const expiryDate = new Date(item.expiresAt)
      if (expiryDate <= now) {
        delete items.value[id]
        hasChanges = true
      }
    }

    if (hasChanges) {
      saveToStorage()
    }
  }

  /**
   * Ajoute un item au set
   * @param {string} id - Identifiant de l'item
   * @param {string} endValidity - Date de fin de validité (optionnel)
   */
  const add = (id, endValidity = null) => {
    // Rejeter les IDs invalides pour éviter des entrées orphelines en localStorage
    if (!id || typeof id !== 'string' || id.trim() === '') {
      logger.warn(`${storageKey}: tentative d'ajout d'un ID invalide:`, id)
      return
    }

    // Calculer la date d'expiration localStorage
    // L'expiration est un filet de sécurité pour le nettoyage ; le vrai nettoyage
    // des entrées orphelines est assuré par pruneStale() à chaque chargement de données.
    const entry = {
      addedAt: new Date().toISOString(),
    }

    if (endValidity && endValidity !== 'PERM') {
      // NOTAM temporaire : expiration = endValidity + expirationDays (marge de sécurité)
      const endDate = new Date(endValidity)
      const expiresAt = new Date(endDate.getTime() + expirationDays * 24 * 60 * 60 * 1000)
      entry.expiresAt = expiresAt.toISOString()
    }
    // NOTAM permanent (PERM) ou sans date : pas d'expiresAt
    // pruneStale() se chargera de nettoyer quand le NOTAM disparaîtra du JSON

    items.value[id] = entry

    saveToStorage()
  }

  /**
   * Retire un item du set
   * @param {string} id - Identifiant de l'item
   */
  const remove = (id) => {
    if (items.value[id]) {
      delete items.value[id]
      saveToStorage()
    }
  }

  /**
   * Vérifie si un item est dans le set (et non expiré)
   * Fonction pure sans side-effect — le nettoyage des expirés est
   * géré par cleanupExpired() appelé au démarrage et périodiquement.
   * @param {string} id - Identifiant de l'item
   * @returns {boolean}
   */
  const has = (id) => {
    const item = items.value[id]
    if (!item) return false
    // Pas d'expiresAt = permanent, toujours valide
    if (!item.expiresAt) return true
    return new Date(item.expiresAt) > new Date()
  }

  /**
   * Retourne la liste de tous les IDs
   * @returns {string[]}
   */
  const getIds = () => {
    return Object.keys(items.value)
  }

  /**
   * Retourne le nombre d'items non expirés
   * @returns {import('vue').ComputedRef<number>}
   */
  const count = computed(() => {
    const now = new Date()
    return Object.values(items.value).filter(
      (item) => !item.expiresAt || new Date(item.expiresAt) > now,
    ).length
  })

  /**
   * Retourne le nombre total d'items (y compris expirés) — pour diagnostic
   * @returns {import('vue').ComputedRef<number>}
   */
  const rawCount = computed(() => {
    return Object.keys(items.value).length
  })

  /**
   * Supprime les entrées dont l'ID n'existe plus dans la liste des IDs valides.
   * Permet de nettoyer les NOTAMs qui ne sont plus dans le JSON source.
   * @param {Set<string>|string[]} validIds - IDs actuellement présents dans les données
   */
  const pruneStale = (validIds) => {
    const validSet = validIds instanceof Set ? validIds : new Set(validIds)
    let hasChanges = false

    for (const id of Object.keys(items.value)) {
      if (!validSet.has(id)) {
        delete items.value[id]
        hasChanges = true
      }
    }

    if (hasChanges) {
      saveToStorage()
      logger.log(`${storageKey}: entrées obsolètes supprimées`)
    }
  }

  /**
   * Vide complètement le set
   */
  const clear = () => {
    items.value = {}
    saveToStorage()
  }

  // Charger au démarrage
  loadFromStorage()

  return {
    items,
    add,
    remove,
    has,
    getIds,
    count,
    rawCount,
    clear,
    cleanupExpired,
    pruneStale,
  }
}
