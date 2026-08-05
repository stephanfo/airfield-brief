import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useNotamStore } from '@/stores/notamStore'
import { useCache } from '@/composables/useCache'

const PAYLOAD = {
  generatedAt: '2026-06-06T10:00:00Z',
  notamList: [{ id: 'A1234/26' }, { id: 'A5678/26' }],
}

describe('notamStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    useCache().clear()
    vi.clearAllMocks()
    global.fetch = vi.fn(() =>
      Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(PAYLOAD) }),
    )
  })

  it('état initial : listes nulles, pas de chargement', () => {
    const store = useNotamStore()
    expect(store.notamList).toBeNull()
    expect(store.generatedAt).toBeNull()
    expect(store.loading).toBe(false)
  })

  it('loadNotams hydrate notamList et generatedAt depuis le JSON', async () => {
    const store = useNotamStore()
    await store.loadNotams()
    expect(store.notamList).toHaveLength(2)
    expect(store.generatedAt).toBe('2026-06-06T10:00:00Z')
    expect(store.loading).toBe(false)
  })

  it('notamList reste null si le JSON ne contient pas le champ', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ autre: true }) }),
    )
    const store = useNotamStore()
    await store.loadNotams()
    expect(store.notamList).toBeNull()
  })

  it('forceRefresh relance une requête réseau', async () => {
    const store = useNotamStore()
    await store.loadNotams()
    await store.forceRefresh()
    expect(fetch).toHaveBeenCalledTimes(2)
  })
})
