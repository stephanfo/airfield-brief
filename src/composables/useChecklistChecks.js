import { ref } from 'vue'
import { logger } from '../utils/logger'
import { STORAGE_KEYS } from '../config/storageKeys'

/**
 * État coché des check-lists (préférence UI), partagé entre le runner normal et
 * les procédures d'urgence/secours. Singleton module-level → une seule source de
 * vérité + une seule écriture localStorage.
 *
 * Forme : { [registration]: { "[checklistId]:[sectionIdx]:[itemIdx]": true } }
 * Clé par index de section (pas le slug) : deux sections homonymes ne partagent
 * pas leur état.
 */
const STATE_KEY = STORAGE_KEYS.CHECKLIST_STATE

function load() {
  try {
    return JSON.parse(localStorage.getItem(STATE_KEY) || '{}')
  } catch {
    return {}
  }
}

const state = ref(load())

function save() {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(state.value))
  } catch (e) {
    logger.warn('Impossible de mémoriser l’état de la check-list:', e)
  }
}

function keyFor(checklistId, sIdx, idx) {
  return `${checklistId}:${sIdx}:${idx}`
}

export function useChecklistChecks() {
  function isChecked(reg, checklistId, sIdx, idx) {
    return !!state.value[reg]?.[keyFor(checklistId, sIdx, idx)]
  }

  function setChecked(reg, checklistId, sIdx, idx, value) {
    const bucket = { ...(state.value[reg] ?? {}) }
    const k = keyFor(checklistId, sIdx, idx)
    if (value) bucket[k] = true
    else delete bucket[k]
    state.value = { ...state.value, [reg]: bucket }
    save()
  }

  /** Vrai si tous les items d'une section sont cochés. */
  function isSectionComplete(reg, checklistId, sIdx, itemCount) {
    for (let i = 0; i < itemCount; i++) {
      if (!isChecked(reg, checklistId, sIdx, i)) return false
    }
    return itemCount > 0
  }

  /** Réinitialise tous les items d'une check-list pour un avion. */
  function resetChecklist(reg, checklistId) {
    const bucket = { ...(state.value[reg] ?? {}) }
    const prefix = `${checklistId}:`
    for (const k of Object.keys(bucket)) {
      if (k.startsWith(prefix)) delete bucket[k]
    }
    state.value = { ...state.value, [reg]: bucket }
    save()
  }

  return { isChecked, setChecked, isSectionComplete, resetChecklist }
}
