/**
 * Utilitaires pour la gestion des dates
 */

/**
 * Retourne une classe CSS selon l'ancienneté de la date par rapport au seuil de fraîcheur
 * @param {string} date - Date ISO
 * @param {number} staleThresholdMs - Seuil en millisecondes (défaut: 2h)
 * @returns {string} - Classe CSS ('bg-warning q-px-sm q-ml-xs' si obsolète, '' sinon)
 */
export function getUpdateClass(date, staleThresholdMs = 2 * 60 * 60 * 1000) {
  if (!date) return ''
  const now = new Date()
  const d = new Date(date)
  const diffMs = now - d
  if (diffMs > staleThresholdMs) return 'bg-warning q-px-sm q-ml-xs'
  return ''
}

/**
 * Récupère un champ de fraicheur commun (generatedAt, isoNow, updatedAt, ...)
 * @param {Record<string, any>} payload - Objet JSON source
 * @param {string[]} fields - Liste triée par priorité des clés possibles
 * @returns {string|null}
 */
export function resolveUpdateTimestamp(payload, fields = ['generatedAt', 'isoNow', 'updatedAt']) {
  if (!payload || typeof payload !== 'object') {
    return null
  }

  for (const field of fields) {
    const value = payload[field]
    if (typeof value === 'string' && value.length > 0) {
      return value
    }
  }

  return null
}

/**
 * Parse une date au format personnalisé 'DD MM YYYY HH:mm' en Date UTC
 * @param {string} str - Date au format '31 12 2025 09:00'
 * @returns {Date} - Objet Date en UTC
 */
export function parseCustomDate(str) {
  // str: '31 12 2025 09:00' => '2025-12-31T09:00:00Z' (UTC)
  const [day, month, year, time] = str.split(/\s+/)
  return new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${time}:00Z`)
}

/**
 * Formate une date en UTC au format français
 * @param {string} dateStr - Date au format personnalisé
 * @returns {string} - Date formatée en français UTC
 */
export function formatDateUTC(dateStr) {
  const d = parseCustomDate(dateStr)
  return d.toLocaleString('fr-FR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  })
}

/**
 * Formate une date en heure locale au format français
 * @param {string} dateStr - Date au format personnalisé
 * @returns {string} - Date formatée en français (heure locale)
 */
export function formatDateLocal(dateStr) {
  const d = parseCustomDate(dateStr)
  return d.toLocaleString('fr-FR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

/**
 * Formate une date ISO en format français lisible
 * @param {string} isoDate - Date au format ISO (ex: "2026-01-01T13:10:09.522Z")
 * @returns {string} - Date formatée en français
 */
export function formatDate(isoDate) {
  if (!isoDate) return ''
  const date = new Date(isoDate)
  return date.toLocaleString('fr-FR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

/**
 * Formate une date ISO en format français lisible
 * @param {string} isoDate - Date au format ISO (ex: "2026-01-01T13:10:09.522Z")
 * @returns {string} - Date formatée en français
 */
export function formatDateOnly(isoDate) {
  if (!isoDate) return ''
  const date = new Date(isoDate)
  return date.toLocaleString('fr-FR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

/**
 * Retourne le label d'état d'un item (Périmé, Courant, Futur)
 * @param {Object} item - Item avec propriétés date et expiration
 * @returns {string} - Label d'état
 */
export function getChartStateLabel(item) {
  const now = new Date()
  const date = parseCustomDate(item.date)
  const expiration = parseCustomDate(item.expiration)
  if (expiration < now) return 'Périmé'
  if (date <= now && expiration > now) return 'Courant'
  if (date > now) return 'Futur'
  return ''
}

/**
 * Retourne la classe CSS selon l'état de l'item
 * @param {Object} item - Item avec propriétés date et expiration
 * @returns {string} - Classe CSS (perime, courant, futur)
 */
export function getChartStatusClass(item) {
  const label = getChartStateLabel(item)
  if (label === 'Périmé') return 'perime'
  if (label === 'Courant') return 'courant'
  if (label === 'Futur') return 'futur'
  return ''
}

/**
 * Formate le temps écoulé depuis une date de manière relative
 * @param {string} isoDate - Date au format ISO (ex: "2025-01-15T12:00:00Z")
 * @returns {string} - Temps écoulé formaté (ex: "il y a 2 jours")
 */
export function formatTimeAgo(isoDate) {
  if (!isoDate) return ''

  const now = new Date()
  const date = new Date(isoDate)
  const diffMs = now - date
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)
  const diffMonths = Math.floor(diffDays / 30)
  const diffYears = Math.floor(diffDays / 365)

  if (diffYears > 0) {
    return diffYears === 1 ? 'il y a 1 an' : `il y a ${diffYears} ans`
  }
  if (diffMonths > 0) {
    return diffMonths === 1 ? 'il y a 1 mois' : `il y a ${diffMonths} mois`
  }
  if (diffDays > 0) {
    return diffDays === 1 ? 'il y a 1 jour' : `il y a ${diffDays} jours`
  }
  if (diffHours > 0) {
    return diffHours === 1 ? 'il y a 1 heure' : `il y a ${diffHours} heures`
  }
  if (diffMins > 0) {
    return diffMins === 1 ? 'il y a 1 minute' : `il y a ${diffMins} minutes`
  }
  return "à l'instant"
}
