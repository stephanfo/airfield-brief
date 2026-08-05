import { defineStore } from 'pinia'
import { useStationWindHistoryStore } from './stationWindHistoryStore'
import { useStationAtmosphereStore } from './stationAtmosphereStore'
import { useStationWindCurrentStore } from './stationWindCurrentStore'

/**
 * Store coordinateur pour les données de la station météo locale.
 *
 * Ce coordinateur orchestre uniquement les actions globales.
 */
export const useStationStore = defineStore('station', () => {
  const windHistoryStore = useStationWindHistoryStore()
  const atmosphereStore = useStationAtmosphereStore()
  const windCurrentStore = useStationWindCurrentStore()

  // ============ ACTIONS ============

  /**
   * Charge les données des 3 sources en parallèle
   */
  const loadStation = async () => {
    await Promise.all([
      windHistoryStore.loadWindHistory(),
      atmosphereStore.loadAtmosphere(),
      windCurrentStore.loadWindCurrent(),
    ])
  }

  /**
   * Force le rafraîchissement des 3 sources (ignore le cache)
   */
  const forceRefresh = async () => {
    await Promise.all([
      windHistoryStore.forceRefresh(),
      atmosphereStore.forceRefresh(),
      windCurrentStore.forceRefresh(),
    ])
  }

  /**
   * Invalide le cache des 3 sources
   */
  const invalidate = () => {
    windHistoryStore.invalidate()
    atmosphereStore.invalidate()
    windCurrentStore.invalidate()
  }

  // ============ RETURN (INTERFACE PUBLIQUE) ============
  return {
    // Actions
    loadStation,
    forceRefresh,
    invalidate,
  }
})
