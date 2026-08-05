/**
 * Performances décollage / atterrissage (FEAT-016) — pur, testable.
 *
 * Méthode : interpolation des tables du POH (abaques constructeur), pas de formule
 * générique. Les tables vivent dans `aircrafts.json` (complément), chaque ligne :
 *   { pressureAltitude, temperature, weight, groundRoll, over50ft }
 * On interpole sur les 3 axes (altitude-pression, température, masse) puis on
 * applique les corrections constructeur (vent, revêtement).
 */

const AXES = ['pressureAltitude', 'temperature', 'weight']
const OUTPUTS = ['groundRoll', 'over50ft']

// Pente de piste : défaut si l'avion ne définit pas `corrections.slopePer1Percent`.
// Règle usuelle « 2 % montant = +10 % de distance » → +5 %/% (linéaire, symétrique :
// une pente descendante raccourcit la distance).
const DEFAULT_SLOPE_FACTOR_PER_PERCENT = 0.05

/**
 * Altitude-pression (ft) à partir du QNH et de l'altitude terrain.
 * Approximation standard : ~27 ft par hPa d'écart au 1013.25.
 */
export function pressureAltitude(qnhHpa, elevationFt) {
  const qnh = Number(qnhHpa)
  const elev = Number(elevationFt) || 0
  if (!Number.isFinite(qnh) || qnh <= 0) return elev
  return elev + (1013.25 - qnh) * 27
}

/**
 * Température ISA (°C) à une altitude-pression donnée (gradient standard
 * 1,98 °C/1000 ft). Sert à convertir une température réelle en écart à l'ISA
 * lorsque la table d'abaque est indexée par écart ISA (DR400 : ISA-20/ISA/ISA+20).
 */
export function isaTemp(pressureAltitudeFt) {
  return 15 - 1.98 * ((Number(pressureAltitudeFt) || 0) / 1000)
}

/** Facteur de correction vent par interpolation linéaire d'une table {kt, factor} (clampée). */
function windFactor(points, kt) {
  const pts = [...points].sort((a, b) => a.kt - b.kt)
  if (!pts.length) return 1
  if (kt <= pts[0].kt) return pts[0].factor
  const last = pts[pts.length - 1]
  if (kt >= last.kt) return last.factor
  for (let i = 0; i < pts.length - 1; i++) {
    if (kt >= pts[i].kt && kt <= pts[i + 1].kt) {
      const span = pts[i + 1].kt - pts[i].kt
      const t = span === 0 ? 0 : (kt - pts[i].kt) / span
      return pts[i].factor + t * (pts[i + 1].factor - pts[i].factor)
    }
  }
  return 1
}

/** Valeurs uniques triées d'un axe présent dans la table. */
function axisValues(table, axis) {
  return [...new Set(table.map((r) => r[axis]))].sort((a, b) => a - b)
}

/** Bracket [lo, hi] et fraction t pour une valeur sur un axe (clampé aux bornes). */
function bracket(values, x) {
  if (values.length === 1) return { lo: values[0], hi: values[0], t: 0 }
  if (x <= values[0]) return { lo: values[0], hi: values[0], t: 0 }
  if (x >= values[values.length - 1]) {
    const last = values[values.length - 1]
    return { lo: last, hi: last, t: 0 }
  }
  for (let i = 0; i < values.length - 1; i++) {
    if (x >= values[i] && x <= values[i + 1]) {
      const span = values[i + 1] - values[i]
      return { lo: values[i], hi: values[i + 1], t: span === 0 ? 0 : (x - values[i]) / span }
    }
  }
  return { lo: values[0], hi: values[0], t: 0 }
}

/** Cherche la ligne correspondant exactement à un triplet d'axes. */
function findRow(table, coords) {
  return table.find((r) => AXES.every((a) => r[a] === coords[a])) ?? null
}

/**
 * Interpolation trilinéaire d'une table de performance.
 * @param {Array} table
 * @param {{ pressureAltitude, temperature, weight }} query
 * @returns {{ groundRoll: number, over50ft: number }|null}
 */
export function interpolatePerformance(table, query) {
  if (!Array.isArray(table) || table.length === 0) return null

  const brackets = AXES.map((a) => bracket(axisValues(table, a), Number(query[a]) || 0))

  // 2^3 coins de la grille ; chaque coin pondéré par (1-t) ou t selon l'axe.
  const result = { groundRoll: 0, over50ft: 0 }
  let totalWeight = 0

  for (let mask = 0; mask < 8; mask++) {
    const coords = {}
    let w = 1
    for (let d = 0; d < AXES.length; d++) {
      const useHi = (mask >> d) & 1
      coords[AXES[d]] = useHi ? brackets[d].hi : brackets[d].lo
      w *= useHi ? brackets[d].t : 1 - brackets[d].t
    }
    if (w === 0) continue
    const row = findRow(table, coords)
    if (!row) continue
    for (const k of OUTPUTS) result[k] += w * (row[k] ?? 0)
    totalWeight += w
  }

  if (totalWeight === 0) {
    // Grille incomplète → repli plus proche voisin (axes normalisés).
    return nearestRow(table, query)
  }
  // Renormalise si certains coins manquaient.
  for (const k of OUTPUTS) result[k] /= totalWeight
  return result
}

