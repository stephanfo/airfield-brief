/**
 * Utilitaires de mise en forme des éphémérides (lever/coucher du soleil,
 * crépuscules civils, fin du jour aéronautique).
 *
 * IMPORTANT : aucun calcul astronomique ici. Les heures sont pré-calculées par
 * le workflow N8N (API IMCCE Miriade RTS) et servies dans public/data/ephemeris.json.
 * Ce module ne fait que du formatage et des diffs temporels. Fonctions pures :
 * `now` est toujours injecté en argument (testable, sans dépendance Vue).
 *
 * NUIT AÉRONAUTIQUE (France) : SERA (UE 923/2012) autorise l'autorité nationale à
 * prescrire une période autre que les crépuscules civils. La France a retenu
 * « coucher du soleil +30 min → lever du soleil −30 min ». On dérive donc les
 * bornes du jour aéronautique de sunrise/sunset (calculés par IMCCE), avec cet
 * offset réglementaire. Les crépuscules civils restent dans le JSON mais ne sont
 * PLUS la borne aéro (cf. ADR-023).
 */

/** Offset réglementaire FR de la nuit aéronautique, en minutes (cf. doc module). */
export const AERO_NIGHT_OFFSET_MIN = 30

/**
 * Vérifie qu'une entrée de jour contient les heures requises (lever/coucher au
 * minimum ; crépuscules civils tolérés absents car non utilisés pour la borne aéro).
 * @param {Object|null} d
 * @returns {boolean}
 */
function isValidDay(d) {
  return !!(d && d.sunrise && d.sunset)
}

/**
 * Décale une heure ISO d'un nombre de minutes (signé). Pur.
 * @param {string|null} isoString - Heure ISO 8601
 * @param {number} minutes - Décalage en minutes (négatif = avant)
 * @returns {string|null} ISO décalé, ou null si entrée nulle/invalide.
 */
export function addMinutes(isoString, minutes) {
  if (!isoString) return null
  const t = new Date(isoString).getTime()
  if (Number.isNaN(t)) return null
  // Sans millisecondes, pour rester homogène avec le format du JSON IMCCE (`…:00Z`).
  return new Date(t + minutes * 60000).toISOString().slice(0, 19) + 'Z'
}

/**
 * Extrait la liste ordonnée et validée des jours d'éphémérides du payload.
 * Accepte le format `days[]` (multi-jours, IMCCE -nbd=N) et, par rétro-compatibilité,
 * l'ancien format mono-jour `{ today, tomorrow }`.
 *
 * @param {Object|null} rawData - Contenu de ephemeris.json
 * @returns {Array<{ date: string|null, civilDawn?: string, sunrise: string, sunset: string, civilDusk?: string }>}
 *   Tableau (éventuellement vide) de jours valides.
 */
export function getDays(rawData) {
  if (Array.isArray(rawData?.days)) {
    return rawData.days.filter(isValidDay).map((d) => ({
      date: d.date ?? null,
      civilDawn: d.civilDawn,
      sunrise: d.sunrise,
      sunset: d.sunset,
      civilDusk: d.civilDusk,
    }))
  }
  // Rétro-compat : ancien format mono-jour
  const t = rawData?.today
  if (isValidDay(t)) {
    return [
      {
        date: rawData.calcDate ?? null,
        civilDawn: t.civilDawn,
        sunrise: t.sunrise,
        sunset: t.sunset,
        civilDusk: t.civilDusk,
      },
    ]
  }
  return []
}

/**
 * Index du jour courant dans la liste (par date calendaire UTC). Retombe sur 0
 * si aucune correspondance (ex. fichier en avance/retard d'un jour).
 *
 * @param {Object|null} rawData
 * @param {number} nowMs - Instant courant (epoch ms)
 * @returns {number} Index (0 si liste vide ou pas de correspondance).
 */
export function findTodayIndex(rawData, nowMs) {
  const days = getDays(rawData)
  if (days.length === 0) return 0
  const todayKey = new Date(nowMs).toISOString().slice(0, 10)
  const idx = days.findIndex((d) => (d.date ?? d.sunrise?.slice(0, 10)) === todayKey)
  return idx >= 0 ? idx : 0
}

