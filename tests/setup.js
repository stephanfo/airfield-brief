import { afterEach, beforeEach, vi } from 'vitest'
import { useCache } from '@/composables/useCache'

// --- Mock du paquet `quasar` --------------------------------------------
// Seuls Notify et copyToClipboard sont utilisés par les modules testés
// (useDataFetcher, notificationStore, logsStore). On évite ainsi de charger
// tout Quasar (et son besoin d'un vrai DOM/SSR) dans les tests unitaires.
vi.mock('quasar', () => ({
  Notify: {
    create: vi.fn(),
    setDefaults: vi.fn(),
  },
  copyToClipboard: vi.fn(() => Promise.resolve()),
}))

// --- Réinitialisation entre chaque test ----------------------------------
beforeEach(() => {
  // localStorage est fourni par happy-dom ; on repart toujours d'un état vide
  // (useHiddenNotams / useSeenNotams / useLocalStorageSet en dépendent).
  localStorage.clear()
})

afterEach(() => {
  vi.clearAllMocks()
  // Stoppe l'intervalle de nettoyage auto armé par useCache à l'import
  // (évite un handle ouvert résiduel entre tests).
  useCache().stopAutoCleanup()
  // Restaure les timers réels si un test a activé les fake timers.
  vi.useRealTimers()
})
