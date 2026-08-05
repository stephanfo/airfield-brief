import { describe, it, expect } from 'vitest'
import {
  getDays,
  findTodayIndex,
  parseEphemeris,
  addMinutes,
  formatLocalUTC,
  timeUntil,
  formatDuration,
  getDaylightState,
  getNextEvent,
  getDayMetrics,
} from '@/utils/ephemerisHelpers'

// Jeu de données minimal (2 jours) au format days[] IMCCE.
// Les crépuscules civils sont volontairement à ±40 min (réalité LFFI été) pour
// prouver que les bornes aéro utilisent l'offset FR ±30, PAS le crépuscule civil :
// jour 0 → aeroDawn = 03:30 (≠ civilDawn 03:20), aeroDusk = 20:00 (≠ civilDusk 20:10).
const RAW = {
  observer: { lat: 47.4, lon: -1.17 },
  days: [
    {
      date: '2026-06-06',
      civilDawn: '2026-06-06T03:20:00Z',
      sunrise: '2026-06-06T04:00:00Z',
      sunset: '2026-06-06T19:30:00Z',
      civilDusk: '2026-06-06T20:10:00Z',
    },
    {
      date: '2026-06-07',
      civilDawn: '2026-06-07T03:21:00Z',
      sunrise: '2026-06-07T04:01:00Z',
      sunset: '2026-06-07T19:31:00Z',
      civilDusk: '2026-06-07T20:11:00Z',
    },
  ],
}

const ms = (iso) => new Date(iso).getTime()

