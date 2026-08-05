import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useStationStore } from '@/stores/stationStore'
import { useStationWindCurrentStore } from '@/stores/stationWindCurrentStore'
import { useStationWindHistoryStore } from '@/stores/stationWindHistoryStore'
import { useStationAtmosphereStore } from '@/stores/stationAtmosphereStore'
import { useCache } from '@/composables/useCache'

const windCurrentData = { generatedAt: '2026-06-10T08:00:00Z', speed: 8, direction: 240 }
const windHistoryData = {
  generatedAt: '2026-06-10T08:00:00Z',
  '24h_history': [{ t: 1 }, { t: 2 }],
  wind_rose: [{ dir: 'N', pct: 10 }],
}
const atmosphereData = {
  generatedAt: '2026-06-10T08:00:00Z',
  atmosphere: [{ temp: 12 }, { temp: 14 }],
}

/** Mock fetch qui répond selon l'endpoint demandé. */
const mockFetchByUrl = () =>
  vi.fn((url) => {
    const byUrl = {
      wind_current: windCurrentData,
      wind_history: windHistoryData,
      atmosphere: atmosphereData,
    }
    const key = Object.keys(byUrl).find((k) => String(url).includes(k))
    if (!key) return Promise.resolve({ ok: false, status: 404 })
    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(byUrl[key]) })
  })

describe('stationStore (orchestrateur)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    useCache().clear()
    vi.clearAllMocks()
  })

  it('loadStation charge les 3 sources en parallèle', async () => {
    global.fetch = mockFetchByUrl()
    const station = useStationStore()
    await station.loadStation()

    const windCurrent = useStationWindCurrentStore()
    const windHistory = useStationWindHistoryStore()
    const atmosphere = useStationAtmosphereStore()

    expect(windCurrent.windCurrent.speed).toBe(8)
    expect(windHistory.windHistory24h).toHaveLength(2)
    expect(windHistory.windRose).toHaveLength(1)
    expect(atmosphere.atmosphereHistory).toHaveLength(2)
    expect(global.fetch).toHaveBeenCalledTimes(3)
  })

  it('latestAtmosphere renvoie la dernière mesure', async () => {
    global.fetch = mockFetchByUrl()
    const station = useStationStore()
    await station.loadStation()

    const atmosphere = useStationAtmosphereStore()
    expect(atmosphere.latestAtmosphere).toEqual({ temp: 14 })
  })

  it('generatedAt est résolu sur chaque sous-store', async () => {
    global.fetch = mockFetchByUrl()
    const station = useStationStore()
    await station.loadStation()

    expect(useStationWindCurrentStore().generatedAt).toBe('2026-06-10T08:00:00Z')
    expect(useStationWindHistoryStore().generatedAt).toBe('2026-06-10T08:00:00Z')
    expect(useStationAtmosphereStore().generatedAt).toBe('2026-06-10T08:00:00Z')
  })

  it('forceRefresh relance les 3 fetchs même avec un cache chaud', async () => {
    global.fetch = mockFetchByUrl()
    const station = useStationStore()
    await station.loadStation()
    expect(global.fetch).toHaveBeenCalledTimes(3)

    await station.forceRefresh()
    expect(global.fetch).toHaveBeenCalledTimes(6)
  })

  it('loadStation réutilise le cache au second appel', async () => {
    global.fetch = mockFetchByUrl()
    const station = useStationStore()
    await station.loadStation()
    await station.loadStation()
    // Cache TTL non expiré : pas de nouveau fetch
    expect(global.fetch).toHaveBeenCalledTimes(3)
  })
})
