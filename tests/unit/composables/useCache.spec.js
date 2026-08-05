import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useCache } from '@/composables/useCache'

// useCache est un singleton module-level : on repart d'un cache vide à chaque test.
describe('useCache', () => {
  let cache

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-06T12:00:00Z'))
    cache = useCache()
    cache.clear()
  })

  afterEach(() => {
    cache.clear()
    vi.useRealTimers()
  })

  describe('get / set + TTL', () => {
    it('renvoie la donnée tant que le TTL n’est pas dépassé', () => {
      cache.set('k', { v: 1 }, 1000)
      expect(cache.get('k')).toEqual({ v: 1 })
      vi.advanceTimersByTime(500)
      expect(cache.get('k')).toEqual({ v: 1 })
    })

    it('renvoie null une fois le TTL expiré', () => {
      cache.set('k', { v: 1 }, 1000)
      vi.advanceTimersByTime(1001)
      expect(cache.get('k')).toBeNull()
    })

    it('renvoie null pour une clé absente', () => {
      expect(cache.get('absente')).toBeNull()
    })
  })

  describe('getAge / getTimestamp', () => {
    it('getAge = Infinity si clé absente, sinon âge en ms', () => {
      expect(cache.getAge('x')).toBe(Infinity)
      cache.set('x', 1, 1000)
      vi.advanceTimersByTime(300)
      expect(cache.getAge('x')).toBe(300)
    })

    it('getTimestamp renvoie l’instant de mise en cache', () => {
      cache.set('x', 1, 1000)
      expect(cache.getTimestamp('x')).toBe(Date.now())
      expect(cache.getTimestamp('absente')).toBeNull()
    })
  })

  describe('invalidate / invalidatePattern / clear', () => {
    it('invalidate supprime une entrée', () => {
      cache.set('k', 1, 1000)
      cache.invalidate('k')
      expect(cache.get('k')).toBeNull()
    })

    it('invalidatePattern supprime les clés correspondantes', () => {
      cache.set('notam:1', 1, 1000)
      cache.set('notam:2', 1, 1000)
      cache.set('weather', 1, 1000)
      cache.invalidatePattern('^notam:')
      expect(cache.get('notam:1')).toBeNull()
      expect(cache.get('notam:2')).toBeNull()
      expect(cache.get('weather')).toBe(1)
    })

    it('clear vide tout', () => {
      cache.set('a', 1, 1000)
      cache.set('b', 2, 1000)
      cache.clear()
      expect(cache.getStats().total).toBe(0)
    })
  })

  describe('cleanup', () => {
    it('ne supprime que les entrées expirées', () => {
      cache.set('frais', 1, 10_000)
      cache.set('perime', 2, 1000)
      vi.advanceTimersByTime(2000)
      cache.cleanup()
      expect(cache.get('frais')).toBe(1)
      expect(cache.getStats().total).toBe(1)
    })
  })

  describe('déduplication (pending requests)', () => {
    it('enregistre, détecte et restitue une requête en cours', () => {
      expect(cache.hasPendingRequest('k')).toBeFalsy()
      const p = Promise.resolve('done')
      cache.setPendingRequest('k', p, 1000)
      expect(cache.hasPendingRequest('k')).toBe(true)
      expect(cache.getPendingRequest('k')).toBe(p)
    })

    it('set() efface la requête en cours', () => {
      cache.setPendingRequest('k', Promise.resolve(), 1000)
      cache.set('k', 42, 1000)
      expect(cache.hasPendingRequest('k')).toBeFalsy()
    })
  })

  describe('getStats', () => {
    it('compte total / valides / expirées', () => {
      cache.set('a', 1, 10_000)
      cache.set('b', 2, 1000)
      vi.advanceTimersByTime(2000)
      const stats = cache.getStats()
      expect(stats.total).toBe(2)
      expect(stats.valid).toBe(1)
      expect(stats.expired).toBe(1)
    })
  })
})