describe('ephemerisHelpers', () => {
  describe('getDays', () => {
    it('renvoie [] pour données absentes', () => {
      expect(getDays(null)).toEqual([])
      expect(getDays({})).toEqual([])
    })

    it('extrait les jours valides du format days[]', () => {
      expect(getDays(RAW)).toHaveLength(2)
    })

    it('filtre un jour incomplet', () => {
      const raw = { days: [{ date: 'x', sunrise: '2026-06-06T04:00:00Z' }] }
      expect(getDays(raw)).toEqual([])
    })

    it('rétro-compat : ancien format mono-jour { today }', () => {
      const raw = {
        calcDate: '2026-06-06',
        today: {
          civilDawn: '2026-06-06T03:20:00Z',
          sunrise: '2026-06-06T04:00:00Z',
          sunset: '2026-06-06T19:30:00Z',
          civilDusk: '2026-06-06T20:10:00Z',
        },
      }
      const days = getDays(raw)
      expect(days).toHaveLength(1)
      expect(days[0].date).toBe('2026-06-06')
    })
  })

  describe('addMinutes', () => {
    it('null pour entrée nulle ou invalide', () => {
      expect(addMinutes(null, 30)).toBeNull()
      expect(addMinutes('xxx', 30)).toBeNull()
    })

    it('décale dans les deux sens', () => {
      expect(addMinutes('2026-06-06T19:30:00Z', 30)).toBe('2026-06-06T20:00:00Z')
      expect(addMinutes('2026-06-06T04:00:00Z', -30)).toBe('2026-06-06T03:30:00Z')
    })
  })

  describe('findTodayIndex', () => {
    it('trouve l’index par date UTC', () => {
      expect(findTodayIndex(RAW, ms('2026-06-07T10:00:00Z'))).toBe(1)
    })

    it('retombe sur 0 si pas de correspondance', () => {
      expect(findTodayIndex(RAW, ms('2030-01-01T10:00:00Z'))).toBe(0)
    })
  })

  describe('parseEphemeris', () => {
    it('normalise le jour, dérive les bornes aéro ±30 et rattache le suivant', () => {
      const eph = parseEphemeris(RAW, 0)
      expect(eph.sunrise).toBe('2026-06-06T04:00:00Z')
      expect(eph.lat).toBe(47.4)
      // Bornes aéro = lever −30 / coucher +30 (PAS les crépuscules civils ±40)
      expect(eph.aeroDawn).toBe('2026-06-06T03:30:00Z')
      expect(eph.aeroDusk).toBe('2026-06-06T20:00:00Z')
      expect(eph.next).toEqual({
        aeroDawn: '2026-06-07T03:31:00Z',
        sunrise: '2026-06-07T04:01:00Z',
      })
    })

    it('next = null pour le dernier jour', () => {
      expect(parseEphemeris(RAW, 1).next).toBeNull()
    })

    it('null si index hors borne', () => {
      expect(parseEphemeris(RAW, 9)).toBeNull()
    })
  })

  describe('formatLocalUTC', () => {
    it('tirets pour entrée nulle ou invalide', () => {
      expect(formatLocalUTC(null).combined).toBe('—')
      expect(formatLocalUTC('pas-une-date').combined).toBe('—')
    })

    it('formate HH:mm UTC et compose combined', () => {
      const { utc, combined } = formatLocalUTC('2026-06-06T19:30:00Z')
      expect(utc).toBe('19:30')
      expect(combined).toContain('UTC')
    })
  })

  describe('timeUntil', () => {
    it('null sans cible ou cible invalide', () => {
      expect(timeUntil(null, Date.now())).toBeNull()
      expect(timeUntil('xxx', Date.now())).toBeNull()
    })

    it('renvoie le delta signé', () => {
      const now = ms('2026-06-06T12:00:00Z')
      expect(timeUntil('2026-06-06T13:00:00Z', now)).toBe(3600_000)
      expect(timeUntil('2026-06-06T11:00:00Z', now)).toBe(-3600_000)
    })
  })

  describe('formatDuration', () => {
    it('cas limites', () => {
      expect(formatDuration(null)).toBe('—')
      expect(formatDuration(0)).toBe('0 min')
      expect(formatDuration(-5)).toBe('0 min')
      expect(formatDuration(30_000)).toBe('< 1 min')
    })

    it('minutes seules et heures + minutes paddées', () => {
      expect(formatDuration(45 * 60_000)).toBe('45 min')
      expect(formatDuration((2 * 60 + 35) * 60_000)).toBe('2 h 35')
      expect(formatDuration(60 * 60_000)).toBe('1 h 00')
    })
  })

  describe('getDaylightState', () => {
    const eph = parseEphemeris(RAW, 0)

    it('Indisponible si pas d’éphémérides', () => {
      expect(getDaylightState(null, Date.now())).toMatchObject({ state: 'night', color: 'grey' })
    })

    it('nuit avant l’aube aéro (lever −30) et après la fin du jour aéro (coucher +30)', () => {
      expect(getDaylightState(eph, ms('2026-06-06T02:00:00Z')).state).toBe('night')
      expect(getDaylightState(eph, ms('2026-06-06T21:00:00Z')).state).toBe('night')
    })

    it('nuit aéro dès coucher +30, même si le crépuscule civil n’est pas fini', () => {
      // 20:05 : après aeroDusk (20:00) mais avant civilDusk (20:10) → bien NUIT
      expect(getDaylightState(eph, ms('2026-06-06T20:05:00Z')).state).toBe('night')
      // 03:25 : avant aeroDawn (03:30) mais après civilDawn (03:20) → bien NUIT
      expect(getDaylightState(eph, ms('2026-06-06T03:25:00Z')).state).toBe('night')
    })

    it('crépuscule aéro entre aube/lever et coucher/fin de jour', () => {
      expect(getDaylightState(eph, ms('2026-06-06T03:45:00Z')).state).toBe('twilight')
      expect(getDaylightState(eph, ms('2026-06-06T19:45:00Z')).state).toBe('twilight')
    })

    it('jour entre lever et coucher', () => {
      expect(getDaylightState(eph, ms('2026-06-06T12:00:00Z'))).toMatchObject({
        state: 'day',
        color: 'green',
      })
    })
  })

  describe('getNextEvent', () => {
    const eph = parseEphemeris(RAW, 0)

    it('null sans éphémérides', () => {
      expect(getNextEvent(null, Date.now())).toBeNull()
    })

    it('en journée → prochain coucher', () => {
      expect(getNextEvent(eph, ms('2026-06-06T12:00:00Z')).key).toBe('sunset')
    })

    it('après le coucher → fin du jour aéronautique', () => {
      expect(getNextEvent(eph, ms('2026-06-06T19:45:00Z')).key).toBe('aeroDusk')
    })

    it('la nuit → début du jour aéronautique du lendemain', () => {
      const next = getNextEvent(eph, ms('2026-06-06T21:00:00Z'))
      expect(next.key).toBe('aeroDawnNext')
      expect(next.nextDay).toBe(true)
    })
  })

  describe('getDayMetrics', () => {
    it('null sans éphémérides', () => {
      expect(getDayMetrics(null)).toBeNull()
    })

    it('liste 4 événements et calcule les durées', () => {
      const m = getDayMetrics(parseEphemeris(RAW, 0))
      expect(m.events).toHaveLength(4)
      expect(m.dayLength).toBe(15.5 * 3600_000) // 04:00 → 19:30
      expect(m.aeroDayLength).toBe(16.5 * 3600_000) // 03:30 → 20:00
    })
  })
})
