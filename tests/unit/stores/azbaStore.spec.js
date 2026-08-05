import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAzbaStore } from '@/stores/azbaStore'
import { useCache } from '@/composables/useCache'

// R149E et R57 sont prioritaires (AZBA_CONFIG.priorityZones) ; R42 non.
const payload = {
  generatedAt: '2026-06-10T08:00:00Z',
  zones: [
    { name: 'R149E', status: 'active' },
    { name: 'R57', status: 'inactive' },
    { name: 'R42', status: 'active' },
  ],
}

const mockFetch = (data) =>
  vi.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(data) }))

describe('azbaStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    useCache().clear()
    vi.clearAllMocks()
  })

  it('état initial : aucune zone avant chargement', () => {
    global.fetch = mockFetch(payload)
    const store = useAzbaStore()
    expect(store.zones).toEqual([])
    expect(store.generatedAt).toBeNull()
  })

  it('loadAzba expose les zones et generatedAt', async () => {
    global.fetch = mockFetch(payload)
    const store = useAzbaStore()
    await store.loadAzba()
    expect(store.zones).toHaveLength(3)
    expect(store.generatedAt).toBe('2026-06-10T08:00:00Z')
  })

  it('sépare zones prioritaires et autres zones', async () => {
    global.fetch = mockFetch(payload)
    const store = useAzbaStore()
    await store.loadAzba()
    expect(store.priorityZones.map((z) => z.name)).toEqual(['R149E', 'R57'])
    expect(store.otherZones.map((z) => z.name)).toEqual(['R42'])
  })

  it('compte les zones actives', async () => {
    global.fetch = mockFetch(payload)
    const store = useAzbaStore()
    await store.loadAzba()
    expect(store.activeZonesCount).toBe(2)
  })

  it('getZone retrouve une zone par nom', async () => {
    global.fetch = mockFetch(payload)
    const store = useAzbaStore()
    await store.loadAzba()
    expect(store.getZone('R57').status).toBe('inactive')
    expect(store.getZone('INCONNUE')).toBeUndefined()
  })

  it('reste vide (sans planter) si le JSON ne contient pas de zones', async () => {
    global.fetch = mockFetch({ generatedAt: '2026-06-10T08:00:00Z' })
    const store = useAzbaStore()
    await store.loadAzba()
    expect(store.zones).toEqual([])
    expect(store.activeZonesCount).toBe(0)
  })
})
