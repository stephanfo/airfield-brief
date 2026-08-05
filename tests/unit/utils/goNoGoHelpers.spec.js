import { describe, it, expect } from 'vitest'
import {
  evaluateGoNoGo,
  criterionIcon,
  criterionLevelColor,
  criterionLevelLabel,
  goNoGoMeta,
} from '@/utils/goNoGoHelpers'
import { VFR_THRESHOLDS_DEFAULTS as T } from '@/config/app.config'

describe('goNoGoHelpers', () => {
  describe('evaluateGoNoGo', () => {
    it('conditions favorables = GO (status good), 5 critères', () => {
      const { status, criteria } = evaluateGoNoGo(
        { windDir: 250, windSpeed: 8, windGust: null, visibility: 9999, ceiling: 'CAVOK' },
        T,
      )
      expect(status).toBe('good')
      expect(criteria).toHaveLength(5)
      expect(criteria.find((c) => c.key === 'crosswind').value).toBe(0)
    })

    it('vent établi fort = status poor', () => {
      const { status } = evaluateGoNoGo(
        { windDir: 250, windSpeed: 30, visibility: 9999, ceiling: 'CAVOK' },
        T,
      )
      expect(status).toBe('poor')
    })

    it('vent traversier modéré (340°/12kt) = critère crosswind marginal', () => {
      const { criteria } = evaluateGoNoGo(
        { windDir: 340, windSpeed: 12, visibility: 9999, ceiling: 'CAVOK' },
        T,
      )
      const xwind = criteria.find((c) => c.key === 'crosswind')
      expect(xwind.value).toBe(12)
      expect(xwind.level).toBe('marginal')
    })

    it('plafond bas (BKN004) tire le statut vers poor', () => {
      const { status, criteria } = evaluateGoNoGo(
        { windDir: 250, windSpeed: 5, visibility: 9999, ceiling: 'BKN004' },
        T,
      )
      expect(criteria.find((c) => c.key === 'ceiling').value).toBe(400)
      expect(status).toBe('poor')
    })
  })

  describe('goNoGoMeta', () => {
    it('mappe le statut vers le libellé pilote', () => {
      expect(goNoGoMeta('good')).toMatchObject({ label: 'GO', color: 'positive' })
      expect(goNoGoMeta('marginal')).toMatchObject({ label: 'CAUTION', color: 'warning' })
      expect(goNoGoMeta('poor')).toMatchObject({ label: 'NO-GO', color: 'negative' })
    })

    it('statut inconnu → fallback CAUTION', () => {
      expect(goNoGoMeta('???')).toMatchObject({ label: 'CAUTION' })
    })
  })

  describe('helpers critères', () => {
    it('icône, couleur et label par critère/niveau', () => {
      expect(criterionIcon('crosswind')).toBe('swap_horiz')
      expect(criterionIcon('inconnu')).toBe('circle')
      expect(criterionLevelColor('poor')).toBe('negative')
      expect(criterionLevelLabel('good')).toBe('VFR')
    })
  })
})
