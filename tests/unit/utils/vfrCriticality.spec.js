import { describe, it, expect } from 'vitest'
import {
  parseCeiling,
  isClearSky,
  getCeilingStatus,
  formatVisibilityText,
  formatCeilingText,
  getVfrLevel,
  getVfrBgClass,
  getVfrLabel,
  getVfrTextColor,
  getOverallVfrStatus,
} from '@/utils/vfrCriticality'
import { VFR_THRESHOLDS_DEFAULTS as T } from '@/config/app.config'

describe('vfrCriticality', () => {
  describe('parseCeiling', () => {
    it('renvoie null sans plafond significatif', () => {
      expect(parseCeiling(null)).toBeNull()
      expect(parseCeiling('')).toBeNull()
      expect(parseCeiling('CAVOK')).toBeNull()
      expect(parseCeiling('NSC')).toBeNull()
      expect(parseCeiling('SCT030')).toBeNull() // SCT n’est pas un plafond
    })

    it('convertit BKN/OVC/VV en pieds', () => {
      expect(parseCeiling('BKN020')).toBe(2000)
      expect(parseCeiling('OVC045')).toBe(4500)
      expect(parseCeiling('BKN020CB')).toBe(2000)
    })
  })

  describe('isClearSky', () => {
    it('vrai pour les codes ciel clair (insensible à la casse)', () => {
      expect(isClearSky('CAVOK')).toBe(true)
      expect(isClearSky('cavok')).toBe(true)
      expect(isClearSky('SKC')).toBe(true)
      expect(isClearSky('CLR')).toBe(true)
      expect(isClearSky('NSC')).toBe(true)
      expect(isClearSky('NCD')).toBe(true)
    })

    it('faux pour absence d’info ou plafond significatif', () => {
      expect(isClearSky(null)).toBe(false)
      expect(isClearSky('')).toBe(false)
      expect(isClearSky('BKN020')).toBe(false)
    })
  })

  describe('getCeilingStatus', () => {
    it('CAVOK / ciel clair = vert VFR (distinct de l’absence d’info)', () => {
      const s = getCeilingStatus('CAVOK', T)
      expect(s).toMatchObject({
        hasStatus: true,
        ft: null,
        display: 'CAVOK',
        bgClass: 'bg-green-1',
        label: 'VFR',
        textColor: 'text-green-9',
      })
    })

    it('plafond significatif au-dessus du seuil = vert', () => {
      const s = getCeilingStatus('BKN020', T) // 2000 ft ≥ good 1500
      expect(s).toMatchObject({ hasStatus: true, ft: 2000, bgClass: 'bg-green-1', label: 'VFR' })
    })

    it('plafond bas = rouge', () => {
      const s = getCeilingStatus('BKN004', T) // 400 ft < marginal 500
      expect(s).toMatchObject({
        hasStatus: true,
        ft: 400,
        bgClass: 'bg-red-1',
        label: 'Défavorable',
      })
    })

    it('absence d’info = gris, sans statut', () => {
      const s = getCeilingStatus(null, T)
      expect(s).toMatchObject({ hasStatus: false, ft: null, display: '-', bgClass: 'bg-grey-2' })
    })
  })

  describe('formatVisibilityText', () => {
    it('humanise la visibilité', () => {
      expect(formatVisibilityText(null)).toBe('-')
      expect(formatVisibilityText(9999)).toBe('> 10 km')
      expect(formatVisibilityText(4000)).toBe('4 km')
      expect(formatVisibilityText(4500)).toBe('4.5 km')
      expect(formatVisibilityText(800)).toBe('800 m')
    })
  })

  describe('formatCeilingText', () => {
    it('humanise le plafond avec annotation CB/TCU', () => {
      expect(formatCeilingText(null)).toBe('-')
      expect(formatCeilingText('CAVOK')).toBe('CAVOK')
      expect(formatCeilingText('BKN020')).toBe('2000 ft')
      expect(formatCeilingText('BKN020CB')).toBe('2000 ft ⛈')
      expect(formatCeilingText('OVC045TCU')).toBe('4500 ft ☁↑')
    })
  })

  describe('getVfrLevel', () => {
    it('valeur absente = good (critère non bloquant)', () => {
      expect(getVfrLevel(null, 'wind', T)).toBe('good')
    })

    it('visibilité : plus haut = mieux', () => {
      expect(getVfrLevel(9000, 'visibility', T)).toBe('good')
      expect(getVfrLevel(6000, 'visibility', T)).toBe('marginal')
      expect(getVfrLevel(3000, 'visibility', T)).toBe('poor')
    })

    it('vent : plus bas = mieux', () => {
      expect(getVfrLevel(10, 'wind', T)).toBe('good')
      expect(getVfrLevel(20, 'wind', T)).toBe('marginal')
      expect(getVfrLevel(30, 'wind', T)).toBe('poor')
    })

    it('plafond : plus haut = mieux', () => {
      expect(getVfrLevel(2000, 'ceiling', T)).toBe('good')
      expect(getVfrLevel(800, 'ceiling', T)).toBe('marginal')
      expect(getVfrLevel(300, 'ceiling', T)).toBe('poor')
    })
  })

  describe('getOverallVfrStatus', () => {
    it('renvoie le pire niveau parmi les paramètres', () => {
      expect(getOverallVfrStatus({ visibility: 9000, wind: 10 }, T)).toBe('good')
      expect(getOverallVfrStatus({ visibility: 9000, wind: 20 }, T)).toBe('marginal')
      expect(getOverallVfrStatus({ visibility: 9000, wind: 30 }, T)).toBe('poor')
    })

    it('ignore les valeurs nulles', () => {
      expect(getOverallVfrStatus({ visibility: 9000, gust: null }, T)).toBe('good')
    })
  })

  describe('helpers de présentation', () => {
    it('mappe niveau → classes Quasar cohérentes', () => {
      expect(getVfrBgClass(30, 'wind', T)).toBe('bg-red-1')
      expect(getVfrLabel(30, 'wind', T)).toBe('Défavorable')
      expect(getVfrTextColor(10, 'wind', T)).toBe('text-green-9')
    })
  })
})