/**
 * Lecture conservatrice POH : au lieu d'interpoler, on arrondit chaque axe
 * (altitude-pression, température/écart ISA, masse) à la valeur de table
 * **immédiatement supérieure** (clampée au max), puis on lit la ligne exacte.
 * C'est la règle « valeur immédiatement supérieure » du POH appliquée aux 3 axes —
 * toujours ≥ l'interpolation.
 * @param {Array} table
 * @param {{ pressureAltitude, temperature, weight }} query
 * @returns {{ groundRoll: number, over50ft: number }|null}
 */
export function conservativePerformance(table, query) {
  if (!Array.isArray(table) || table.length === 0) return null

  const coords = {}
  for (const a of AXES) {
    const values = axisValues(table, a)
    const x = Number(query[a]) || 0
    // Plus petite valeur ≥ x ; au-delà du max → clamp au max.
    coords[a] = values.find((v) => v >= x) ?? values[values.length - 1]
  }

  const row = findRow(table, coords)
  if (row) return { groundRoll: row.groundRoll ?? 0, over50ft: row.over50ft ?? 0 }
  // Grille incomplète → repli plus proche voisin sur les coords arrondies.
  return nearestRow(table, coords)
}

/** Repli : ligne la plus proche (distance euclidienne sur axes normalisés). */
function nearestRow(table, query) {
  const ranges = AXES.map((a) => {
    const vals = axisValues(table, a)
    return Math.max(1e-6, vals[vals.length - 1] - vals[0])
  })
  let best = null
  let bestDist = Infinity
  for (const row of table) {
    let d = 0
    AXES.forEach((a, i) => {
      d += (((Number(query[a]) || 0) - row[a]) / ranges[i]) ** 2
    })
    if (d < bestDist) {
      bestDist = d
      best = row
    }
  }
  return best ? { groundRoll: best.groundRoll ?? 0, over50ft: best.over50ft ?? 0 } : null
}

/**
 * Applique les corrections constructeur aux distances de base.
 *
 * Deux modèles de vent supportés :
 *  - **table de facteurs** (POH) : `corrections.headwind = [{kt, factor}, …]`
 *    (vent de face, multiplicatif, interpolé) + `corrections.tailwindPerKt`
 *    (vent arrière, ex. 0,05 = +5 %/kt) ;
 *  - **linéaire** (rétro-compat) : `headwindPer10kt` / `tailwindPer10kt` (additif).
 * Le revêtement est toujours un facteur multiplicatif (`corrections.surface[...]`).
 * La pente (`conditions.slopePercent`, montant > 0) applique
 * `corrections.slopePer1Percent` par % (défaut `DEFAULT_SLOPE_FACTOR_PER_PERCENT`).
 *
 * @param {{ groundRoll: number, over50ft: number }} base
 * @param {object} corrections
 * @param {object} conditions - { headwindComponent (kt, négatif = arrière), surface, slopePercent }
 */
export function applyCorrections(base, corrections = {}, conditions = {}) {
  if (!base) return null
  let factor = 1

  const wind = Number(conditions.headwindComponent) || 0
  if (wind >= 0) {
    if (Array.isArray(corrections.headwind)) {
      factor *= windFactor(corrections.headwind, wind)
    } else if (corrections.headwindPer10kt) {
      factor += (wind / 10) * corrections.headwindPer10kt
    }
  } else {
    const tail = Math.abs(wind)
    if (corrections.tailwindPerKt) {
      factor *= 1 + corrections.tailwindPerKt * tail
    } else if (corrections.tailwindPer10kt) {
      factor += (tail / 10) * corrections.tailwindPer10kt
    }
  }

  if (conditions.surface && corrections.surface && corrections.surface[conditions.surface]) {
    factor *= corrections.surface[conditions.surface]
  }

  const slope = Number(conditions.slopePercent) || 0
  if (slope) {
    const perPct = corrections.slopePer1Percent ?? DEFAULT_SLOPE_FACTOR_PER_PERCENT
    factor *= 1 + slope * perPct
  }

  factor = Math.max(0, factor)
  return {
    groundRoll: base.groundRoll * factor,
    over50ft: base.over50ft * factor,
    factor,
  }
}

/**
 * Calcul complet d'une phase (décollage ou atterrissage).
 * @param {object} perfPhase - { table, corrections }
 * @param {object} query - { pressureAltitude, temperature, weight }
 * @param {object} conditions - { headwindComponent, surface }
 */
export function computePerformance(perfPhase, query, conditions) {
  if (!perfPhase?.table) return null
  const base = interpolatePerformance(perfPhase.table, query)
  if (!base) return null
  const corrected = applyCorrections(base, perfPhase.corrections, conditions)

  // Lecture conservatrice POH (valeur immédiatement supérieure), mêmes corrections.
  const conservativeBase = conservativePerformance(perfPhase.table, query)
  const conservative = conservativeBase
    ? applyCorrections(conservativeBase, perfPhase.corrections, conditions)
    : null

  return { base, corrected, conservativeBase, conservative }
}
