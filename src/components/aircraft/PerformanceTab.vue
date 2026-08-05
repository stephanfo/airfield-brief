<template>
  <div>
    <q-banner rounded class="bg-orange-1 text-orange-9 q-mb-md text-body2">
      <template #avatar><q-icon name="menu_book" color="warning" size="md" /></template>
      Abaques du <strong>Manuel de vol DR400/120</strong> (section 5). Distances interpolées sur
      piste en dur ; corrections vent et revêtement appliquées.
      <strong>Vérifiez toujours le POH et privilégiez la lecture conservatrice.</strong>
    </q-banner>

    <SectionCard title="Conditions" icon="tune" dense>
      <div class="row q-col-gutter-md">
        <div class="col-6 col-sm-3">
          <q-input
            :model-value="effTemperature"
            type="number"
            dense
            outlined
            label="Température (°C)"
            @update:model-value="(v) => store.setTemperature(num(v))"
          >
            <template #append>
              <q-icon v-if="prefilled('temperature')" name="cloud" size="xs" color="grey-6">
                <q-tooltip>Pré-rempli depuis le METAR {{ CLUB_CONFIG.airfield.icao }}</q-tooltip>
              </q-icon>
            </template>
          </q-input>
        </div>
        <div class="col-6 col-sm-3">
          <q-input
            :model-value="effQnh"
            type="number"
            dense
            outlined
            label="QNH (hPa)"
            @update:model-value="(v) => store.setQnh(num(v))"
          >
            <template #append>
              <q-icon v-if="prefilled('qnh')" name="cloud" size="xs" color="grey-6">
                <q-tooltip>Pré-rempli depuis le METAR {{ CLUB_CONFIG.airfield.icao }}</q-tooltip>
              </q-icon>
            </template>
          </q-input>
        </div>
        <div class="col-6 col-sm-3">
          <q-input
            :model-value="effWeight"
            type="number"
            dense
            outlined
            label="Masse (kg)"
            @update:model-value="(v) => store.setWeight(num(v))"
          >
            <template #append>
              <q-icon name="balance" size="xs" color="grey-6">
                <q-tooltip>Repris du calcul de centrage</q-tooltip>
              </q-icon>
            </template>
          </q-input>
        </div>
        <div class="col-6 col-sm-3">
          <q-input
            :model-value="effWindComponent"
            type="number"
            dense
            outlined
            label="Composante vent (kt)"
            :hint="windHint"
            @update:model-value="(v) => store.setWindComponent(num(v))"
          >
            <template #append>
              <q-icon
                v-if="windComponent == null && autoWind.hasData"
                name="air"
                size="xs"
                color="grey-6"
              >
                <q-tooltip
                  >Vent METAR projeté sur l'axe de piste (QFU
                  {{ autoWind.activeRunway }})</q-tooltip
                >
              </q-icon>
            </template>
          </q-input>
        </div>
        <div class="col-6 col-sm-3">
          <q-select
            :model-value="effSurface"
            :options="surfaces"
            emit-value
            map-options
            dense
            outlined
            label="Revêtement"
            @update:model-value="(v) => store.setSurface(v)"
          >
            <template #append>
              <q-icon v-if="surface == null" name="flight_takeoff" size="xs" color="grey-6">
                <q-tooltip>Caractéristique du terrain {{ CLUB_CONFIG.airfield.icao }}</q-tooltip>
              </q-icon>
            </template>
          </q-select>
        </div>
        <div class="col-6 col-sm-3">
          <q-input
            :model-value="effRunwayLengthM"
            type="number"
            dense
            outlined
            label="Longueur piste (m)"
            @update:model-value="(v) => store.setRunwayLengthM(num(v))"
          >
            <template #append>
              <q-icon v-if="runwayLengthM == null" name="flight_takeoff" size="xs" color="grey-6">
                <q-tooltip>Caractéristique du terrain {{ CLUB_CONFIG.airfield.icao }}</q-tooltip>
              </q-icon>
            </template>
          </q-input>
        </div>
        <div class="col-6 col-sm-3">
          <q-input
            :model-value="effElevationFt"
            type="number"
            dense
            outlined
            label="Altitude terrain (ft)"
            @update:model-value="(v) => store.setElevationFt(num(v))"
          >
            <template #append>
              <q-icon v-if="elevationFt == null" name="flight_takeoff" size="xs" color="grey-6">
                <q-tooltip>Caractéristique du terrain {{ CLUB_CONFIG.airfield.icao }}</q-tooltip>
              </q-icon>
            </template>
          </q-input>
        </div>
        <div class="col-6 col-sm-3">
          <q-input
            :model-value="slopePercent"
            type="number"
            step="0.1"
            dense
            outlined
            label="Pente piste (%)"
            hint="Montant + / descendant −"
            @update:model-value="(v) => store.setSlopePercent(num(v) ?? 0)"
          >
            <template #append>
              <q-icon name="trending_up" size="xs" color="grey-6" />
            </template>
          </q-input>
        </div>
      </div>
    </SectionCard>

    <div v-if="hasTables" class="row q-col-gutter-md">
      <div class="col-12 col-md-6">
        <PerformanceResult
          title="Décollage"
          icon="flight_takeoff"
          :result="takeoff"
          :margin="takeoffMargin"
          :runway-length-m="effRunwayLengthM"
        />
      </div>
      <div class="col-12 col-md-6">
        <PerformanceResult
          title="Atterrissage"
          icon="flight_land"
          :result="landing"
          :margin="landingMargin"
          :runway-length-m="effRunwayLengthM"
        />
      </div>
    </div>
    <q-card v-else flat bordered class="q-pa-md text-grey-6">
      Aucune table de performance définie pour cet avion dans <code>aircrafts.json</code>.
    </q-card>

    <!-- Hypothèses & source des abaques -->
    <SectionCard v-if="hasTables" title="Hypothèses & source" icon="info" dense class="q-mt-md">
      <q-list dense>
        <q-item v-for="(line, i) in assumptions" :key="i" class="q-px-none">
          <q-item-section avatar style="min-width: 32px">
            <q-icon :name="line.icon" size="xs" color="grey-7" />
          </q-item-section>
          <q-item-section>
            <q-item-label class="text-body2">{{ line.text }}</q-item-label>
          </q-item-section>
        </q-item>
      </q-list>
    </SectionCard>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import SectionCard from '../common/SectionCard.vue'
