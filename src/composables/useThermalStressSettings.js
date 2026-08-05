import { reactive } from 'vue'
import { STORAGE_KEYS } from '../config/constants'
import { THERMAL_STRESS_SETTINGS_DEFAULTS } from '../config/app.config'

/**
 * Réglage personnel du stress thermique (FEAT-031).
 *
 * Préférence UI (âge / pathologie) persistée en localStorage et partagée entre
 * composants via un singleton réactif — calqué sur `useVfrThresholds`.
 * Conforme à la policy : préférence UI, pas de donnée aviation « métier ».
 */

/**
 * Fusionne les défauts avec les valeurs stockées (garantit la présence des
 * nouvelles clés ajoutées aux défauts).
 */
function mergeDefaults(overrides) {
  const result = {}
  for (const key of Object.keys(THERMAL_STRESS_SETTINGS_DEFAULTS)) {
    result[key] = overrides?.[key] ?? THERMAL_STRESS_SETTINGS_DEFAULTS[key]
  }
  return result
}

function loadFromStorage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.THERMAL_STRESS)
    if (stored) {
      return mergeDefaults(JSON.parse(stored))
    }
  } catch {
    // localStorage indisponible ou JSON invalide → défauts
  }
  return { ...THERMAL_STRESS_SETTINGS_DEFAULTS }
}

// Singleton réactif partagé entre tous les composants
let _settings = null

/**
 * Composable de gestion du réglage personnel de stress thermique.
 *
 * @returns {{ settings: Object, saveSettings: Function, resetToDefaults: Function }}
 */
export function useThermalStressSettings() {
  if (!_settings) {
    _settings = reactive(loadFromStorage())
  }

  function saveSettings() {
    try {
      localStorage.setItem(STORAGE_KEYS.THERMAL_STRESS, JSON.stringify(_settings))
    } catch {
      // Quota dépassé ou localStorage indisponible — silencieux
    }
  }

  function resetToDefaults() {
    Object.keys(THERMAL_STRESS_SETTINGS_DEFAULTS).forEach((key) => {
      _settings[key] = THERMAL_STRESS_SETTINGS_DEFAULTS[key]
    })
    saveSettings()
  }

  return {
    settings: _settings,
    saveSettings,
    resetToDefaults,
  }
}
