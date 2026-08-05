/**
 * Bilan carburant (FEAT-021) — pur, testable.
 *
 * Reprend les paramètres réglementaires du fichier `.aircraft` (taxi, réserve
 * finale, contingence) et la conso croisière. Volumes en litres, masse via densité.
 * Réserve VFR jour par défaut : 30 min (paramétrable, valeur du XML si fournie).
 */

/**
 * @param {object} params
 * @param {number} params.cruiseBurn - conso croisière (L/h)
 * @param {number} params.tripMinutes - durée du vol prévue (min)
 * @param {number} [params.alternateMinutes] - dégagement (min)
 * @param {number} [params.reserveMinutes] - réserve finale (min, défaut 30)
 * @param {number} [params.taxiFuel] - carburant roulage (L)
 * @param {number} [params.contingency] - taux contingence (ex. 0.05)
 * @param {number} [params.density] - densité carburant (kg/L)
 * @param {number} [params.tankCapacity] - capacité utilisable réservoir (L)
 * @param {number} [params.margin] - marge de confort sur le volume conseillé (L)
 * @returns {object} détail du bilan
 */
export function computeFuelPlan({
  cruiseBurn,
  tripMinutes,
  alternateMinutes = 0,
  reserveMinutes = 30,
  taxiFuel = 0,
  contingency = 0,
  density = 0.72,
  tankCapacity = null,
  margin = 0,
} = {}) {
  const burn = Number(cruiseBurn) || 0
  const perMin = burn / 60

  const tripFuel = perMin * (Number(tripMinutes) || 0)
  const alternateFuel = perMin * (Number(alternateMinutes) || 0)
  const reserveFuel = perMin * (Number(reserveMinutes) || 0)
  const contingencyFuel = tripFuel * (Number(contingency) || 0)
  const taxi = Number(taxiFuel) || 0

  const minimum = taxi + tripFuel + contingencyFuel + alternateFuel + reserveFuel
  const recommended = minimum + (Number(margin) || 0)

  const usable = tankCapacity == null ? null : Number(tankCapacity)
  const overCapacity = usable != null && minimum > usable + 1e-6

  return {
    breakdown: {
      taxi,
      trip: tripFuel,
      contingency: contingencyFuel,
      alternate: alternateFuel,
      reserve: reserveFuel,
    },
    minimum,
    recommended,
    minimumMass: minimum * density,
    recommendedMass: recommended * density,
    tripFuel,
    tankCapacity: usable,
    overCapacity,
  }
}
