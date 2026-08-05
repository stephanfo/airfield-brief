import { describe, it, expect } from 'vitest'
import {
  RUNWAY_HEADING,
  calculateWindComponents,
  getActiveRunway,
  worstCrosswind,
} from '@/utils/windHelpers'
import { CLUB_CONFIG } from '@/config/club.config'

// Calculs sécurité-critiques : composantes de vent par rapport à l'axe de piste.
// Les cas ci-dessous passent le cap explicitement (250° → QFU 25/07) pour rester
// valides quelle que soit l'identité configurée (ADR-030) ; le câblage de la
// constante sur la config est vérifié séparément juste en dessous.
const RWY = 250

describe('windHelpers', () => {
  it("RUNWAY_HEADING provient de l'identité club (ADR-030)", () => {
    expect(RUNWAY_HEADING).toBe(CLUB_CONFIG.airfield.runwayHeading)
  })

  describe('calculateWindComponents', () => {
    it('renvoie des composantes nulles si direction ou vitesse manque', () => {
      expect(calculateWindComponents(null, 10, RWY)).toEqual({
        headwind: 0,
        crosswind: 0,
        crosswindSide: 0,
      })
      expect(calculateWindComponents(250, null, RWY)).toEqual({
        headwind: 0,
        crosswind: 0,
        crosswindSide: 0,
      })
    })

    it('vent pile dans l’axe (250°) = full headwind, pas de traversier', () => {
      const { headwind, crosswind } = calculateWindComponents(250, 12, RWY)
      expect(headwind).toBe(12)
      expect(crosswind).toBe(0)
    })

    it('vent plein arrière (070°) = headwind négatif', () => {
      const { headwind, crosswind } = calculateWindComponents(70, 12, RWY)
      expect(headwind).toBe(-12)
      expect(crosswind).toBe(0)
    })

    it('vent à 90° par la droite (340°) = full crosswind côté droit', () => {
      const { headwind, crosswind, crosswindSide } = calculateWindComponents(340, 10, RWY)
      expect(headwind).toBe(0)
      expect(crosswind).toBe(10)
      expect(crosswindSide).toBe(1)
    })

    it('vent à 90° par la gauche (160°) = full crosswind côté gauche', () => {
      const { crosswind, crosswindSide } = calculateWindComponents(160, 10, RWY)
      expect(crosswind).toBe(10)
      expect(crosswindSide).toBe(-1)
    })

    it('décompose un vent à 45° (295°) en headwind + crosswind égaux', () => {
      const { headwind, crosswind } = calculateWindComponents(295, 10, RWY)
      // cos(45°)=sin(45°)≈0.707 → ~7 chacun
      expect(headwind).toBe(7)
      expect(crosswind).toBe(7)
    })

    it('accepte un cap de piste custom', () => {
      const { headwind } = calculateWindComponents(70, 10, 70)
      expect(headwind).toBe(10)
    })
  })

  describe('getActiveRunway', () => {
    it('renvoie 25 quand le vent vient de face', () => {
      expect(getActiveRunway(8, RWY)).toBe('25')
    })

    it('renvoie 07 quand le headwind est négatif ou nul', () => {
      expect(getActiveRunway(-8, RWY)).toBe('07')
      expect(getActiveRunway(0, RWY)).toBe('07')
    })
  })

  describe('worstCrosswind', () => {
    it('sans rafale, renvoie le traversier du vent moyen', () => {
      expect(worstCrosswind(340, 10, null, RWY)).toBe(10)
      expect(worstCrosswind(340, 10, 0, RWY)).toBe(10)
    })

    it('avec rafale plus forte, renvoie le traversier de la rafale', () => {
      expect(worstCrosswind(340, 10, 20, RWY)).toBe(20)
    })

    it('garde le traversier moyen si la rafale est plus faible que le vent', () => {
      expect(worstCrosswind(340, 20, 5, RWY)).toBe(20)
    })
  })
})
