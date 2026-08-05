import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useWeatherStore } from '../stores/weatherStore'
import { useNotamStore } from '../stores/notamStore'
import { useAzbaStore } from '../stores/azbaStore'
import { useTemsiStore } from '../stores/temsiStore'
import { useWintemStore } from '../stores/wintemStore'
import { useVacStore } from '../stores/vacStore'
import { useStationWindHistoryStore } from '../stores/stationWindHistoryStore'
import { useStationAtmosphereStore } from '../stores/stationAtmosphereStore'
import { useStationWindCurrentStore } from '../stores/stationWindCurrentStore'
import { useThermalForecastStore } from '../stores/thermalForecastStore'
import { useEphemerisStore } from '../stores/ephemerisStore'
import { useAircraftStore } from '../stores/aircraftStore'
import { useRexFfaStore } from '../stores/rexFfaStore'
import { isFeatureEnabled } from '../config/features'

/**
 * Agrège l'état de santé de tous les stores de données pour le diagnostic
 * (page Info système). Retourne un computed `storesStatus` : un item par
 * store avec libellé, état de chargement/erreur, timestamps de cache et
 * action de rafraîchissement.
 *
 * Les stores Pinia étant des singletons, ce composable peut être appelé
 * par plusieurs composants (page + sections) sans duplication d'état.
 */
