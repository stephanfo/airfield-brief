import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

/**
 * Feature flags (ADR-030) : un fork qui désactive un module ne doit garder ni sa
 * route ni son entrée de menu. Chaque cas remonte un `club.config` factice via
 * `vi.doMock` + `vi.resetModules()`, pour tester le mécanisme et non la config LFFI.
 */
const baseConfig = {
  app: { name: 'Test Brief', shortName: 'Test', description: 'desc' },
  airfield: {
    icao: 'LFXX',
    name: 'Test',
    lat: 0,
    lon: 0,
    elevationFt: 0,
    elevationM: 0,
    runwayHeading: 90,
    runwayLengthM: 800,
    surface: 'grass',
  },
  webcam: { baseUrl: 'https://x/', url: 'https://x/l.jpg', imagesUrl: 'https://x/i.php' },
  azba: { priorityZones: [] },
  notificationTopics: [],
  features: {
    webcam: true,
    station: true,
    thermal: true,
    rex: true,
    aircraft: true,
    notifications: true,
  },
  storagePrefix: 'test',
}

/** Recharge les modules avec une config club dérivée de `baseConfig`. */
async function withConfig(overrides) {
  vi.resetModules()
  const CLUB_CONFIG = {
    ...baseConfig,
    ...overrides,
    features: { ...baseConfig.features, ...(overrides.features ?? {}) },
  }
  vi.doMock('@/config/club.config', () => ({ CLUB_CONFIG }))
  return {
    features: await import('@/config/features'),
    routes: (await import('@/router/routes')).default,
  }
}

/** Chemins des routes enfants réellement déclarées. */
const childPaths = (routes) => routes[0].children.map((r) => r.path)

describe('feature flags', () => {
  beforeEach(() => vi.resetModules())
  afterEach(() => vi.doUnmock('@/config/club.config'))

  describe('isFeatureEnabled', () => {
    it('un élément sans module rattaché est toujours actif', async () => {
      const { features } = await withConfig({})
      expect(features.isFeatureEnabled(undefined)).toBe(true)
      expect(features.isFeatureEnabled(null)).toBe(true)
    })

    it('reflète le flag du module', async () => {
      const { features } = await withConfig({ features: { rex: false } })
      expect(features.isFeatureEnabled('rex')).toBe(false)
      expect(features.isFeatureEnabled('station')).toBe(true)
    })

    it('un module inconnu est inactif (pas de faux positif)', async () => {
      const { features } = await withConfig({})
      expect(features.isFeatureEnabled('inexistant')).toBe(false)
    })

    it('webcam sans configuration d’URLs est inactive même si le flag est vrai', async () => {
      const { features } = await withConfig({ webcam: null, features: { webcam: true } })
      expect(features.isFeatureEnabled('webcam')).toBe(false)
    })
  })

  describe('routes', () => {
    it('déclare toutes les routes quand tous les modules sont actifs', async () => {
      const { routes } = await withConfig({})
      const paths = childPaths(routes)
      expect(paths).toContain('webcam')
      expect(paths).toContain('station')
      expect(paths).toContain('rex-ffa')
      expect(paths).toContain('preparation')
      expect(paths).toContain('notifications')
    })

    it('retire les routes des modules désactivés', async () => {
      const { routes } = await withConfig({
        webcam: null,
        features: {
          webcam: false,
          station: false,
          thermal: false,
          rex: false,
          aircraft: false,
          notifications: false,
        },
      })
      const paths = childPaths(routes)
      expect(paths).not.toContain('webcam')
      expect(paths).not.toContain('station')
      expect(paths).not.toContain('stress-thermique')
      expect(paths).not.toContain('rex-ffa')
      expect(paths).not.toContain('rex-soumission')
      expect(paths).not.toContain('preparation')
      expect(paths).not.toContain('notifications')
      // Le socle (météo, NOTAM, AZBA, VAC, réglages) reste toujours présent
      expect(paths).toEqual(
        expect.arrayContaining(['', 'weather', 'notam', 'azba', 'vac', 'status']),
      )
    })

    it('ne laisse pas fuiter la propriété `feature` vers vue-router', async () => {
      const { routes } = await withConfig({})
      expect(routes[0].children.every((r) => !('feature' in r))).toBe(true)
    })
  })
})
