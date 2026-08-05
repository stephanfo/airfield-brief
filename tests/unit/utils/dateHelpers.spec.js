import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  getUpdateClass,
  resolveUpdateTimestamp,
  parseCustomDate,
  formatDateUTC,
  formatDate,
  formatDateOnly,
  getChartStateLabel,
  getChartStatusClass,
  formatTimeAgo,
} from '@/utils/dateHelpers'

const NOW = new Date('2026-06-06T12:00:00Z')

describe('dateHelpers', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })

  describe('getUpdateClass', () => {
    it('chaîne vide si pas de date', () => {
      expect(getUpdateClass(null)).toBe('')
    })

    it('marque obsolète au-delà du seuil (défaut 2h)', () => {
      const old = new Date(NOW.getTime() - 3 * 3600_000).toISOString()
      expect(getUpdateClass(old)).toBe('bg-warning q-px-sm q-ml-xs')
    })

    it('reste vide sous le seuil', () => {
      const recent = new Date(NOW.getTime() - 1 * 3600_000).toISOString()
      expect(getUpdateClass(recent)).toBe('')
    })
  })

  describe('resolveUpdateTimestamp', () => {
    it('renvoie null pour une entrée non-objet', () => {
      expect(resolveUpdateTimestamp(null)).toBeNull()
      expect(resolveUpdateTimestamp('x')).toBeNull()
    })

    it('prend le premier champ présent par ordre de priorité', () => {
      expect(resolveUpdateTimestamp({ updatedAt: 'b', generatedAt: 'a' })).toBe('a')
      expect(resolveUpdateTimestamp({ isoNow: 'i' })).toBe('i')
    })

    it('ignore les chaînes vides', () => {
      expect(resolveUpdateTimestamp({ generatedAt: '', updatedAt: 'u' })).toBe('u')
    })
  })

  describe('parseCustomDate', () => {
    it('parse "DD MM YYYY HH:mm" en UTC', () => {
      const d = parseCustomDate('31 12 2025 09:00')
      expect(d.getUTCFullYear()).toBe(2025)
      expect(d.getUTCMonth()).toBe(11)
      expect(d.getUTCDate()).toBe(31)
      expect(d.getUTCHours()).toBe(9)
    })
  })

  describe('formatDate / formatDateUTC / formatDateOnly', () => {
    it('formatDateUTC formate sur le fuseau UTC (composants présents)', () => {
      // Assertions indépendantes de l'ordre/séparateur locale (robustes small-ICU) :
      // on vérifie que les bons composants numériques sortent, pas leur agencement.
      const out = formatDateUTC('31 12 2025 09:00')
      expect(out).toContain('31')
      expect(out).toContain('12')
      expect(out).toContain('2025')
      expect(out).toContain('09:00')
    })

    it('formatDate / formatDateOnly renvoient "" sans entrée', () => {
      expect(formatDate('')).toBe('')
      expect(formatDateOnly(null)).toBe('')
    })
  })

  describe('getChartStateLabel / getChartStatusClass', () => {
    it('Courant quand now ∈ [date, expiration]', () => {
      const item = { date: '01 06 2026 00:00', expiration: '10 06 2026 00:00' }
      expect(getChartStateLabel(item)).toBe('Courant')
      expect(getChartStatusClass(item)).toBe('courant')
    })

    it('Périmé quand expiration passée', () => {
      const item = { date: '01 05 2026 00:00', expiration: '02 05 2026 00:00' }
      expect(getChartStateLabel(item)).toBe('Périmé')
      expect(getChartStatusClass(item)).toBe('perime')
    })

    it('Futur quand date à venir', () => {
      const item = { date: '01 07 2026 00:00', expiration: '02 07 2026 00:00' }
      expect(getChartStateLabel(item)).toBe('Futur')
      expect(getChartStatusClass(item)).toBe('futur')
    })
  })

  describe('formatTimeAgo', () => {
    const ago = (ms) => new Date(NOW.getTime() - ms).toISOString()

    it('renvoie "" sans date', () => {
      expect(formatTimeAgo(null)).toBe('')
    })

    it('humanise l’écart relatif (fr) avec singulier/pluriel', () => {
      expect(formatTimeAgo(ago(20 * 1000))).toBe("à l'instant")
      expect(formatTimeAgo(ago(1 * 60_000))).toBe('il y a 1 minute')
      expect(formatTimeAgo(ago(5 * 60_000))).toBe('il y a 5 minutes')
      expect(formatTimeAgo(ago(2 * 3600_000))).toBe('il y a 2 heures')
      expect(formatTimeAgo(ago(1 * 86_400_000))).toBe('il y a 1 jour')
      expect(formatTimeAgo(ago(3 * 86_400_000))).toBe('il y a 3 jours')
    })
  })
})
