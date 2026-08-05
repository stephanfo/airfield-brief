import { describe, it, expect } from 'vitest'
import { STORAGE_KEYS, DATA_CACHE_PREFIX, storageKey } from '@/config/storageKeys'
import { STORAGE_KEYS as REEXPORTED } from '@/config/constants'
import { CLUB_CONFIG } from '@/config/club.config'

/**
 * Les clés localStorage doivent toutes porter le préfixe du club (ADR-030) :
 * c'est ce qui évite qu'un fork servi depuis la même origine écrase les
 * préférences d'un autre, et ce qui sort le nom du club du stockage.
 */
describe('storageKeys', () => {
  const prefix = `${CLUB_CONFIG.storagePrefix}-`

  it('storageKey préfixe le nom logique', () => {
    expect(storageKey('exemple')).toBe(`${prefix}exemple`)
  })

  it('toutes les clés statiques sont préfixées', () => {
    const keys = Object.values(STORAGE_KEYS)
    expect(keys.length).toBeGreaterThan(0)
    keys.forEach((key) => expect(key.startsWith(prefix)).toBe(true))
  })

  it('le préfixe du cache de données est préfixé lui aussi', () => {
    expect(DATA_CACHE_PREFIX.startsWith(prefix)).toBe(true)
  })

  it('aucune clé ne réutilise le même nom qu’une autre', () => {
    const keys = Object.values(STORAGE_KEYS)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('constants.js ré-exporte bien le même registre (pas de copie divergente)', () => {
    expect(REEXPORTED).toBe(STORAGE_KEYS)
  })
})
