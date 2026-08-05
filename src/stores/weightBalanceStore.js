import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { useAircraftStore } from './aircraftStore'
import { computeLoadout, evaluateCg } from '../utils/weightBalanceHelpers'
import { computeFuelPlan } from '../utils/fuelHelpers'
import { logger } from '../utils/logger'
import { STORAGE_KEYS } from '../config/storageKeys'

const LOADOUT_KEY = STORAGE_KEYS.WB_LOADOUT

/**
 * Store masse & centrage (FEAT-015) + bilan carburant (FEAT-021) + devis évolutif
 * (FEAT-022). Lit l'avion sélectionné depuis `aircraftStore` ; le chargement et les
 * paramètres carburant sont des préférences UI mémorisées par immatriculation.
 *
 * - `departure` : point de centrage au décollage (chargement complet).
 * - `arrival`   : point après consommation du carburant « trip » → contrôle ZFW/atterrissage.
 */
export const useWeightBalanceStore = defineStore('weightBalance', () => {
  const aircraftStore = useAircraftStore()

  /** Chargement courant : { [stationId]: kg | litres(carburant) }. */
  const loadout = ref({})
  /** Paramètres du bilan carburant (minutes + options). */
  const fuelInput = ref({
    tripMinutes: 60,
    alternateMinutes: 30,
    reserveMinutes: 30,
    taxiFuel: 0,
    contingency: 0,
    margin: 0,
  })

  // Valeurs réglementaires par défaut d'un avion (Part-NCO / VFR FR) : réserve
  // finale 30 min VFR jour, roulage et contingence repris du `.aircraft` si fournis.
  // Le vol prévu (tripMinutes) et la marge ne sont PAS des défauts réglementaires.
  function fuelDefaults(ac) {
    return {
      alternateMinutes: 30,
      reserveMinutes: ac?.fuel?.finalReserveMinutes ?? 30,
      taxiFuel: ac?.fuel?.taxiFuel ?? 0,
      contingency: ac?.fuel?.contingency ?? 0,
    }
  }

  const aircraft = computed(() => aircraftStore.selectedAircraft)

  const fuelStation = computed(
    () => (aircraft.value?.stations ?? []).find((s) => s.type === 'fuel') ?? null,
  )

  /** Capacité utilisable du réservoir (litres). */
  const usableFuel = computed(() => {
    const f = fuelStation.value
    if (!f) return null
    return Math.max(0, (f.maxVolume || 0) - (f.unusable || 0))
  })

  // ===== Persistance par avion (préférence UI) =====
  function persist() {
    const reg = aircraft.value?.registration
    if (!reg) return
    try {
      const all = JSON.parse(localStorage.getItem(LOADOUT_KEY) || '{}')
      all[reg] = { loadout: loadout.value, fuelInput: fuelInput.value }
      localStorage.setItem(LOADOUT_KEY, JSON.stringify(all))
    } catch (e) {
      logger.warn('Impossible de mémoriser le chargement:', e)
    }
  }

  // Écriture localStorage débouncée : un drag de slider émet des dizaines de
  // mutations/seconde, inutile de sérialiser+écrire à chaque tick.
  let persistTimer = null
  function schedulePersist() {
    if (persistTimer) clearTimeout(persistTimer)
    persistTimer = setTimeout(() => {
      persistTimer = null
      persist()
    }, 400)
  }

  function restore(reg) {
    try {
      const all = JSON.parse(localStorage.getItem(LOADOUT_KEY) || '{}')
      return all[reg] ?? null
    } catch {
      return null
    }
  }

  /** (Ré)initialise le chargement quand l'avion change : valeurs mémorisées ou défauts XML. */
  function initForAircraft(ac) {
    if (!ac) {
      loadout.value = {}
      return
    }
    const saved = restore(ac.registration)
    if (saved) {
      loadout.value = { ...saved.loadout }
      fuelInput.value = { ...fuelInput.value, ...saved.fuelInput }
      return
    }
    const next = {}
    for (const s of ac.stations ?? []) next[s.id] = s.default ?? 0
    loadout.value = next
    fuelInput.value = { ...fuelInput.value, ...fuelDefaults(ac) }
  }

  watch(aircraft, (ac) => initForAircraft(ac), { immediate: true })

  // ===== Calculs =====
  // L'enveloppe montre les bornes carburant à chargement (occupants/bagages) fixe :
  //   - Décollage   = réservoir PLEIN  (capacité max)
  //   - Atterrissage = réservoir VIDE  (0 L)
  //   - Losange      = carburant SÉLECTIONNÉ (slider Chargement)
  // C'est indépendant du bilan carburant de l'onglet Carburant (qui ne sert qu'à
  // dimensionner l'emport, pas à positionner le losange).
  const fuelCapacity = computed(() => fuelStation.value?.maxVolume ?? 0)

  /** Chargement courant avec le poste carburant forcé à `liters`. */
  function loadoutWithFuel(liters) {
    const f = fuelStation.value
    if (!f) return loadout.value
    return { ...loadout.value, [f.id]: liters }
  }

  // Décollage = réservoir plein.
  const takeoff = computed(() =>
    computeLoadout(aircraft.value, loadoutWithFuel(fuelCapacity.value)),
  )
  const takeoffEval = computed(() => evaluateCg(takeoff.value, aircraft.value))

  // Atterrissage = réservoir vide (ZFW).
  const landing = computed(() => computeLoadout(aircraft.value, loadoutWithFuel(0)))
  const landingEval = computed(() => evaluateCg(landing.value, aircraft.value))

  // Configuration actuelle = carburant sélectionné dans le slider.
  const current = computed(() => computeLoadout(aircraft.value, loadout.value))
  const currentEval = computed(() => evaluateCg(current.value, aircraft.value))

  // Locus de centrage plein → vide (CG = moment/masse → hyperbole, pas un segment :
  // on l'échantillonne pour que le losange tombe exactement dessus).
  const fuelBurnLine = computed(() => {
    const full = fuelCapacity.value
    if (!aircraft.value || full <= 0) return []
    const steps = 10
    const pts = []
    for (let i = 0; i <= steps; i++) {
      const t = computeLoadout(aircraft.value, loadoutWithFuel((full * (steps - i)) / steps))
      if (t.cg != null) pts.push([t.cg, t.totalWeight])
    }
    return pts
  })

  const fuelPlan = computed(() =>
    computeFuelPlan({
      cruiseBurn: aircraft.value?.fuel?.burn?.cruise ?? 0,
      tripMinutes: fuelInput.value.tripMinutes,
      alternateMinutes: fuelInput.value.alternateMinutes,
      reserveMinutes: fuelInput.value.reserveMinutes,
      taxiFuel: fuelInput.value.taxiFuel,
      contingency: fuelInput.value.contingency,
      density: fuelStation.value?.density ?? 0.72,
      tankCapacity: usableFuel.value,
      margin: fuelInput.value.margin,
    }),
  )

  // ===== Actions =====
  function setStation(id, value) {
    loadout.value = { ...loadout.value, [id]: Number(value) || 0 }
    schedulePersist()
  }

  function setFuelInput(key, value) {
    fuelInput.value = { ...fuelInput.value, [key]: Number(value) || 0 }
    schedulePersist()
  }

  /** Remet dégagement, réserve, roulage et contingence aux défauts réglementaires
   *  (laisse le vol prévu et la marge inchangés). */
  function resetFuelInput() {
    fuelInput.value = { ...fuelInput.value, ...fuelDefaults(aircraft.value) }
    schedulePersist()
  }

  function resetLoadout() {
    if (persistTimer) clearTimeout(persistTimer)
    persistTimer = null
    const reg = aircraft.value?.registration
    if (reg) {
      try {
        const all = JSON.parse(localStorage.getItem(LOADOUT_KEY) || '{}')
        delete all[reg]
        localStorage.setItem(LOADOUT_KEY, JSON.stringify(all))
      } catch {
        /* ignore */
      }
    }
    initForAircraft(aircraft.value)
  }

  return {
    loadout,
    fuelInput,
    aircraft,
    fuelStation,
    usableFuel,
    fuelCapacity,
    takeoff,
    takeoffEval,
    landing,
    landingEval,
    current,
    currentEval,
    fuelBurnLine,
    fuelPlan,
    setStation,
    setFuelInput,
    resetFuelInput,
    resetLoadout,
  }
})
