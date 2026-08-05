import { describe, it, expect } from 'vitest'
import { computeFuelPlan } from '@/utils/fuelHelpers'

describe('computeFuelPlan', () => {
  it('calcule le bilan réglementaire', () => {
    const p = computeFuelPlan({
      cruiseBurn: 30, // 0,5 L/min
      tripMinutes: 60, // 30 L
      alternateMinutes: 20, // 10 L
      reserveMinutes: 30, // 15 L
      taxiFuel: 4,
      contingency: 0.05, // 5% de 30 = 1,5 L
      density: 0.72,
      tankCapacity: 109,
    })
    expect(p.breakdown.trip).toBeCloseTo(30)
    expect(p.breakdown.alternate).toBeCloseTo(10)
    expect(p.breakdown.reserve).toBeCloseTo(15)
    expect(p.breakdown.contingency).toBeCloseTo(1.5)
    expect(p.minimum).toBeCloseTo(4 + 30 + 1.5 + 10 + 15) // 60,5
    expect(p.minimumMass).toBeCloseTo(60.5 * 0.72)
    expect(p.overCapacity).toBe(false)
  })

  it('signale un dépassement de capacité réservoir', () => {
    const p = computeFuelPlan({
      cruiseBurn: 60,
      tripMinutes: 120, // 120 L
      tankCapacity: 110,
    })
    expect(p.overCapacity).toBe(true)
  })

  it('applique la marge au volume conseillé', () => {
    const p = computeFuelPlan({ cruiseBurn: 30, tripMinutes: 60, margin: 5 })
    expect(p.recommended).toBeCloseTo(p.minimum + 5)
  })

  it('robuste aux entrées vides', () => {
    const p = computeFuelPlan()
    expect(p.minimum).toBe(0)
    expect(p.tankCapacity).toBeNull()
  })
})
