import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useWebcamStore } from '@/stores/webcamStore'
import { useCache } from '@/composables/useCache'
import { WEBCAM_CONFIG } from '@/config/app.config'

const baseTs = 1_749_672_000 // epoch (s) de référence

const makePayload = (overrides = {}) => ({
  now: baseTs + 60,
  last_ts: baseTs + 30,
  count: 2,
  images: [
    { url: 'snap/2026/06/11/acpa_01_a.jpg', ts: baseTs, time: '19:00:00' },
    { url: 'snap/2026/06/11/acpa_01_b.jpg', ts: baseTs + 30, time: '19:00:30' },
  ],
  ...overrides,
})

const mockFetch = (data) =>
  vi.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(data) }))

describe('webcamStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    useCache().clear()
    vi.clearAllMocks()
  })

  it('état initial : aucune image avant chargement', () => {
    global.fetch = mockFetch(makePayload())
    const store = useWebcamStore()
    expect(store.images).toEqual([])
    expect(store.lastTs).toBeNull()
    expect(store.lastImageAt).toBeNull()
  })

  it('loadImages expose les images et lastTs', async () => {
    global.fetch = mockFetch(makePayload())
    const store = useWebcamStore()
    await store.loadImages()
    expect(store.images).toHaveLength(2)
    expect(store.lastTs).toBe(baseTs + 30)
  })

  it('lastImageAt = ISO dérivé de last_ts', async () => {
    global.fetch = mockFetch(makePayload())
    const store = useWebcamStore()
    await store.loadImages()
    expect(store.lastImageAt).toBe(new Date((baseTs + 30) * 1000).toISOString())
  })

  it('préfixe les url relatives avec WEBCAM_CONFIG.baseUrl', async () => {
    global.fetch = mockFetch(makePayload())
    const store = useWebcamStore()
    await store.loadImages()
    expect(store.images[0].url).toBe(`${WEBCAM_CONFIG.baseUrl}snap/2026/06/11/acpa_01_a.jpg`)
  })

  it('laisse intactes les url déjà absolues', async () => {
    global.fetch = mockFetch(
      makePayload({
        images: [{ url: 'https://cdn.example/x.jpg', ts: baseTs, time: '19:00:00' }],
      }),
    )
    const store = useWebcamStore()
    await store.loadImages()
    expect(store.images[0].url).toBe('https://cdn.example/x.jpg')
  })

  it('reste vide (sans planter) si le JSON ne contient pas d images', async () => {
    global.fetch = mockFetch({ now: baseTs, last_ts: null, count: 0 })
    const store = useWebcamStore()
    await store.loadImages()
    expect(store.images).toEqual([])
    expect(store.lastImageAt).toBeNull()
  })
})
