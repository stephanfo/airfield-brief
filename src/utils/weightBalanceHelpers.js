/**
 * Calculs de masse & centrage (FEAT-015) — purs, testables.
 *
 * Unités cohérentes avec le parseur `.aircraft` : bras en mm, masses en kg,
 * carburant en litres (converti en masse via la densité). Le moment est donc en
 * kg·mm ; comme le bras résultant = Σmoments / Σmasses, l'unité s'annule et le
 * CG ressort en mm (même repère que l'enveloppe). On ne convertit pas en mètres
 * pour rester strictement dans le repère du fichier source.
 */

/**
 * Masse (kg) d'un poste pour une valeur de chargement donnée.
 * Pour le carburant la valeur d'entrée est un volume (litres) → masse via densité.
 * @param {object} station - poste normalisé (type, arm, density…)
 * @param {number} value - kg (person/baggage) ou litres (fuel)
 */
export function stationMass(station, value) {
  const v = Number(value) || 0
  if (station?.type === 'fuel') {
    return v * (station.density || 0)
  }
  return v
}

/**
 * Construit le devis de masse à partir d'un avion et d'un chargement.
 * @param {object} aircraft - avion normalisé (emptyWeight, emptyArm, stations)
 * @param {Record<string, number>} loadout - valeurs par id de poste
 * @returns {{ rows: Array, totalWeight: number, totalMoment: number, cg: number|null }}
 */
export function computeLoadout(aircraft, loadout = {}) {
  if (!aircraft) {
    return { rows: [], totalWeight: 0, totalMoment: 0, cg: null }
  }

  const rows = []
  // Ligne avion à vide
  const emptyMoment = aircraft.emptyWeight * aircraft.emptyArm
  rows.push({
    id: '__empty__',
    label: 'Avion à vide',
    type: 'empty',
    mass: aircraft.emptyWeight,
    arm: aircraft.emptyArm,
    moment: emptyMoment,
  })

  let totalWeight = aircraft.emptyWeight
  let totalMoment = emptyMoment

  for (const station of aircraft.stations ?? []) {
    const input = loadout[station.id] ?? 0
    const mass = stationMass(station, input)
    const moment = mass * station.arm
    rows.push({
      id: station.id,
      label: station.label,
      type: station.type,
      input,
      mass,
      arm: station.arm,
      moment,
    })
    totalWeight += mass
    totalMoment += moment
  }

  const cg = totalWeight > 0 ? totalMoment / totalWeight : null
  return { rows, totalWeight, totalMoment, cg }
}

/**
 * Test point-dans-polygone (ray casting), arêtes incluses.
 * @param {{ arm: number, weight: number }} point
 * @param {Array<{ arm: number, weight: number }>} polygon
 */
export function pointInPolygon(point, polygon) {
  if (!point || !Array.isArray(polygon) || polygon.length < 3) return false
  const { arm: x, weight: y } = point
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].arm
    const yi = polygon[i].weight
    const xj = polygon[j].arm
    const yj = polygon[j].weight

    // Point sur une arête → considéré dans l'enveloppe
    if (onSegment(x, y, xi, yi, xj, yj)) return true

    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi
    if (intersect) inside = !inside
  }
  return inside
}

/** Vrai si (x,y) est sur le segment [(x1,y1),(x2,y2)] (tolérance flottante). */
function onSegment(x, y, x1, y1, x2, y2) {
  const cross = (x2 - x1) * (y - y1) - (y2 - y1) * (x - x1)
  if (Math.abs(cross) > 1e-6) return false
  const dot = (x - x1) * (x2 - x1) + (y - y1) * (y2 - y1)
  if (dot < 0) return false
  const lenSq = (x2 - x1) ** 2 + (y2 - y1) ** 2
  return dot <= lenSq
}

/**
 * État du centrage : dans l'enveloppe et sous la MTOW ?
 * @param {{ cg: number|null, totalWeight: number }} totals
 * @param {object} aircraft
 * @returns {{ inEnvelope: boolean, overWeight: boolean, ok: boolean }}
 */
export function evaluateCg(totals, aircraft) {
  const inEnvelope =
    totals.cg != null &&
    pointInPolygon({ arm: totals.cg, weight: totals.totalWeight }, aircraft?.envelope ?? [])
  const overWeight =
    !!aircraft?.maxTakeoffWeight && totals.totalWeight > aircraft.maxTakeoffWeight + 1e-6
  return { inEnvelope, overWeight, ok: inEnvelope && !overWeight }
}

/**
 * Point de centrage « arrivée » après consommation d'un volume de carburant.
 * On retire la masse de carburant brûlée à son bras de levier.
 * @param {object} aircraft
 * @param {{ totalWeight: number, totalMoment: number }} departure
 * @param {number} fuelBurnedLiters
 * @returns {{ totalWeight: number, cg: number|null }}
 */
export function computeArrival(aircraft, departure, fuelBurnedLiters) {
  const fuelStation = (aircraft?.stations ?? []).find((s) => s.type === 'fuel')
  if (!fuelStation || !departure) {
    return { totalWeight: departure?.totalWeight ?? 0, cg: departure?.cg ?? null }
  }
  const burnedMass = (Number(fuelBurnedLiters) || 0) * (fuelStation.density || 0)
  const totalWeight = Math.max(0, departure.totalWeight - burnedMass)
  const totalMoment = departure.totalMoment - burnedMass * fuelStation.arm
  const cg = totalWeight > 0 ? totalMoment / totalWeight : null
  return { totalWeight, totalMoment, cg }
}