export function useStoresStatus() {
  const weatherStore = useWeatherStore()
  const notamStore = useNotamStore()
  const azbaStore = useAzbaStore()
  const temsiStore = useTemsiStore()
  const wintemStore = useWintemStore()
  const vacStore = useVacStore()
  const stationWindHistoryStore = useStationWindHistoryStore()
  const stationAtmosphereStore = useStationAtmosphereStore()
  const stationWindCurrentStore = useStationWindCurrentStore()
  const thermalForecastStore = useThermalForecastStore()
  const ephemerisStore = useEphemerisStore()
  const aircraftStore = useAircraftStore()
  const rexFfaStore = useRexFfaStore()

  const {
    loading: weatherLoading,
    error: weatherError,
    generatedAt: weatherTimestamp,
    lastFetchedAt: weatherLastFetchedAt,
    nextRefreshAt: weatherNextRefreshAt,
  } = storeToRefs(weatherStore)
  const {
    loading: notamLoading,
    error: notamError,
    generatedAt: notamTimestamp,
    lastFetchedAt: notamLastFetchedAt,
    nextRefreshAt: notamNextRefreshAt,
  } = storeToRefs(notamStore)
  const {
    loading: azbaLoading,
    error: azbaError,
    generatedAt: azbaTimestamp,
    lastFetchedAt: azbaLastFetchedAt,
    nextRefreshAt: azbaNextRefreshAt,
  } = storeToRefs(azbaStore)
  const {
    loading: temsiLoading,
    error: temsiError,
    generatedAt: temsiTimestamp,
    lastFetchedAt: temsiLastFetchedAt,
    nextRefreshAt: temsiNextRefreshAt,
  } = storeToRefs(temsiStore)
  const {
    loading: wintemLoading,
    error: wintemError,
    generatedAt: wintemTimestamp,
    lastFetchedAt: wintemLastFetchedAt,
    nextRefreshAt: wintemNextRefreshAt,
  } = storeToRefs(wintemStore)
  const {
    loading: vacLoading,
    error: vacError,
    generatedAt: vacTimestamp,
    lastFetchedAt: vacLastFetchedAt,
    nextRefreshAt: vacNextRefreshAt,
  } = storeToRefs(vacStore)
  const {
    loading: windHistoryLoading,
    error: windHistoryError,
    lastFetchedAt: windHistoryLastFetchedAt,
    nextRefreshAt: windHistoryNextRefreshAt,
    generatedAt: windHistoryTimestamp,
  } = storeToRefs(stationWindHistoryStore)
  const {
    loading: atmosphereLoading,
    error: atmosphereError,
    lastFetchedAt: atmosphereLastFetchedAt,
    nextRefreshAt: atmosphereNextRefreshAt,
    generatedAt: atmosphereTimestamp,
  } = storeToRefs(stationAtmosphereStore)
  const {
    loading: windCurrentLoading,
    error: windCurrentError,
    lastFetchedAt: windCurrentLastFetchedAt,
    nextRefreshAt: windCurrentNextRefreshAt,
    generatedAt: windCurrentTimestamp,
  } = storeToRefs(stationWindCurrentStore)
  const {
    loading: thermalLoading,
    error: thermalError,
    generatedAt: thermalTimestamp,
    lastFetchedAt: thermalLastFetchedAt,
    nextRefreshAt: thermalNextRefreshAt,
  } = storeToRefs(thermalForecastStore)
  const {
    loading: ephemerisLoading,
    error: ephemerisError,
    generatedAt: ephemerisTimestamp,
    lastFetchedAt: ephemerisLastFetchedAt,
    nextRefreshAt: ephemerisNextRefreshAt,
  } = storeToRefs(ephemerisStore)
  const {
    loading: aircraftLoading,
    error: aircraftError,
    generatedAt: aircraftTimestamp,
    lastFetchedAt: aircraftLastFetchedAt,
    nextRefreshAt: aircraftNextRefreshAt,
  } = storeToRefs(aircraftStore)
  const {
    loading: rexFfaLoading,
    error: rexFfaError,
    generatedAt: rexFfaTimestamp,
    lastFetchedAt: rexFfaLastFetchedAt,
    nextRefreshAt: rexFfaNextRefreshAt,
  } = storeToRefs(rexFfaStore)

  /** Construit l'item de statut d'un store à partir de ses refs. */
  const buildEntry = ({
    name,
    label,
    icon,
    loading,
    error,
    timestamp,
    lastFetchedAt,
    nextRefreshAt,
    refresh,
    feature,
  }) => ({
    name,
    label,
    icon,
    feature,
    loading: loading.value,
    error: error.value,
    timestamp: timestamp.value,
    lastFetchedAt: lastFetchedAt.value,
    nextRefreshAt: nextRefreshAt.value,
    color: error.value ? 'negative' : loading.value ? 'warning' : 'positive',
    status: error.value ? `Erreur: ${error.value}` : loading.value ? 'Chargement...' : 'OK',
    refresh,
  })

  // `feature` rattache une entrée à un module optionnel (ADR-030) : désactivé
  // dans `club.config.js`, le store correspondant disparaît du diagnostic et
  // n'est ni chargé ni rafraîchi.
  const allEntries = () => [
    buildEntry({
      name: 'weather',
      label: 'Météo AI',
      icon: 'cloud',
      loading: weatherLoading,
      error: weatherError,
      timestamp: weatherTimestamp,
      lastFetchedAt: weatherLastFetchedAt,
      nextRefreshAt: weatherNextRefreshAt,
      refresh: () => weatherStore.forceRefresh(),
    }),
    buildEntry({
      name: 'notam',
      label: 'NOTAM',
      icon: 'campaign',
      loading: notamLoading,
      error: notamError,
      timestamp: notamTimestamp,
      lastFetchedAt: notamLastFetchedAt,
      nextRefreshAt: notamNextRefreshAt,
      refresh: () => notamStore.forceRefresh(),
    }),
    buildEntry({
      name: 'azba',
      label: 'Zones AZBA',
      icon: 'airplanemode_active',
      loading: azbaLoading,
      error: azbaError,
      timestamp: azbaTimestamp,
      lastFetchedAt: azbaLastFetchedAt,
      nextRefreshAt: azbaNextRefreshAt,
      refresh: () => azbaStore.forceRefresh(),
    }),
    buildEntry({
      name: 'temsi',
      label: 'Cartes TEMSI',
      icon: 'map',
      loading: temsiLoading,
      error: temsiError,
      timestamp: temsiTimestamp,
      lastFetchedAt: temsiLastFetchedAt,
      nextRefreshAt: temsiNextRefreshAt,
      refresh: () => temsiStore.forceRefresh(),
    }),
    buildEntry({
      name: 'wintem',
      label: 'Cartes WINTEM',
      icon: 'air',
      loading: wintemLoading,
      error: wintemError,
      timestamp: wintemTimestamp,
      lastFetchedAt: wintemLastFetchedAt,
      nextRefreshAt: wintemNextRefreshAt,
      refresh: () => wintemStore.forceRefresh(),
    }),
    buildEntry({
      name: 'vac',
      label: 'Cartes VAC',
      icon: 'flight_land',
      loading: vacLoading,
      error: vacError,
      timestamp: vacTimestamp,
      lastFetchedAt: vacLastFetchedAt,
      nextRefreshAt: vacNextRefreshAt,
      refresh: () => vacStore.forceRefresh(),
    }),
    // Station météo locale - 3 sources séparées
    buildEntry({
      name: 'stationWindHistory',
      label: 'Historique vent',
      icon: 'air',
      loading: windHistoryLoading,
      error: windHistoryError,
      timestamp: windHistoryTimestamp,
      lastFetchedAt: windHistoryLastFetchedAt,
      nextRefreshAt: windHistoryNextRefreshAt,
      refresh: () => stationWindHistoryStore.forceRefresh(),
      feature: 'station',
    }),
    buildEntry({
      name: 'stationAtmosphere',
      label: 'Atmosphère',
      icon: 'thermostat',
      loading: atmosphereLoading,
      error: atmosphereError,
      timestamp: atmosphereTimestamp,
      lastFetchedAt: atmosphereLastFetchedAt,
      nextRefreshAt: atmosphereNextRefreshAt,
      refresh: () => stationAtmosphereStore.forceRefresh(),
      feature: 'station',
    }),
    buildEntry({
      name: 'stationWindCurrent',
      label: 'Vent actuel',
      icon: 'sensors',
      loading: windCurrentLoading,
      error: windCurrentError,
      timestamp: windCurrentTimestamp,
      lastFetchedAt: windCurrentLastFetchedAt,
      nextRefreshAt: windCurrentNextRefreshAt,
      refresh: () => stationWindCurrentStore.forceRefresh(),
      feature: 'station',
    }),
    buildEntry({
      name: 'thermalForecast',
      label: 'Stress thermique',
      icon: 'thermostat',
      loading: thermalLoading,
      error: thermalError,
      timestamp: thermalTimestamp,
      lastFetchedAt: thermalLastFetchedAt,
      nextRefreshAt: thermalNextRefreshAt,
      refresh: () => thermalForecastStore.forceRefresh(),
      feature: 'thermal',
    }),
    buildEntry({
      name: 'ephemeris',
      label: 'Éphémérides',
      icon: 'dark_mode',
      loading: ephemerisLoading,
      error: ephemerisError,
      timestamp: ephemerisTimestamp,
      lastFetchedAt: ephemerisLastFetchedAt,
      nextRefreshAt: ephemerisNextRefreshAt,
      refresh: () => ephemerisStore.forceRefresh(),
    }),
    buildEntry({
      name: 'aircrafts',
      label: 'Avions',
      icon: 'flight_takeoff',
      loading: aircraftLoading,
      error: aircraftError,
      timestamp: aircraftTimestamp,
      lastFetchedAt: aircraftLastFetchedAt,
      nextRefreshAt: aircraftNextRefreshAt,
      refresh: () => aircraftStore.forceRefresh(),
      feature: 'aircraft',
    }),
    buildEntry({
      name: 'rexFfa',
      label: 'REX Sécurité',
      icon: 'health_and_safety',
      loading: rexFfaLoading,
      error: rexFfaError,
      timestamp: rexFfaTimestamp,
      lastFetchedAt: rexFfaLastFetchedAt,
      nextRefreshAt: rexFfaNextRefreshAt,
      refresh: () => rexFfaStore.forceRefresh(),
      feature: 'rex',
    }),
  ]

  const storesStatus = computed(() =>
    allEntries().filter((entry) => isFeatureEnabled(entry.feature)),
  )

  /**
   * Rafraîchit en parallèle tous les stores affichés — dérivé de la même liste
   * que `storesStatus`, donc jamais désynchronisé des modules désactivés.
   */
  const refreshAllStores = () => Promise.all(storesStatus.value.map((entry) => entry.refresh()))

  /**
   * Charge tous les stores au montage du diagnostic, pour que chaque entrée
   * affiche son état de cache sans avoir d'abord visité la page concernée.
   */
  const loadAllStores = () => {
    if (isFeatureEnabled('station')) {
      stationWindHistoryStore.loadWindHistory()
      stationAtmosphereStore.loadAtmosphere()
      stationWindCurrentStore.loadWindCurrent()
    }
    if (isFeatureEnabled('thermal')) thermalForecastStore.loadForecast()
    ephemerisStore.loadEphemeris()
    if (isFeatureEnabled('aircraft')) aircraftStore.loadAircrafts()
    if (isFeatureEnabled('rex')) rexFfaStore.loadRexFfa()
  }

  return {
    storesStatus,
    refreshAllStores,
    loadAllStores,
  }
}
