import { describe, it, expect } from 'vitest'
import { useLocalStorageSet } from '@/composables/useLocalStorageSet'
import { useHiddenNotams } from '@/composables/useHiddenNotams'
import { useSeenNotams } from '@/composables/useSeenNotams'

const days = (n) => n * 24 * 60 * 60 * 1000

// localStorage est vidé avant chaque test (tests/setup.js).
describe('useLocalStorageSet', () => {
  it('add / has / getIds / count sur une entrée permanente', () => {
    const s = useLocalStorageSet('test:perm')
    s.add('A')
    expect(s.has('A')).toBe(true)
    expect(s.has('inconnu')).toBe(false)
    expect(s.getIds()).toEqual(['A'])
    expect(s.count.value).toBe(1)
  })

  it('persiste dans localStorage à l’ajout', () => {
    const s = useLocalStorageSet('test:persist')
    s.add('A')
    const stored = JSON.parse(localStorage.getItem('test:persist'))
    expect(stored.A).toBeDefined()
    expect(stored.A.addedAt).toBeTypeOf('string')
  })

  it('entrée temporaire : pose expiresAt = endValidity + N jours', () => {
    const s = useLocalStorageSet('test:temp', 7)
    const end = new Date('2026-06-10T00:00:00Z').toISOString()
    s.add('A', end)
    const expected = new Date(new Date(end).getTime() + days(7)).toISOString()
    expect(s.items.value.A.expiresAt).toBe(expected)
  })

  it('PERM : pas d’expiresAt, toujours valide', () => {
    const s = useLocalStorageSet('test:permval')
    s.add('A', 'PERM')
    expect(s.items.value.A.expiresAt).toBeUndefined()
    expect(s.has('A')).toBe(true)
  })

  it('has = false et exclusion du count pour une entrée expirée', () => {
    const s = useLocalStorageSet('test:expired', 7)
    const pastEnd = new Date(Date.now() - days(10)).toISOString() // expiresAt = now-3j
    s.add('A', pastEnd)
    expect(s.has('A')).toBe(false)
    expect(s.count.value).toBe(0)
    expect(s.rawCount.value).toBe(1)
  })

  it('remove supprime l’entrée', () => {
    const s = useLocalStorageSet('test:remove')
    s.add('A')
    s.remove('A')
    expect(s.has('A')).toBe(false)
  })

  it('cleanupExpired purge les entrées expirées et persiste', () => {
    const s = useLocalStorageSet('test:cleanup', 7)
    s.add('frais', 'PERM')
    s.add('vieux', new Date(Date.now() - days(10)).toISOString())
    s.cleanupExpired()
    expect(s.getIds()).toEqual(['frais'])
    expect(JSON.parse(localStorage.getItem('test:cleanup')).vieux).toBeUndefined()
  })

  it('pruneStale supprime les ids absents des données valides', () => {
    const s = useLocalStorageSet('test:prune')
    s.add('A')
    s.add('B')
    s.add('C')
    s.pruneStale(['A', 'C'])
    expect(s.getIds().sort()).toEqual(['A', 'C'])
  })

  it('clear vide tout et persiste', () => {
    const s = useLocalStorageSet('test:clear')
    s.add('A')
    s.clear()
    expect(s.getIds()).toEqual([])
    expect(JSON.parse(localStorage.getItem('test:clear'))).toEqual({})
  })

  it('charge l’état existant de localStorage à la construction', () => {
    localStorage.setItem('test:load', JSON.stringify({ X: { addedAt: '2026-01-01T00:00:00Z' } }))
    const s = useLocalStorageSet('test:load')
    expect(s.has('X')).toBe(true)
  })
})

describe('useHiddenNotams (wrapper)', () => {
  it('expose l’API attendue et fait un aller-retour hide/unhide', () => {
    const h = useHiddenNotams()
    h.clearAllHidden()
    expect(h.isHidden('N1')).toBe(false)
    h.hideNotam('N1', 'PERM')
    expect(h.isHidden('N1')).toBe(true)
    h.unhideNotam('N1')
    expect(h.isHidden('N1')).toBe(false)
  })
})

describe('useSeenNotams (wrapper)', () => {
  it('markAsSeen rend isNew=false ; ids inconnus restent nouveaux', () => {
    const s = useSeenNotams()
    const id = `SEEN-${Date.now()}`
    expect(s.isNew(id)).toBe(true)
    s.markAsSeen(id, 'PERM')
    expect(s.isNew(id)).toBe(false)
    expect(s.isNew(null)).toBe(false) // garde : id falsy → pas "nouveau"
  })
})
