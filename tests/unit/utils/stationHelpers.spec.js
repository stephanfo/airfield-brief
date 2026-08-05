import { describe, it, expect } from 'vitest'
import {
  FIELD_ALTITUDE_M,
  calculateDewPoint,
  calculateQNH,
  calculatePressureTrend,
  degreesToCardinal,
  aggregateWindRose,
} from '@/utils/stationHelpers'
import { CLUB_CONFIG } from '@/config/club.config'

describe('stationHelpers', () => {
  describe('calculateDewPoint', () => {
    it('renvoie null pour une humidité hors bornes', () => {
      expect(calculateDewPoint(20, 0)).toBeNull()
      expect(calculateDewPoint(20, 150)).toBeNull()
      expect(calculateDewPoint(null, 50)).toBeNull()
    })

    it('point de rosée ≈ température à 100% d’humidité', () => {
      expect(calculateDewPoint(20, 100)).toBeCloseTo(20, 1)
    })

    it('calcule le point de rosée (Magnus) pour 20°C / 50%', () => {
      expect(calculateDewPoint(20, 50)).toBeCloseTo(9.3, 1)
    })
  })

  describe('calculateQNH', () => {
    it('renvoie null pour un QFE invalide', () => {
      expect(calculateQNH(0)).toBeNull()
      expect(calculateQNH(null)).toBeNull()
    })

    it('le QNH est supérieur au QFE (réduction au niveau mer)', () => {
      expect(calculateQNH(1000)).toBeGreaterThan(1000)
    })

    it('calcule le QNH ISA pour QFE=1000 à 34 m', () => {
      expect(calculateQNH(1000, 34)).toBeCloseTo(1004.0, 1)
    })

    it("FIELD_ALTITUDE_M provient de l'identité club (ADR-030)", () => {
      expect(FIELD_ALTITUDE_M).toBe(CLUB_CONFIG.airfield.elevationM)
    })
  })

  describe('calculatePressureTrend', () => {
    const slot = (hAgo, p) => ({
      time_slot: new Date(Date.now() - hAgo * 3600_000).toISOString(),
      pressure_hpa: p,
    })

    it('renvoie stable si moins de 4 points', () => {
      expect(calculatePressureTrend([slot(0, 1013)])).toEqual({ trend: 'stable', delta: 0 })
      expect(calculatePressureTrend(null)).toEqual({ trend: 'stable', delta: 0 })
    })

    it('détecte une hausse (delta > 1 hPa sur ~3h)', () => {
      const data = [slot(3, 1010), slot(2, 1012), slot(1, 1014), slot(0, 1015)]
      const { trend, delta } = calculatePressureTrend(data)
      expect(trend).toBe('rising')
      expect(delta).toBeCloseTo(5, 1)
    })

    it('détecte une baisse (delta < -1 hPa)', () => {
      const data = [slot(3, 1015), slot(2, 1013), slot(1, 1011), slot(0, 1010)]
      expect(calculatePressureTrend(data).trend).toBe('falling')
    })

    it('reste stable pour une variation ≤ 1 hPa', () => {
      const data = [slot(3, 1013), slot(2, 1013.2), slot(1, 1013.4), slot(0, 1013.5)]
      expect(calculatePressureTrend(data).trend).toBe('stable')
    })
  })

  describe('degreesToCardinal', () => {
    it('renvoie — pour une valeur hors bornes', () => {
      expect(degreesToCardinal(null)).toBe('—')
      expect(degreesToCardinal(-1)).toBe('—')
      expect(degreesToCardinal(361)).toBe('—')
    })

    it('mappe les directions vers leur nom complet', () => {
      expect(degreesToCardinal(0)).toBe('Nord')
      expect(degreesToCardinal(90)).toBe('Est')
      expect(degreesToCardinal(180)).toBe('Sud')
      expect(degreesToCardinal(270)).toBe('Ouest')
    })

    it('renvoie l’abréviation si fullName=false', () => {
      expect(degreesToCardinal(45, false)).toBe('NE')
    })
  })

  describe('aggregateWindRose', () => {
    it('renvoie [] pour une entrée vide ou invalide', () => {
      expect(aggregateWindRose(null, 24)).toEqual([])
      expect(aggregateWindRose([], 24)).toEqual([])
    })

    it('agrège un point unique dans le bon secteur avec fréquence 100%', () => {
      const data = [{ dir: 0, speed_bin: 5, count: 4, time_slot: new Date().toISOString() }]
      const result = aggregateWindRose(data, 24)
      expect(result).toHaveLength(16)
      const north = result.find((s) => s.sector === 'N')
      expect(north.bin5).toBe(4)
      expect(north.total).toBe(4)
      expect(north.frequency).toBe(100)
      // Tous les autres secteurs sont vides
      expect(result.filter((s) => s.total > 0)).toHaveLength(1)
    })
  })
})
