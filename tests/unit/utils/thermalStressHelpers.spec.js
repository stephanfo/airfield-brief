import { describe, it, expect } from 'vitest'
import {
  THERMAL_STRESS_LEVELS,
  nearestHumidityColumn,
  getThermalStressLevel,
  applyPersonalShift,
  getThermalStressShift,
  thermalStressMeta,
  thermalStressRecommendations,
  currentFromForecast,
  todayPeakFromForecast,
} from '@/utils/thermalStressHelpers'
import { THERMAL_STRESS_ZONES } from '@/config/app.config'

describe('thermalStressHelpers', () => {
  describe('nearestHumidityColumn', () => {
    it('arrondit à la colonne de 10 % la plus proche', () => {
      expect(nearestHumidityColumn(52)).toBe(50)
      expect(nearestHumidityColumn(54)).toBe(50)
      expect(nearestHumidityColumn(55)).toBe(60)
      expect(nearestHumidityColumn(16)).toBe(20)
    })

    it('borne aux colonnes extrêmes [10, 90]', () => {
      expect(nearestHumidityColumn(0)).toBe(10)
      expect(nearestHumidityColumn(3)).toBe(10)
      expect(nearestHumidityColumn(100)).toBe(90)
      expect(nearestHumidityColumn(120)).toBe(90)
    })
  })

  describe('getThermalStressLevel', () => {
    it('renvoie null si température ou humidité absente / NaN', () => {
      expect(getThermalStressLevel(null, 50)).toBeNull()
      expect(getThermalStressLevel(30, null)).toBeNull()
      expect(getThermalStressLevel(undefined, undefined)).toBeNull()
      expect(getThermalStressLevel(NaN, 50)).toBeNull()
      expect(getThermalStressLevel(30, NaN)).toBeNull()
    })

    it('classe correctement les 4 zones (colonne 10 %)', () => {
      // grille 10 % : moyenne 33, significative 38, élevée 44
      expect(getThermalStressLevel(20, 10)).toBe('faible')
      expect(getThermalStressLevel(32, 10)).toBe('faible')
      expect(getThermalStressLevel(33, 10)).toBe('moyenne')
      expect(getThermalStressLevel(37, 10)).toBe('moyenne')
      expect(getThermalStressLevel(38, 10)).toBe('significative')
      expect(getThermalStressLevel(43, 10)).toBe('significative')
      expect(getThermalStressLevel(44, 10)).toBe('elevee')
      expect(getThermalStressLevel(50, 10)).toBe('elevee')
    })

    it('classe correctement une colonne humide (90 %)', () => {
      // grille 90 % : moyenne 26, significative 29, élevée 31
      expect(getThermalStressLevel(25, 90)).toBe('faible')
      expect(getThermalStressLevel(26, 90)).toBe('moyenne')
      expect(getThermalStressLevel(29, 90)).toBe('significative')
      expect(getThermalStressLevel(31, 90)).toBe('elevee')
    })

    it('arrondit la température au °C le plus proche', () => {
      // colonne 50 % : moyenne 30 → 29.6 arrondi à 30 = moyenne, 29.4 → 29 = faible
      expect(getThermalStressLevel(29.6, 50)).toBe('moyenne')
      expect(getThermalStressLevel(29.4, 50)).toBe('faible')
    })

    it('arrondit l’humidité à la colonne (54 % → colonne 50)', () => {
      expect(getThermalStressLevel(33, 54)).toBe(getThermalStressLevel(33, 50))
    })

    it('borne les humidités hors grille', () => {
      // 5 % → colonne 10 ; 95 % → colonne 90
      expect(getThermalStressLevel(33, 5)).toBe(getThermalStressLevel(33, 10))
      expect(getThermalStressLevel(31, 95)).toBe(getThermalStressLevel(31, 90))
    })

    it('température sous le bas de grille → faible', () => {
      expect(getThermalStressLevel(15, 50)).toBe('faible')
      expect(getThermalStressLevel(23, 90)).toBe('faible')
    })

    it('la grille est monotone (zone non décroissante avec température)', () => {
      const rank = (l) => THERMAL_STRESS_LEVELS.indexOf(l)
      for (const h of Object.keys(THERMAL_STRESS_ZONES).map(Number)) {
        let prev = -1
        for (let t = 24; t <= 45; t++) {
          const r = rank(getThermalStressLevel(t, h))
          expect(r).toBeGreaterThanOrEqual(prev)
          prev = r
        }
      }
    })
  })

  describe('applyPersonalShift', () => {
    it('décale vers le plus sévère', () => {
      expect(applyPersonalShift('faible', 1)).toBe('moyenne')
      expect(applyPersonalShift('moyenne', 2)).toBe('elevee')
    })

    it('borne à elevee', () => {
      expect(applyPersonalShift('significative', 5)).toBe('elevee')
      expect(applyPersonalShift('elevee', 3)).toBe('elevee')
    })

    it('décalage 0 = inchangé', () => {
      expect(applyPersonalShift('moyenne', 0)).toBe('moyenne')
    })

    it('renvoie null si niveau null', () => {
      expect(applyPersonalShift(null, 2)).toBeNull()
    })
  })

  describe('getThermalStressShift', () => {
    it('cumule âge et pathologie', () => {
      expect(getThermalStressShift({ ageBracket: 'under65', pathologie: false })).toBe(0)
      expect(getThermalStressShift({ ageBracket: '65-69', pathologie: false })).toBe(1)
      expect(getThermalStressShift({ ageBracket: '75plus', pathologie: false })).toBe(3)
      expect(getThermalStressShift({ ageBracket: '70-74', pathologie: true })).toBe(3)
    })

    it('défensif sur entrées absentes', () => {
      expect(getThermalStressShift(null)).toBe(0)
      expect(getThermalStressShift({})).toBe(0)
      expect(getThermalStressShift({ ageBracket: 'inconnu' })).toBe(0)
    })
  })

  describe('thermalStressMeta', () => {
    it('mappe niveau → classes charte UI', () => {
      expect(thermalStressMeta('faible').bgClass).toBe('bg-green-1')
      expect(thermalStressMeta('moyenne').bgClass).toBe('bg-yellow-1')
      expect(thermalStressMeta('significative').bgClass).toBe('bg-orange-1')
      expect(thermalStressMeta('elevee').bgClass).toBe('bg-red-1')
      expect(thermalStressMeta('elevee').textColor).toBe('text-red-9')
      expect(thermalStressMeta('elevee').color).toBe('negative')
    })
  })

  describe('thermalStressRecommendations', () => {
    it('renvoie les puces par zone', () => {
      expect(thermalStressRecommendations('faible')).toHaveLength(1)
      expect(thermalStressRecommendations('elevee').length).toBeGreaterThan(1)
      expect(thermalStressRecommendations('elevee')[0]).toMatch(/coup de chaleur/i)
    })

    it('renvoie un tableau vide pour un niveau inconnu/null', () => {
      expect(thermalStressRecommendations(null)).toEqual([])
      expect(thermalStressRecommendations('xxx')).toEqual([])
    })
  })

  describe('currentFromForecast', () => {
    const days = [
      {
        date: '2026-06-23',
        hourly: [
          { time: '2026-06-23T12:00:00+02:00', temp: 28, humidity: 40 },
          { time: '2026-06-23T16:00:00+02:00', temp: 33, humidity: 25 },
        ],
      },
      {
        date: '2026-06-24',
        hourly: [{ time: '2026-06-24T14:00:00+02:00', temp: 30, humidity: 30 }],
      },
    ]

    it('retourne le créneau horaire le plus proche de `now`', () => {
      const now = new Date('2026-06-23T15:30:00+02:00')
      expect(currentFromForecast(days, now)).toEqual({
        temperature: 33,
        humidity: 25,
        time: '2026-06-23T16:00:00+02:00',
      })
    })

    it('balaie tous les jours, pas seulement le premier', () => {
      const now = new Date('2026-06-24T13:50:00+02:00')
      expect(currentFromForecast(days, now)?.temperature).toBe(30)
    })

    it('renvoie null si données absentes ou vides', () => {
      expect(currentFromForecast(null)).toBeNull()
      expect(currentFromForecast([])).toBeNull()
      expect(currentFromForecast([{ date: 'x', hourly: [] }])).toBeNull()
    })

    it('ignore les horodatages invalides', () => {
      const bad = [{ hourly: [{ time: 'pas-une-date', temp: 99, humidity: 10 }] }]
      expect(currentFromForecast(bad, new Date('2026-06-23T12:00:00Z'))).toBeNull()
    })
  })

  describe('todayPeakFromForecast', () => {
    const days = [
      { date: '2026-06-23', peakTemp: 42, peakHumidity: 19 },
      { date: '2026-06-24', peakTemp: 30, peakHumidity: 35 },
    ]

    it('retourne le pic du jour courant', () => {
      const now = new Date('2026-06-23T09:00:00+02:00')
      expect(todayPeakFromForecast(days, now)).toEqual({ temperature: 42, humidity: 19 })
    })

    it('retombe sur le premier jour si aucune date ne correspond', () => {
      const now = new Date('2026-07-01T09:00:00+02:00')
      expect(todayPeakFromForecast(days, now)).toEqual({ temperature: 42, humidity: 19 })
    })

    it('renvoie null si données absentes ou pic non numérique', () => {
      expect(todayPeakFromForecast(null)).toBeNull()
      expect(todayPeakFromForecast([])).toBeNull()
      expect(
        todayPeakFromForecast([{ date: '2026-06-23' }], new Date('2026-06-23T09:00:00Z')),
      ).toBeNull()
    })
  })
})
