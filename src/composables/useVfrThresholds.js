import { reactive } from 'vue'
import { STORAGE_KEYS } from '../config/constants'
import { VFR_THRESHOLDS_DEFAULTS } from '../config/app.config'

/**
 * Fusionne récursivement les défauts avec les valeurs stockées.
 * Garantit que les nouvelles clés ajoutées aux défauts sont toujours présentes.
 */
function deepMerge(defaults, overrides) {
  const result = {}
  for (const key of Object.keys(defaults)) {
    if (
      typeof defaults[key] === 'object' &&
      defaults[key] !== null &&
      !Array.isArray(defaults[key])
    ) {
      result[key] = deepMerge(defaults[key], overrides?.[key] || {})
    } else {
      result[key] = overrides?.[key] ?? defaults[key]
    }
  }
  return result
}

/**
 * Charge les seuils depuis localStorage avec fallback sur les défauts
 */
function loadFromStorage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.VFR_THRESHOLDS)
    if (stored) {
      return deepMerge(VFR_THRESHOLDS_DEFAULTS, JSON.parse(stored))
    }
  } catch {
    // localStorage indisponible ou JSON invalide → défauts
  }
  return JSON.parse(JSON.stringify(VFR_THRESHOLDS_DEFAULTS))
}

// Singleton réactif partagé entre tous les composants
let _thresholds = null

/**
 * Composable de gestion des seuils VFR configurables.
 *
 * Les seuils sont persistés dans localStorage et partagés entre
 * tous les composants via un singleton réactif.
 *
 * @returns {{ thresholds: Object, saveThresholds: Function, resetToDefaults: Function }}
 */
export function useVfrThresholds() {
  if (!_thresholds) {
    _thresholds = reactive(loadFromStorage())
  }

  /**
   * Persiste les seuils actuels dans localStorage
   */
  function saveThresholds() {
    try {
      localStorage.setItem(STORAGE_KEYS.VFR_THRESHOLDS, JSON.stringify(_thresholds))
    } catch {
      // Quota dépassé ou localStorage indisponible — silencieux
    }
  }

  /**
   * Restaure les seuils OACI par défaut et persiste
   */
  function resetToDefaults() {
    const defaults = JSON.parse(JSON.stringify(VFR_THRESHOLDS_DEFAULTS))
    Object.keys(defaults).forEach((key) => {
      _thresholds[key] = defaults[key]
    })
    saveThresholds()
  }

  return {
    thresholds: _thresholds,
    saveThresholds,
    resetToDefaults,
  }
}
