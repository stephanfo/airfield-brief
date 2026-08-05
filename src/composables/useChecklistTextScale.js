import { ref, watch } from 'vue'
import { logger } from '../utils/logger'
import { STORAGE_KEYS } from '../config/storageKeys'

/**
 * Échelle de texte des check-lists (préférence UI), mémorisée. Singleton
 * module-level → partagée entre runner et procédures d'urgence, persistée une fois.
 */
const KEY = STORAGE_KEYS.CHECKLIST_TEXT_SCALE

export const TEXT_SCALE_OPTIONS = [
  { label: 'A', value: 1 },
  { label: 'A+', value: 1.25 },
  { label: 'A++', value: 1.5 },
]

// Défaut A++ (1,5) : lisibilité maximale en vol, mémorisé dès le 1er réglage.
const DEFAULT_SCALE = 1.5

function load() {
  const v = Number(localStorage.getItem(KEY))
  return TEXT_SCALE_OPTIONS.some((o) => o.value === v) ? v : DEFAULT_SCALE
}

const scale = ref(load())

watch(scale, (v) => {
  try {
    localStorage.setItem(KEY, String(v))
  } catch (e) {
    logger.warn('Impossible de mémoriser la taille de texte:', e)
  }
})

export function useChecklistTextScale() {
  function setScale(v) {
    if (TEXT_SCALE_OPTIONS.some((o) => o.value === v)) scale.value = v
  }
  return { scale, setScale, options: TEXT_SCALE_OPTIONS }
}
