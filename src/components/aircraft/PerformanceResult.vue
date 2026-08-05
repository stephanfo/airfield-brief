<template>
  <q-card flat bordered class="q-pa-md">
    <div class="text-subtitle1 text-weight-bold text-primary flex items-center q-mb-sm">
      <q-icon :name="icon" class="q-mr-sm" />
      {{ title }}
    </div>

    <template v-if="result?.corrected">
      <div class="row text-center q-col-gutter-sm">
        <div class="col-6">
          <div class="text-h5 text-weight-bold">{{ fmt(result.corrected.groundRoll) }} m</div>
          <div class="text-caption text-grey-7">Roulement</div>
        </div>
        <div class="col-6">
          <div class="text-h5 text-weight-bold">{{ fmt(result.corrected.over50ft) }} m</div>
          <div class="text-caption text-grey-7">Distance / 50 ft (15 m)</div>
        </div>
      </div>

      <div
        v-if="result.conservative"
        class="q-mt-sm flex items-center text-body2 text-negative text-weight-medium"
      >
        <q-icon name="verified_user" size="xs" class="q-mr-xs" color="negative" />
        Lecture conservatrice POH :
        <span class="text-weight-bold q-ml-xs">
          {{ fmt(result.conservative.groundRoll) }} / {{ fmt(result.conservative.over50ft) }} m
        </span>
        <q-tooltip>
          Valeur d'abaque immédiatement supérieure (sans interpolation), recommandée par le POH —
          toujours ≥ la valeur interpolée affichée.
        </q-tooltip>
      </div>

      <q-separator class="q-my-sm" />

      <div class="text-caption text-grey-7">
        Base abaque : {{ fmt(result.base.groundRoll) }} / {{ fmt(result.base.over50ft) }} m ·
        facteur correctif ×{{ result.corrected.factor.toFixed(2) }}
      </div>

      <div v-if="margin != null" class="q-mt-sm">
        <q-chip
          :color="marginStatus.color"
          :text-color="marginStatus.textColor"
          :icon="marginStatus.icon"
          dense
        >
          Marge piste : {{ margin >= 0 ? '+' : '' }}{{ fmt(margin) }} m
          <span v-if="marginPct != null" class="q-ml-xs"
            >({{ marginPct >= 0 ? '+' : '' }}{{ Math.round(marginPct) }} %)</span
          >
          <span class="q-ml-xs">· piste {{ fmt(runwayLengthM) }} m</span>
        </q-chip>
      </div>
    </template>
    <div v-else class="text-grey-6 text-body2">Données indisponibles.</div>
  </q-card>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  title: { type: String, required: true },
  icon: { type: String, default: 'flight' },
  result: { type: Object, default: null },
  margin: { type: Number, default: null },
  runwayLengthM: { type: Number, default: null },
})

/** Marge en % de la distance requise (distance / 50 ft). */
const marginPct = computed(() => {
  const req = props.result?.corrected?.over50ft
  if (props.margin == null || !req) return null
  return (props.margin / req) * 100
})

/**
 * Code couleur de la marge piste :
 *  - rouge   : distance insuffisante (marge < 0)
 *  - orange  : 0–10 % de marge
 *  - jaune   : 10–25 %
 *  - vert    : > 25 %
 */
const marginStatus = computed(() => {
  const pct = marginPct.value
  if (props.margin < 0) return { color: 'negative', textColor: 'white', icon: 'error' }
  if (pct == null || pct >= 25)
    return { color: 'positive', textColor: 'white', icon: 'check_circle' }
  if (pct >= 10) return { color: 'amber', textColor: 'grey-10', icon: 'warning' }
  return { color: 'orange', textColor: 'white', icon: 'warning' }
})

function fmt(v) {
  if (v == null || Number.isNaN(v)) return '—'
  return Math.round(Number(v)).toLocaleString('fr-FR')
}
</script>
