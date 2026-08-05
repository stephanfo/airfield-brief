import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useWeatherStore } from '@/stores/weatherStore'
import { useCache } from '@/composables/useCache'

// METAR favorable : vent faible dans l’axe, CAVOK.
const goodCurrent = {
  wind_direction: 250,
  wind_speed: 6,
  wind_gust: null,
  visibility: 9999,
  ceiling: 'CAVOK',
}

const payload = (current, isoNow = new Date().toISOString()) => ({ isoNow, current })

const mockFetch = (data) =>
  vi.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(data) }))

describe('weatherStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    useCache().clear()
    vi.clearAllMocks()
  })

  it('état initial : pas de Go/No-Go avant chargement', () => {
    global.fetch = mockFetch(payload(goodCurrent))
    const store = useWeatherStore()
    expect(store.goNoGoStatus).toBeNull()
    expect(store.generatedAt).toBeNull()
  })

  it('loadWeather renseigne generatedAt depuis isoNow', async () => {
    global.fetch = mockFetch(payload(goodCurrent, '2026-06-06T10:00:00Z'))
    const store = useWeatherStore()
    await store.loadWeather()
    expect(store.generatedAt).toBe('2026-06-06T10:00:00Z')
  })

  it('goNoGoStatus = good pour un METAR favorable', async () => {
    global.fetch = mockFetch(payload(goodCurrent))
    const store = useWeatherStore()
    await store.loadWeather()
    expect(store.goNoGoStatus.status).toBe('good')
    expect(store.goNoGoStatus.criteria).toHaveLength(5)
  })

  it('goNoGoStatus = poor quand le vent établi est fort', async () => {
    global.fetch = mockFetch(payload({ ...goodCurrent, wind_speed: 32 }))
    const store = useWeatherStore()
    await store.loadWeather()
    expect(store.goNoGoStatus.status).toBe('poor')
  })

  it('isWeatherStale vrai pour une donnée ancienne', async () => {
    global.fetch = mockFetch(payload(goodCurrent, '2020-01-01T00:00:00Z'))
    const store = useWeatherStore()
    await store.loadWeather()
    expect(store.isWeatherStale).toBe(true)
  })

  it('isWeatherStale faux pour une donnée fraîche', async () => {
    global.fetch = mockFetch(payload(goodCurrent))
    const store = useWeatherStore()
    await store.loadWeather()
    expect(store.isWeatherStale).toBe(false)
  })
})
