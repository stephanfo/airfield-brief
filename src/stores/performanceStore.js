import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useAircraftStore } from './aircraftStore'
import { useWeightBalanceStore } from './weightBalanceStore'
import { useWeatherStore } from './weatherStore'
import { pressureAltitude, isaTemp, computePerformance } from '../utils/performanceHelpers'
import { calculateWindComponents, getActiveRunway } from '../utils/windHelpers'
import { runwayLengthFor } from '../utils/airfieldHelpers'
import { CLUB_CONFIG } from '../config/club.config'

/**
 * Store performances décollage/atterrissage (FEAT-016).
 *
 * Les entrées sont pré-remplies puis restent modifiables (null = pré-remplissage
 * automatique ; dès qu'un champ est saisi, il fige sa valeur) :
 *  - température / QNH        ← METAR du terrain (`weatherStore`)
 *  - masse                    ← calcul de centrage (`weightBalanceStore`)
 *  - altitude / longueur /
 *    revêtement de piste      ← terrain (`club.config.js`)
 *  - composante vent          ← vent METAR projeté sur l'axe de piste (face,
 *    QFU actif into-wind, via `windHelpers`)
 */
export const usePerformanceStore = defineStore('performance', () => {
  const aircraftStore = useAircraftStore()
  const wbStore = useWeightBalanceStore()
  const weatherStore = useWeatherStore()

  const aircraft = computed(() => aircraftStore.selectedAircraft)

  // Valeurs saisies (null = utiliser le pré-remplissage automatique).
  const temperature = ref(null)
  const qnh = ref(null)
  const weight = ref(null)
  const windComponent = ref(null) // kt, positif = vent de face
  const surface = ref(null)
  const elevationFt = ref(null)
  const runwayLengthM = ref(null)
  const slopePercent = ref(0) // pente piste décollage, % (montant > 0)

  // Valeurs météo courantes (METAR/observation du terrain).
  const weatherCurrent = computed(() => weatherStore.rawData?.current ?? null)

  // ===== Pré-remplissages terrain (club.config.js, ADR-030) =====
  const runwayHeading = computed(() => CLUB_CONFIG.airfield.runwayHeading)
  const effElevationFt = computed(() =>
    elevationFt.value != null ? elevationFt.value : CLUB_CONFIG.airfield.elevationFt,
  )
  // La longueur dépend du QFU actif (un seuil peut offrir une distance différente).
  const effRunwayLengthM = computed(() =>
    runwayLengthM.value != null
      ? runwayLengthM.value
      : runwayLengthFor(autoWind.value.activeRunway),
  )
  const effSurface = computed(() =>
    surface.value != null ? surface.value : CLUB_CONFIG.airfield.surface,
  )

  // ===== Vent : projeté sur l'axe de piste, on décolle/atterrit face au vent =====
  // QFU actif = celui qui donne une composante de face ≥ 0 ; la distance n'utilise
  // que la magnitude de la composante de face (le traversier ne joue pas ici).
  const autoWind = computed(() => {
    const cur = weatherCurrent.value
    if (!cur || cur.wind_direction == null || cur.wind_speed == null) {
      return { headwind: 0, activeRunway: null, hasData: false }
    }
    const { headwind } = calculateWindComponents(
      cur.wind_direction,
      cur.wind_speed,
      runwayHeading.value,
    )
    return {
      headwind: Math.abs(headwind),
      activeRunway: getActiveRunway(headwind, runwayHeading.value),
      hasData: true,
    }
  })
  const effWindComponent = computed(() =>
    windComponent.value != null ? windComponent.value : autoWind.value.headwind,
  )

  // ===== Conditions effectives =====
  const effTemperature = computed(() =>
    temperature.value != null ? temperature.value : (weatherCurrent.value?.temp ?? 15),
  )
  const effQnh = computed(() =>
    qnh.value != null ? qnh.value : (weatherCurrent.value?.qnh ?? 1013),
  )
  const effWeight = computed(() => {
    if (weight.value != null) return weight.value
    const loaded = wbStore.current?.totalWeight
    const raw = loaded || aircraft.value?.maxTakeoffWeight || 0
    // Repris du calcul de masse → arrondi 0,1 kg pour l'affichage du champ.
    return Math.round(raw * 10) / 10
  })

  const pa = computed(() => pressureAltitude(effQnh.value, effElevationFt.value))

  // Axe température de l'abaque : soit la température réelle (°C), soit l'écart à
  // l'ISA si la table est indexée ainsi (DR400 : ISA-20 / ISA / ISA+20).
  const temperatureMode = computed(() => aircraft.value?.performance?.temperatureMode ?? null)
  const queryTemperature = computed(() =>
    temperatureMode.value === 'isaDeviation'
      ? effTemperature.value - isaTemp(pa.value)
      : effTemperature.value,
  )

  const query = computed(() => ({
    pressureAltitude: pa.value,
    temperature: queryTemperature.value,
    weight: effWeight.value,
  }))

  const conditions = computed(() => ({
    headwindComponent: effWindComponent.value,
    surface: effSurface.value,
  }))

  // La pente ne corrige que le décollage (règle fournie : 2 % montant = +10 %).
  const takeoffConditions = computed(() => ({
    ...conditions.value,
    slopePercent: Number(slopePercent.value) || 0,
  }))

  const takeoff = computed(() =>
    computePerformance(aircraft.value?.performance?.takeoff, query.value, takeoffConditions.value),
  )
  const landing = computed(() =>
    computePerformance(aircraft.value?.performance?.landing, query.value, conditions.value),
  )

  /** Marge piste = longueur disponible − distance 50ft requise. */
  function margin(result) {
    if (!result?.corrected || !effRunwayLengthM.value) return null
    return effRunwayLengthM.value - result.corrected.over50ft
  }

  const takeoffMargin = computed(() => margin(takeoff.value))
  const landingMargin = computed(() => margin(landing.value))

  const hasTables = computed(() => !!aircraft.value?.performance?.takeoff?.table?.length)

  // Setters qui figent le pré-remplissage (préfixe `set` pour ne pas masquer les refs).
  const setters = {}
  for (const [field, refObj] of Object.entries({
    temperature,
    qnh,
    weight,
    windComponent,
    surface,
    elevationFt,
    runwayLengthM,
    slopePercent,
  })) {
    const name = `set${field.charAt(0).toUpperCase()}${field.slice(1)}`
    setters[name] = (val) => {
      refObj.value = val
    }
  }

  /** Réinitialise toutes les saisies → retour au pré-remplissage automatique. */
  function resetAuto() {
    temperature.value = null
    qnh.value = null
    weight.value = null
    windComponent.value = null
    surface.value = null
    elevationFt.value = null
    runwayLengthM.value = null
    slopePercent.value = 0
  }

  return {
    aircraft,
    temperature,
    qnh,
    weight,
    windComponent,
    surface,
    elevationFt,
    runwayLengthM,
    slopePercent,
    effTemperature,
    effQnh,
    effWeight,
    effElevationFt,
    effRunwayLengthM,
    effSurface,
    effWindComponent,
    autoWind,
    runwayHeading,
    pa,
    takeoff,
    landing,
    takeoffMargin,
    landingMargin,
    hasTables,
    weatherCurrent,
    resetAuto,
    ...setters,
  }
})