/**
 * Normalise un jour donné du payload en objet exploitable, en y rattachant le jour
 * suivant (utile pour le compte à rebours nocturne « début du jour aéro de demain »).
 *
 * `aeroDawn`/`aeroDusk` = bornes du jour aéronautique FR (lever −30 / coucher +30).
 *
 * @param {Object|null} rawData - Contenu de ephemeris.json
 * @param {number} [dayIndex=0] - Index du jour voulu dans `days[]`
 * @returns {{
 *   sunrise: string, sunset: string, civilDawn?: string, civilDusk?: string,
 *   aeroDawn: string, aeroDusk: string,
 *   date: string|null, lat: number|null, lon: number|null,
 *   next: { aeroDawn: string|null, sunrise: string|null }|null
 * }|null} Objet normalisé, ou null si données absentes/index invalide.
 */
export function parseEphemeris(rawData, dayIndex = 0) {
  const days = getDays(rawData)
  const day = days[dayIndex]
  if (!day) return null

  const nextDay = days[dayIndex + 1]
  const next = nextDay
    ? { aeroDawn: addMinutes(nextDay.sunrise, -AERO_NIGHT_OFFSET_MIN), sunrise: nextDay.sunrise }
    : null

  return {
    sunrise: day.sunrise,
    sunset: day.sunset,
    civilDawn: day.civilDawn,
    civilDusk: day.civilDusk,
    aeroDawn: addMinutes(day.sunrise, -AERO_NIGHT_OFFSET_MIN),
    aeroDusk: addMinutes(day.sunset, AERO_NIGHT_OFFSET_MIN),
    date: day.date,
    lat: rawData.observer?.lat ?? null,
    lon: rawData.observer?.lon ?? null,
    next,
  }
}

/**
 * Formate une heure ISO en heure locale française + UTC.
 *
 * @param {string|null} isoString - Heure au format ISO 8601 (ex: "2026-05-31T19:43:00Z")
 * @returns {{ local: string, utc: string, combined: string }} Heures formatées HH:mm.
 *   `combined` = "HH:mm (HH:mm UTC)". Retourne des tirets si entrée nulle/invalide.
 */
export function formatLocalUTC(isoString) {
  if (!isoString) return { local: '—', utc: '—', combined: '—' }
  const d = new Date(isoString)
  if (Number.isNaN(d.getTime())) return { local: '—', utc: '—', combined: '—' }

  const opts = { hour: '2-digit', minute: '2-digit', hour12: false }
  const local = d.toLocaleTimeString('fr-FR', opts)
  const utc = d.toLocaleTimeString('fr-FR', { ...opts, timeZone: 'UTC' })
  return { local, utc, combined: `${local} (${utc} UTC)` }
}

/**
 * Millisecondes restantes avant une heure cible.
 *
 * @param {string|null} targetIso - Heure cible ISO
 * @param {number} nowMs - Instant courant (epoch ms)
 * @returns {number|null} ms restants (négatif si la cible est passée), null si pas de cible.
 */
export function timeUntil(targetIso, nowMs) {
  if (!targetIso) return null
  const t = new Date(targetIso).getTime()
  if (Number.isNaN(t)) return null
  return t - nowMs
}

/**
 * Formate une durée en texte court français.
 *
 * @param {number|null} ms - Durée en millisecondes
 * @returns {string} Ex: "2 h 35", "45 min", "< 1 min". '—' si null ; '0 min' si <= 0.
 */
export function formatDuration(ms) {
  if (ms == null) return '—'
  if (ms <= 0) return '0 min'
  const totalMin = Math.floor(ms / 60000)
  if (totalMin < 1) return '< 1 min'
  const hours = Math.floor(totalMin / 60)
  const minutes = totalMin % 60
  if (hours === 0) return `${minutes} min`
  return `${hours} h ${String(minutes).padStart(2, '0')}`
}

/**
 * Détermine l'état lumineux courant à partir des éphémérides.
 *
 * Bornes : avant l'aube aéro (lever −30) → nuit ; aube aéro → lever → crépuscule (aube) ;
 * lever → coucher → jour ; coucher → fin du jour aéro (coucher +30) → crépuscule (fin de jour) ;
 * au-delà de la fin du jour aéro → nuit aéronautique.
 *
 * @param {ReturnType<typeof parseEphemeris>} eph - Éphémérides normalisées (ou null)
 * @param {number} nowMs - Instant courant (epoch ms)
 * @returns {{ state: 'day'|'twilight'|'night', label: string, color: 'green'|'orange'|'grey' }}
 */