import PerformanceResult from './PerformanceResult.vue'
import { usePerformanceStore } from '../../stores/performanceStore'
import { PERFORMANCE_CONFIG } from '../../config/app.config'
import { CLUB_CONFIG } from '../../config/club.config'

const store = usePerformanceStore()
const {
  aircraft,
  temperature,
  qnh,
  weight,
  windComponent,
  surface,
  runwayLengthM,
  elevationFt,
  slopePercent,
  effTemperature,
  effQnh,
  effWeight,
  effElevationFt,
  effRunwayLengthM,
  effSurface,
  effWindComponent,
  autoWind,
  takeoff,
  landing,
  takeoffMargin,
  landingMargin,
  hasTables,
} = storeToRefs(store)

const surfaces = PERFORMANCE_CONFIG.surfaces

const windHint = computed(() =>
  windComponent.value == null && autoWind.value.hasData
    ? `Auto QFU ${autoWind.value.activeRunway} · + face / − arrière`
    : '+ face / − arrière',
)

/** Valeurs uniques triées d'un axe de la table de décollage (pour le récap). */
function tableAxis(axis) {
  const t = aircraft.value?.performance?.takeoff?.table ?? []
  return [...new Set(t.map((r) => r[axis]))].sort((a, b) => a - b)
}

/**
 * Récap des hypothèses et de la source, affiché en bas de page. Le texte (source,
 * hypothèses) vient d'`aircrafts.json` (`performance.source` / `.assumptions`) afin
 * de gérer plusieurs types d'avions/manuels/calculs ; l'UI n'ajoute que les
 * éléments dérivés des données (bornes d'interpolation) et l'invariant applicatif
 * (le pesage provient du .aircraft).
 */
const assumptions = computed(() => {
  const perf = aircraft.value?.performance ?? {}
  const weights = tableAxis('weight')
  const alts = tableAxis('pressureAltitude')
  const isaMode = perf.temperatureMode === 'isaDeviation'
  const lines = []

  if (perf.source) lines.push({ icon: 'menu_book', text: `Source : ${perf.source}` })

  lines.push({
    icon: 'scale',
    text: `Le pesage (masse à vide, bras, enveloppe) vient du fichier .aircraft de ${aircraft.value?.registration ?? 'l’appareil'} — source de vérité ; le manuel ne sert qu'aux distances.`,
  })

  lines.push({
    icon: 'grid_on',
    text:
      `Interpolation sur ${alts.length ? alts.join(' / ') : '—'} ft, ` +
      `masses ${weights.length ? weights.join(' / ') : '—'} kg` +
      (isaMode ? ', température en écart ISA (ISA−20 / ISA / ISA+20).' : '.'),
  })

  const slope = Number(slopePercent.value) || 0
  if (slope) {
    const perPct = perf.takeoff?.corrections?.slopePer1Percent ?? 0.05
    const pct = Math.round(slope * perPct * 100)
    lines.push({
      icon: 'trending_up',
      text: `Pente piste : ${slope > 0 ? '+' : ''}${slope} % → décollage ${pct >= 0 ? '+' : ''}${pct} % (${perPct * 100} %/%).`,
    })
  }

  for (const text of perf.assumptions ?? []) lines.push({ icon: 'chevron_right', text })

  return lines
})

/** Le champ est-il en valeur pré-remplie (non saisi par l'utilisateur) ? */
function prefilled(field) {
  return { temperature, qnh, weight }[field]?.value == null
}

function num(v) {
  return v === '' || v == null ? null : Number(v)
}
</script>
