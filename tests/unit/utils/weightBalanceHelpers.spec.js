import { describe, it, expect } from 'vitest'
import {
  stationMass,
  computeLoadout,
  pointInPolygon,
  evaluateCg,
  computeArrival,
} from '@/utils/weightBalanceHelpers'

const aircraft = {
  emptyWeight: 600,
  emptyArm: 400,
  maxTakeoffWeight: 900,
  stations: [
    { id: 'pilot', label: 'Pilote', type: 'person', arm: 410, default: 80 },
    { id: 'baggage', label: 'Bagages', type: 'baggage', arm: 1900, default: 0 },
    { id: 'fuel', label: 'Carburant', type: 'fuel', arm: 1120, density: 0.72, maxVolume: 110 },
  ],
  // Carré simple pour tests géométriques
  envelope: [
    { arm: 300, weight: 600 },
    { arm: 600, weight: 600 },
    { arm: 600, weight: 900 },
    { arm: 300, weight: 900 },
  ],
}

describe('stationMass', () => {
  it('rend la valeur brute pour une personne', () => {
    expect(stationMass({ type: 'person' }, 80)).toBe(80)
  })
  it('convertit litres → kg via densité pour le carburant', () => {
    expect(stationMass({ type: 'fuel', density: 0.72 }, 100)).toBeCloseTo(72)
  })
})

describe('computeLoadout', () => {
  it('agrège masse, moment et CG', () => {
    const r = computeLoadout(aircraft, { pilot: 80, fuel: 100 })
    // 600 + 80 + 72 = 752
    expect(r.totalWeight).toBeCloseTo(752)
    const expectedMoment = 600 * 400 + 80 * 410 + 72 * 1120
    expect(r.totalMoment).toBeCloseTo(expectedMoment)
    expect(r.cg).toBeCloseTo(expectedMoment / 752)
  })

  it('gère un avion null', () => {
    expect(computeLoadout(null).cg).toBeNull()
  })
})

describe('pointInPolygon', () => {
  const sq = aircraft.envelope
  it('point intérieur', () => {
    expect(pointInPolygon({ arm: 450, weight: 750 }, sq)).toBe(true)
  })
  it('point extérieur', () => {
    expect(pointInPolygon({ arm: 700, weight: 750 }, sq)).toBe(false)
  })
  it('point sur une arête', () => {
    expect(pointInPolygon({ arm: 300, weight: 750 }, sq)).toBe(true)
  })
})

describe('evaluateCg', () => {
  it('ok dans l’enveloppe sous MTOW', () => {
    const totals = { cg: 450, totalWeight: 750 }
    const ev = evaluateCg(totals, aircraft)
    expect(ev.inEnvelope).toBe(true)
    expect(ev.overWeight).toBe(false)
    expect(ev.ok).toBe(true)
  })

  it('détecte dépassement MTOW', () => {
    const totals = { cg: 450, totalWeight: 950 }
    const ev = evaluateCg(totals, aircraft)
    expect(ev.overWeight).toBe(true)
    expect(ev.ok).toBe(false)
  })
})

describe('computeArrival', () => {
  it('retire le carburant brûlé au bras carburant', () => {
    const dep = computeLoadout(aircraft, { pilot: 80, fuel: 100 })
    const arr = computeArrival(aircraft, dep, 50) // 50 L brûlés
    const burnedMass = 50 * 0.72
    expect(arr.totalWeight).toBeCloseTo(dep.totalWeight - burnedMass)
    const expectedMoment = dep.totalMoment - burnedMass * 1120
    expect(arr.cg).toBeCloseTo(expectedMoment / arr.totalWeight)
  })
})
