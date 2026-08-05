import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  parseCoordinates,
  radiusToMeters,
  formatCategoryName,
  getValidityState,
  matchesValidityFilter,
  matchesTrafficFilter,
  matchesFlRange,
  formatQLineDetails,
  hasValidCoordinates,
  needsFranceZoom,
} from '@/utils/notamHelpers'

describe('notamHelpers', () => {
  describe('parseCoordinates', () => {
    it('renvoie null pour une entrée invalide', () => {
      expect(parseCoordinates(null)).toBeNull()
      expect(parseCoordinates(42)).toBeNull()
      expect(parseCoordinates('pas-des-coords')).toBeNull()
    })

    it('parse "4724N00111W" (proche LFFI) en décimal', () => {
      const { lat, lon } = parseCoordinates('4724N00111W')
      expect(lat).toBeCloseTo(47.4, 3)
      expect(lon).toBeCloseTo(-1.18333, 3)
    })

    it('gère les hémisphères Sud et Est', () => {
      const { lat, lon } = parseCoordinates('3330S15100E')
      expect(lat).toBeCloseTo(-33.5, 3)
      expect(lon).toBeCloseTo(151.0, 3)
    })
  })

  describe('radiusToMeters', () => {
    it('convertit les NM en mètres', () => {
      expect(radiusToMeters(1)).toBe(1852)
      expect(radiusToMeters(5)).toBe(9260)
    })
  })

  describe('formatCategoryName', () => {
    it('traduit une clé connue', () => {
      expect(formatCategoryName('obstacles')).toBe('Obstacles')
    })

    it('renvoie la clé brute si inconnue', () => {
      expect(formatCategoryName('cle_inconnue')).toBe('cle_inconnue')
    })
  })

  describe('getValidityState', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-06-06T12:00:00Z'))
    })
    afterEach(() => vi.useRealTimers())

    it('unknown sans startValidity', () => {
      expect(getValidityState(null)).toBe('unknown')
      expect(getValidityState({})).toBe('unknown')
    })

    it('current entre start et end', () => {
      expect(
        getValidityState({
          startValidity: '2026-06-01T00:00:00Z',
          endValidity: '2026-06-30T00:00:00Z',
        }),
      ).toBe('current')
    })

    it('traite PERM comme un end très lointain (current)', () => {
      expect(getValidityState({ startValidity: '2026-01-01T00:00:00Z', endValidity: 'PERM' })).toBe(
        'current',
      )
    })

    it('future si start à venir', () => {
      expect(getValidityState({ startValidity: '2026-07-01T00:00:00Z' })).toBe('future')
    })

    it('expired si end passé', () => {
      expect(
        getValidityState({
          startValidity: '2026-05-01T00:00:00Z',
          endValidity: '2026-05-10T00:00:00Z',
        }),
      ).toBe('expired')
    })
  })

  describe('matchesValidityFilter', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-06-06T12:00:00Z'))
    })
    afterEach(() => vi.useRealTimers())

    const current = {
      startValidity: '2026-06-01T00:00:00Z',
      endValidity: '2026-06-30T00:00:00Z',
    }
    const future = { startValidity: '2026-07-01T00:00:00Z' }

    it("'all' accepte tout", () => {
      expect(matchesValidityFilter(current, 'all')).toBe(true)
      expect(matchesValidityFilter(future, 'all')).toBe(true)
    })

    it("'current' ne garde que les NOTAMs en cours", () => {
      expect(matchesValidityFilter(current, 'current')).toBe(true)
      expect(matchesValidityFilter(future, 'current')).toBe(false)
    })

    it("'future' ne garde que les NOTAMs à venir", () => {
      expect(matchesValidityFilter(future, 'future')).toBe(true)
      expect(matchesValidityFilter(current, 'future')).toBe(false)
    })
  })

  describe('matchesTrafficFilter', () => {
    it("'all' accepte tout", () => {
      expect(matchesTrafficFilter({ qLine: { traffic: 'I' } }, 'all')).toBe(true)
    })

    it('conserve les NOTAMs sans qLine ou sans traffic', () => {
      expect(matchesTrafficFilter({}, 'vfr')).toBe(true)
      expect(matchesTrafficFilter({ qLine: {} }, 'ifr')).toBe(true)
    })

    it("'vfr' garde V et IV mais pas I", () => {
      expect(matchesTrafficFilter({ qLine: { traffic: 'V' } }, 'vfr')).toBe(true)
      expect(matchesTrafficFilter({ qLine: { traffic: 'IV' } }, 'vfr')).toBe(true)
      expect(matchesTrafficFilter({ qLine: { traffic: 'I' } }, 'vfr')).toBe(false)
    })

    it("'ifr' garde I et IV mais pas V", () => {
      expect(matchesTrafficFilter({ qLine: { traffic: 'I' } }, 'ifr')).toBe(true)
      expect(matchesTrafficFilter({ qLine: { traffic: 'IV' } }, 'ifr')).toBe(true)
      expect(matchesTrafficFilter({ qLine: { traffic: 'V' } }, 'ifr')).toBe(false)
    })
  })

  describe('matchesFlRange', () => {
    it('conserve les NOTAMs sans qLine', () => {
      expect(matchesFlRange({}, { min: 0, max: 50 })).toBe(true)
    })

    it('garde un NOTAM dont la tranche chevauche la plage', () => {
      expect(matchesFlRange({ qLine: { lower: 10, upper: 40 } }, { min: 30, max: 60 })).toBe(true)
    })

    it('exclut un NOTAM entièrement au-dessus de la plage', () => {
      expect(matchesFlRange({ qLine: { lower: 70, upper: 90 } }, { min: 0, max: 50 })).toBe(false)
    })

    it('exclut un NOTAM entièrement en dessous de la plage', () => {
      expect(matchesFlRange({ qLine: { lower: 0, upper: 10 } }, { min: 20, max: 50 })).toBe(false)
    })

    it('max à 100 = illimité (garde les tranches hautes)', () => {
      expect(matchesFlRange({ qLine: { lower: 200, upper: 999 } }, { min: 0, max: 100 })).toBe(true)
    })
  })

  describe('formatQLineDetails', () => {
    it('renvoie {} sans qLine', () => {
      expect(formatQLineDetails(null)).toEqual({})
    })

    it('mappe les codes et compose l’altitude', () => {
      const out = formatQLineDetails({
        code23: 'FA',
        traffic: 'IV',
        purpose: 'BO',
        scope: 'A',
        lower: 0,
        upper: 50,
        fir: 'LFRR',
      })
      expect(out.subject).toBe('Aérodrome')
      expect(out.traffic).toBe('IFR et VFR')
      expect(out.purpose).toBe('Briefing obligatoire')
      expect(out.scope).toBe('Aérodrome')
      expect(out.altitude).toBe('0 - 50 FL')
      expect(out.fir).toBe('LFRR')
    })

    it('défaut altitude 0 - 999 FL si bornes absentes', () => {
      expect(formatQLineDetails({ code23: 'FA' }).altitude).toBe('0 - 999 FL')
    })
  })

  describe('hasValidCoordinates / needsFranceZoom', () => {
    it('hasValidCoordinates reflète parseCoordinates', () => {
      expect(hasValidCoordinates({ coordinates: '4724N00111W' })).toBe(true)
      expect(hasValidCoordinates({ coordinates: 'xxx' })).toBe(false)
      expect(hasValidCoordinates({})).toBe(false)
    })

    it('needsFranceZoom au-delà de 200 NM', () => {
      expect(needsFranceZoom(201)).toBe(true)
      expect(needsFranceZoom(200)).toBe(false)
    })
  })
})
