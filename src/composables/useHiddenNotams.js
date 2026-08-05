import { useLocalStorageSet } from './useLocalStorageSet'
import { STORAGE_KEYS } from '../config/constants'

const STORAGE_KEY = STORAGE_KEYS.HIDDEN_NOTAMS
const EXPIRATION_DAYS = 7

// Utiliser le composable générique
const {
  add: hideNotam,
  remove: unhideNotam,
  has: isHidden,
  cleanupExpired,
  count,
  clear: clearAllHidden,
  pruneStale,
} = useLocalStorageSet(STORAGE_KEY, EXPIRATION_DAYS)

export function useHiddenNotams() {
  return {
    hideNotam,
    unhideNotam,
    isHidden,
    cleanupExpired,
    hiddenCount: count,
    clearAllHidden,
    pruneStale,
  }
}
