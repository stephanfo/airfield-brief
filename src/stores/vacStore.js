/**
 * Store Pinia pour la gestion des cartes VAC (Visual Approach Charts)
 *
 * Gère :
 * - Chargement et cache des données VAC
 * - Calcul de distance par rapport au terrain de rattachement
 * - Tri par proximité
 */

import { defineStore } from 'pinia'
import { computed } from 'vue'
import { useDataFetcher } from '../composables/useDataFetcher'
import { getEndpointConfig } from '../config/app.config'
import { CLUB_CONFIG } from '../config/club.config'
import { resolveUpdateTimestamp } from '../utils/dateHelpers'

const vacConfig = getEndpointConfig('vac')

// Coordonnées de référence : terrain de rattachement (ADR-030)
const HOME_LAT = CLUB_CONFIG.airfield.lat
const HOME_LON = CLUB_CONFIG.airfield.lon
const HOME_ICAO = CLUB_CONFIG.airfield.icao

/**
 * Calcule la distance entre deux points géographiques (formule de Haversine)
 * @param {number} lat1 - Latitude du point 1 en degrés décimaux
 * @param {number} lon1 - Longitude du point 1 en degrés décimaux
 * @param {number} lat2 - Latitude du point 2 en degrés décimaux
 * @param {number} lon2 - Longitude du point 2 en degrés décimaux
 * @returns {number} Distance en kilomètres
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371 // Rayon de la Terre en km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * Convertit une distance en kilomètres vers des milles nautiques
 * @param {number} km - Distance en kilomètres
 * @returns {number} Distance en milles nautiques
 */
function kmToNauticalMiles(km) {
  return km / 1.852
}

export const useVacStore = defineStore('vac', () => {
  const {
    data: rawData,
    fetchData,
    refetch,
    invalidate,
    loading,
    error,
    isRefreshing,
    lastFetchedAt,
    nextRefreshAt,
  } = useDataFetcher(vacConfig.url, {
    ttl: vacConfig.refreshInterval,
    staleWhileRevalidate: true,
    deduplicate: true,
    persist: true,
    errorLabel: 'cartes VAC',
  })

  const generatedAt = computed(() => resolveUpdateTimestamp(rawData.value))
  const airac = computed(() => rawData.value?.airac || null)

  // ============================================
  // Computed
  // ============================================

  /**
   * Liste des aérodromes avec cartes VAC, enrichie avec la distance depuis le
   * terrain de rattachement. Triée par proximité croissante.
   */
  const vacsSortedByProximity = computed(() => {
    const vacs = rawData.value?.vacs || []

    return [...vacs]
      .map((aerodrome) => {
        const distanceKm = calculateDistance(
          HOME_LAT,
          HOME_LON,
          aerodrome.latitude,
          aerodrome.longitude,
        )
        const distanceNm = kmToNauticalMiles(distanceKm)

        return {
          ...aerodrome,
          distanceKm,
          distanceNm,
          isHomeField: aerodrome.icao === HOME_ICAO,
        }
      })
      .sort((a, b) => a.distanceKm - b.distanceKm)
  })

  /**
   * Informations AIRAC formatées
   */
  const airacInfo = computed(() => {
    if (!airac.value) return null

    return {
      cycle: airac.value.airac || '',
      validFrom: airac.value.validFrom || null,
      validTo: airac.value.validTo || null,
      eAIP: airac.value.eAIP || '',
    }
  })

  // ============================================
  // Actions
  // ============================================

  /**
   * Charge les données VAC depuis l'API
   */
  const loadVac = () => fetchData()

  /**
   * Force le rechargement (ignore le cache)
   */
  const forceRefresh = () => refetch()

  return {
    // State
    rawData,
    generatedAt,
    loading,
    error,
    isRefreshing,
    lastFetchedAt,
    nextRefreshAt,

    // Computed
    vacsSortedByProximity,
    airacInfo,

    // Actions
    loadVac,
    forceRefresh,
    invalidate,
  }
})