export function getDaylightState(eph, nowMs) {
  if (!eph) {
    return { state: 'night', label: 'Indisponible', color: 'grey' }
  }

  const dawn = new Date(eph.aeroDawn).getTime()
  const sunrise = new Date(eph.sunrise).getTime()
  const sunset = new Date(eph.sunset).getTime()
  const dusk = new Date(eph.aeroDusk).getTime()

  if (nowMs < dawn || nowMs >= dusk) {
    return { state: 'night', label: 'Nuit aéronautique', color: 'grey' }
  }
  if (nowMs >= sunrise && nowMs < sunset) {
    return { state: 'day', label: 'Jour', color: 'green' }
  }
  // Entre aube aéro et lever, ou entre coucher et fin du jour aéro
  return { state: 'twilight', label: 'Crépuscule aéronautique', color: 'orange' }
}

/**
 * Détermine le prochain événement pertinent à afficher (compte à rebours).
 *
 * En journée : prochain coucher puis fin du jour aéronautique (coucher +30).
 * La nuit tombée : début du jour aéronautique du jour suivant (`eph.next.aeroDawn`),
 * à défaut le lever du jour suivant ; null si aucun jour suivant n'est fourni.
 *
 * @param {ReturnType<typeof parseEphemeris>} eph - Éphémérides normalisées (ou null)
 * @param {number} nowMs - Instant courant (epoch ms)
 * @returns {{ key: string, label: string, iso: string, msUntil: number, nextDay: boolean }|null}
 *   `nextDay` vrai si la cible appartient au jour suivant.
 */
export function getNextEvent(eph, nowMs) {
  if (!eph) return null

  const candidates = [
    { key: 'sunset', label: 'Coucher du soleil', iso: eph.sunset, nextDay: false },
    { key: 'aeroDusk', label: 'Nuit aéronautique', iso: eph.aeroDusk, nextDay: false },
  ]

  for (const c of candidates) {
    const msUntil = new Date(c.iso).getTime() - nowMs
    if (msUntil > 0) {
      return { ...c, msUntil }
    }
  }

  // Tout est passé → on est dans la nuit : viser le DÉBUT du jour aéronautique du
  // jour suivant (lever −30 = aeroDawn), pendant symétrique de aeroDusk et moment
  // où le VFR de jour redevient possible. On retombe sur le lever (sunrise)
  // seulement si aeroDawn n'est pas fourni.
  if (eph.next?.aeroDawn) {
    const msUntil = new Date(eph.next.aeroDawn).getTime() - nowMs
    return {
      key: 'aeroDawnNext',
      label: 'Début du jour aéronautique',
      iso: eph.next.aeroDawn,
      msUntil,
      nextDay: true,
    }
  }
  if (eph.next?.sunrise) {
    const msUntil = new Date(eph.next.sunrise).getTime() - nowMs
    return {
      key: 'sunriseNext',
      label: 'Lever du soleil (demain)',
      iso: eph.next.sunrise,
      msUntil,
      nextDay: true,
    }
  }

  return null
}

/**
 * Construit la liste ordonnée des événements de la journée pour un affichage détaillé
 * (page dédiée), avec la durée du jour et du jour aéronautique.
 *
 * @param {ReturnType<typeof parseEphemeris>} eph - Éphémérides normalisées (ou null)
 * @returns {{
 *   events: Array<{ key: string, label: string, iso: string, icon: string }>,
 *   dayLength: number|null,
 *   aeroDayLength: number|null
 * }|null} null si données absentes.
 */
export function getDayMetrics(eph) {
  if (!eph) return null

  const events = [
    { key: 'aeroDawn', label: 'Aube aéronautique', iso: eph.aeroDawn, icon: 'wb_twilight' },
    { key: 'sunrise', label: 'Lever du soleil', iso: eph.sunrise, icon: 'wb_sunny' },
    { key: 'sunset', label: 'Coucher du soleil', iso: eph.sunset, icon: 'wb_twilight' },
    { key: 'aeroDusk', label: 'Fin du jour aéronautique', iso: eph.aeroDusk, icon: 'nightlight' },
  ]

  const dayLength = new Date(eph.sunset).getTime() - new Date(eph.sunrise).getTime()
  const aeroDayLength = new Date(eph.aeroDusk).getTime() - new Date(eph.aeroDawn).getTime()

  return {
    events,
    dayLength: Number.isNaN(dayLength) ? null : dayLength,
    aeroDayLength: Number.isNaN(aeroDayLength) ? null : aeroDayLength,
  }
}
