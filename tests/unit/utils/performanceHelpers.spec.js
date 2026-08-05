import { describe, it, expect } from 'vitest'
import {
  pressureAltitude,
  isaTemp,
  interpolatePerformance,
  conservativePerformance,
  applyCorrections,
  computePerformance,
} from '@/utils/performanceHelpers'

// Grille minimale 2×2×1 (alt-pression × température, masse unique)
const table = [
  { pressureAltitude: 0, temperature: 0, weight: 900, groundRoll: 200, over50ft: 400 },
  { pressureAltitude: 0, temperature: 20, weight: 900, groundRoll: 240, over50ft: 480 },
  { pressureAltitude: 2000, temperature: 0, weight: 900, groundRoll: 260, over50ft: 520 },
  { pressureAltitude: 2000, temperature: 20, weight: 900, groundRoll: 300, over50ft: 600 },
]

describe('pressureAltitude', () => {
  it('QNH standard → altitude terrain', () => {
    expect(pressureAltitude(1013.25, 100)).toBeCloseTo(100)
  })
  it('QNH bas → altitude-pression supérieure', () => {
    // 1003.25 hPa = -10 hPa → +270 ft
    expect(pressureAltitude(1003.25, 100)).toBeCloseTo(370)
  })
})

describe('interpolatePerformance', () => {
  it('retourne la valeur exacte sur un nœud', () => {
    const r = interpolatePerformance(table, { pressureAltitude: 0, temperature: 0, weight: 900 })
    expect(r.groundRoll).toBeCloseTo(200)
  })

  it('interpole linéairement entre deux températures', () => {
    const r = interpolatePerformance(table, { pressureAltitude: 0, temperature: 10, weight: 900 })
    expect(r.groundRoll).toBeCloseTo(220) // milieu de 200↔240
  })

  it('interpole sur deux axes (centre de la grille)', () => {
    const r = interpolatePerformance(table, {
      pressureAltitude: 1000,
      temperature: 10,
      weight: 900,
    })
    // moyenne des 4 coins : (200+240+260+300)/4 = 250
    expect(r.groundRoll).toBeCloseTo(250)
  })

  it('clampe au-delà des bornes', () => {
    const r = interpolatePerformance(table, {
      pressureAltitude: 5000,
      temperature: 50,
      weight: 900,
    })
    expect(r.groundRoll).toBeCloseTo(300) // coin max
  })

  it('renvoie null pour table vide', () => {
    expect(interpolatePerformance([], {})).toBeNull()
  })
})

describe('conservativePerformance', () => {
  it('sur un nœud → valeur exacte (== interpolation)', () => {
    const r = conservativePerformance(table, { pressureAltitude: 0, temperature: 0, weight: 900 })
    expect(r.groundRoll).toBeCloseTo(200)
    expect(r.over50ft).toBeCloseTo(400)
  })

  it('valeur intermédiaire → arrondit à la ligne immédiatement supérieure', () => {
    // temp 10 (entre 0 et 20) → next-higher = 20 ; alt 1000 → next-higher = 2000
    const r = conservativePerformance(table, {
      pressureAltitude: 1000,
      temperature: 10,
      weight: 900,
    })
    expect(r.groundRoll).toBeCloseTo(300) // coin (2000, 20)
    expect(r.over50ft).toBeCloseTo(600)
  })

  it('est toujours ≥ la valeur interpolée', () => {
    const query = { pressureAltitude: 1000, temperature: 10, weight: 900 }
    const cons = conservativePerformance(table, query)
    const interp = interpolatePerformance(table, query)
    expect(cons.groundRoll).toBeGreaterThanOrEqual(interp.groundRoll)
    expect(cons.over50ft).toBeGreaterThanOrEqual(interp.over50ft)
  })

  it('au-delà du max → clamp à la dernière ligne', () => {
    const r = conservativePerformance(table, {
      pressureAltitude: 5000,
      temperature: 50,
      weight: 900,
    })
    expect(r.groundRoll).toBeCloseTo(300) // coin max
    expect(r.over50ft).toBeCloseTo(600)
  })

  it('renvoie null pour table vide', () => {
    expect(conservativePerformance([], {})).toBeNull()
  })
})

