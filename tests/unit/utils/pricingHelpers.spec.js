import { describe, it, expect } from 'vitest'
import { computeFlightCost, formatMinutes } from '@/utils/pricingHelpers'

describe('computeFlightCost', () => {
  it('facture la durée moins la déduction', () => {
    const r = computeFlightCost({ hourlyRate: 180, durationMinutes: 90, deductionMinutes: 10 })
    expect(r.billedMinutes).toBe(80)
    expect(r.total).toBeCloseTo((180 * 80) / 60) // 240
  })

  it('sans déduction facture tout', () => {
    const r = computeFlightCost({ hourlyRate: 185.4, durationMinutes: 60 })
    expect(r.total).toBeCloseTo(185.4)
  })

  it('ne facture jamais négatif', () => {
    const r = computeFlightCost({ hourlyRate: 180, durationMinutes: 5, deductionMinutes: 10 })
    expect(r.billedMinutes).toBe(0)
    expect(r.total).toBe(0)
  })
})

describe('formatMinutes', () => {
  it('formate heures et minutes', () => {
    expect(formatMinutes(85)).toBe('1 h 25')
    expect(formatMinutes(45)).toBe('45 min')
    expect(formatMinutes(120)).toBe('2 h 00')
  })
})
