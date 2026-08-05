import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Notify } from 'quasar'
import { useDataFetcher } from '@/composables/useDataFetcher'
import { useCache } from '@/composables/useCache'

// Réponse fetch factice
const okResponse = (data) => ({ ok: true, status: 200, json: () => Promise.resolve(data) })
const httpError = (status) => ({ ok: false, status, json: () => Promise.resolve(null) })

describe('useDataFetcher', () => {
  beforeEach(() => {
    useCache().clear()
    vi.clearAllMocks()
    global.fetch = vi.fn(() => Promise.resolve(okResponse({ value: 1 })))
  })

  it('charge les données et met à jour data / loading / lastFetchedAt', async () => {
    const { data, loading, error, fetchData, lastFetchedAt } = useDataFetcher('./data/test.json')
    const result = await fetchData()
    expect(result).toEqual({ value: 1 })
    expect(data.value).toEqual({ value: 1 })
    expect(loading.value).toBe(false)
    expect(error.value).toBeNull()
    expect(lastFetchedAt.value).toBeTypeOf('number')
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('sert le cache au second appel sans requête réseau', async () => {
    const f = useDataFetcher('./data/cache.json')
    await f.fetchData()
    await f.fetchData()
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('déduplique deux appels concurrents en une seule requête', async () => {
    let resolveFetch
    global.fetch = vi.fn(
      () => new Promise((res) => (resolveFetch = () => res(okResponse({ value: 9 })))),
    )
    const f = useDataFetcher('./data/dedup.json')
    const p1 = f.fetchData()
    const p2 = f.fetchData()
    resolveFetch()
    const [r1, r2] = await Promise.all([p1, p2])
    expect(r1).toEqual({ value: 9 })
    expect(r2).toEqual({ value: 9 })
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('refetch force une nouvelle requête malgré le cache', async () => {
    const f = useDataFetcher('./data/refetch.json')
    await f.fetchData()
    await f.refetch()
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('invalidate force un retour au réseau', async () => {
    const f = useDataFetcher('./data/invalidate.json')
    await f.fetchData()
    f.invalidate()
    await f.fetchData()
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('propage l’erreur HTTP et renseigne error.value', async () => {
    global.fetch = vi.fn(() => Promise.resolve(httpError(500)))
    const f = useDataFetcher('./data/err.json')
    await expect(f.fetchData()).rejects.toThrow('HTTP 500')
    expect(f.error.value).toBe('HTTP 500')
    expect(f.loading.value).toBe(false)
  })

  it('notifie l’utilisateur si l’échec survient sans donnée en cache', async () => {
    global.fetch = vi.fn(() => Promise.reject(new Error('network down')))
    const f = useDataFetcher('./data/notify.json', { errorLabel: 'météo' })
    await expect(f.fetchData()).rejects.toThrow('network down')
    expect(Notify.create).toHaveBeenCalledTimes(1)
  })

  it('stale-while-revalidate : sert le cache et revalide en arrière-plan', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-06T12:00:00Z'))
    const f = useDataFetcher('./data/swr.json', { ttl: 1000, staleWhileRevalidate: true })
    await f.fetchData() // fetch #1, cache à t0
    vi.advanceTimersByTime(600) // > 50% du TTL
    const cached = await f.fetchData() // sert le cache + déclenche revalidation bg
    expect(cached).toEqual({ value: 1 })
    await vi.advanceTimersByTimeAsync(0)
    expect(fetch).toHaveBeenCalledTimes(2)
    vi.useRealTimers()
  })
})
