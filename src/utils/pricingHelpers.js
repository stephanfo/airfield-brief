/**
 * Calcul du tarif de vol (FEAT-017) — pur, testable.
 * Tarif horaire unique par avion (depuis `.aircraft`, `HourlyCost`).
 */

/**
 * @param {object} params
 * @param {number} params.hourlyRate - tarif horaire
 * @param {number} params.durationMinutes - durée de vol brute (min)
 * @param {number} [params.deductionMinutes] - minutes déduites (chauffe + roulage)
 * @param {string} [params.currency]
 * @returns {object} récapitulatif
 */
export function computeFlightCost({
  hourlyRate,
  durationMinutes,
  deductionMinutes = 0,
  currency = 'EUR',
} = {}) {
  const rate = Number(hourlyRate) || 0
  const gross = Math.max(0, Number(durationMinutes) || 0)
  const deduction = Math.max(0, Number(deductionMinutes) || 0)
  const billedMinutes = Math.max(0, gross - deduction)
  const total = (rate * billedMinutes) / 60

  return {
    grossMinutes: gross,
    deductionMinutes: deduction,
    billedMinutes,
    hourlyRate: rate,
    total,
    currency,
  }
}

/** Formate un montant avec sa devise (fr-FR). */
export function formatCurrency(amount, currency = 'EUR') {
  try {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(amount)
  } catch {
    return `${(Number(amount) || 0).toFixed(2)} ${currency}`
  }
}

/** Formate une durée en minutes → "1 h 25" (ou "45 min"). */
export function formatMinutes(minutes) {
  const m = Math.max(0, Math.round(Number(minutes) || 0))
  const h = Math.floor(m / 60)
  const rem = m % 60
  if (h === 0) return `${rem} min`
  return `${h} h ${String(rem).padStart(2, '0')}`
}
