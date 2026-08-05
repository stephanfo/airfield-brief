import { useLocalStorageSet } from './useLocalStorageSet'
import { STORAGE_KEYS } from '../config/constants'

const STORAGE_KEY = STORAGE_KEYS.SEEN_NOTAMS
const EXPIRATION_DAYS = 7

// Utiliser le composable générique
const { add, has, cleanupExpired, getIds, count, pruneStale } = useLocalStorageSet(
  STORAGE_KEY,
  EXPIRATION_DAYS,
)

export function useSeenNotams() {
  // Marquer un NOTAM comme vu
  const markAsSeen = (id, endValidity) => {
    if (!id) return
    add(id, endValidity)
  }

  // Vérifier si un NOTAM est nouveau (jamais vu)
  const isNew = (id) => {
    return id ? !has(id) : false
  }

  return {
    markAsSeen,
    isNew,
    getAllSeenIds: getIds,
    seenCount: count,
    cleanupExpired,
    pruneStale,
  }
}