describe('applyCorrections', () => {
  const corrections = {
    headwindPer10kt: -0.1,
    tailwindPer10kt: 0.2,
    surface: { paved: 1.0, grass: 1.15 },
  }

  it('réduit la distance avec vent de face', () => {
    const r = applyCorrections({ groundRoll: 200, over50ft: 400 }, corrections, {
      headwindComponent: 10,
    })
    expect(r.factor).toBeCloseTo(0.9)
    expect(r.groundRoll).toBeCloseTo(180)
  })

  it('augmente avec vent arrière', () => {
    const r = applyCorrections({ groundRoll: 200, over50ft: 400 }, corrections, {
      headwindComponent: -10,
    })
    expect(r.factor).toBeCloseTo(1.2)
  })

  it('applique le facteur revêtement', () => {
    const r = applyCorrections({ groundRoll: 200, over50ft: 400 }, corrections, {
      surface: 'grass',
    })
    expect(r.groundRoll).toBeCloseTo(230)
  })
})

describe('isaTemp', () => {
  it('15 °C au niveau de la mer', () => {
    expect(isaTemp(0)).toBeCloseTo(15)
  })
  it('décroît de ~2 °C/1000 ft', () => {
    expect(isaTemp(4000)).toBeCloseTo(15 - 1.98 * 4) // ≈ 7,08
    expect(isaTemp(8000)).toBeCloseTo(15 - 1.98 * 8) // ≈ -0,84
  })
})

describe('applyCorrections — modèle POH (table de vent)', () => {
  const corrections = {
    headwind: [
      { kt: 0, factor: 1.0 },
      { kt: 10, factor: 0.85 },
      { kt: 20, factor: 0.65 },
      { kt: 30, factor: 0.55 },
    ],
    tailwindPerKt: 0.05,
    surface: { paved: 1.0, grass: 1.15 },
  }

  it('applique le facteur de vent de face exact sur un nœud', () => {
    const r = applyCorrections({ groundRoll: 200, over50ft: 400 }, corrections, {
      headwindComponent: 20,
    })
    expect(r.factor).toBeCloseTo(0.65)
  })

  it('interpole le facteur de vent de face entre deux nœuds', () => {
    const r = applyCorrections({ groundRoll: 200, over50ft: 400 }, corrections, {
      headwindComponent: 15,
    })
    expect(r.factor).toBeCloseTo(0.75) // milieu de 0,85 ↔ 0,65
  })

  it('clampe le vent de face au-delà de la table', () => {
    const r = applyCorrections({ groundRoll: 200, over50ft: 400 }, corrections, {
      headwindComponent: 40,
    })
    expect(r.factor).toBeCloseTo(0.55)
  })

  it('majore avec le vent arrière (+5 %/kt)', () => {
    const r = applyCorrections({ groundRoll: 200, over50ft: 400 }, corrections, {
      headwindComponent: -4,
    })
    expect(r.factor).toBeCloseTo(1.2) // 1 + 0,05 × 4
  })

  it('combine vent de face et revêtement herbe', () => {
    const r = applyCorrections({ groundRoll: 200, over50ft: 400 }, corrections, {
      headwindComponent: 10,
      surface: 'grass',
    })
    expect(r.factor).toBeCloseTo(0.85 * 1.15)
  })
})

describe('computePerformance', () => {
  it('combine interpolation et corrections', () => {
    const phase = {
      table,
      corrections: { headwindPer10kt: -0.1, surface: { grass: 1.15 } },
    }
    const r = computePerformance(
      phase,
      { pressureAltitude: 0, temperature: 0, weight: 900 },
      { headwindComponent: 10, surface: 'grass' },
    )
    expect(r.base.groundRoll).toBeCloseTo(200)
    // facteur = (1 - 0,1) * 1,15 = 1,035
    expect(r.corrected.groundRoll).toBeCloseTo(207)
  })

  it('expose la lecture conservatrice avec les mêmes corrections', () => {
    const phase = {
      table,
      corrections: { headwindPer10kt: -0.1, surface: { grass: 1.15 } },
    }
    const r = computePerformance(
      phase,
      { pressureAltitude: 1000, temperature: 10, weight: 900 }, // intermédiaire
      { headwindComponent: 10, surface: 'grass' },
    )
    // base conservatrice = coin (2000, 20) → 300 ; facteur 1,035
    expect(r.conservativeBase.groundRoll).toBeCloseTo(300)
    expect(r.conservative.groundRoll).toBeCloseTo(310.5)
    // conservatrice ≥ interpolée
    expect(r.conservative.groundRoll).toBeGreaterThanOrEqual(r.corrected.groundRoll)
  })

  it('renvoie null sans table', () => {
    expect(computePerformance({}, {}, {})).toBeNull()
  })
})
