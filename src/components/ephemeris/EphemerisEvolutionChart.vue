<template>
  <v-chart :option="chartOption" autoresize class="evolution-chart" />
</template>

<script setup>
/**
 * Graphique d'évolution des éphémérides sur la fenêtre fournie (longueur variable,
 * dictée par le nombre de jours du fichier IMCCE).
 *
 * Axe Y gauche = heure locale de la journée (0–24 h). On trace quatre horaires
 * (aube aéro, lever, coucher, fin du jour aéro) et on remplit les bandes entre ces
 * courbes (nuit / crépuscule aéro / jour) via des séries empilées.
 *
 * Axe Y droit = durée (en h). On y trace la durée du jour aéronautique (aube→fin),
 * pour suivre l'allongement/raccourcissement. Une durée n'est PAS une heure de la
 * journée : elle vit sur son propre axe, sinon la lecture serait trompeuse.
 *
 * Aucun calcul astronomique : on réutilise les heures pré-calculées (IMCCE) et les
 * helpers de ephemerisHelpers.js (bornes aéro = lever −30 / coucher +30).
 *
 * Hypothèse des bandes empilées : 0 < aeroDawn et aeroDusk < 24 (heure locale), i.e.
 * l'aube et la fin du jour aéro tombent le même jour calendaire local. Vrai aux
 * latitudes métropolitaines (jusqu'à ~51°N). À de très hautes latitudes (soleil de
 * minuit) ces bornes peuvent franchir minuit → deltas négatifs ; non géré.
 */
import { computed } from 'vue'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart } from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  MarkLineComponent,
} from 'echarts/components'
import VChart from 'vue-echarts'
import {
  addMinutes,
  AERO_NIGHT_OFFSET_MIN,
  formatLocalUTC,
  formatDuration,
} from '../../utils/ephemerisHelpers'
import { formatDateOnly } from '../../utils/dateHelpers'

use([
  CanvasRenderer,
  LineChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  MarkLineComponent,
])

const props = defineProps({
  // Sortie de getDays(rawData) : [{ date, sunrise, sunset, ... }], un élément par jour.
  days: { type: Array, default: () => [] },
  // Index du jour sélectionné dans le slider, pour le marqueur (-1 = aucun)
  selectedIndex: { type: Number, default: -1 },
})

/** ISO → heure locale en heures décimales (19h51 → 19.85). Gère le fuseau FR/DST. */
function toLocalHour(iso) {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.getHours() + d.getMinutes() / 60
}

/** Durée en heures décimales → texte court ("16 h 54"). Réutilise formatDuration (ms). */
function formatHours(h) {
  if (h == null) return '—'
  return formatDuration(h * 3600000)
}

/** Label court d'axe : "JJ/MM" en local. */
function shortDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
}

// Couleurs cohérentes avec la palette des graphes weather
const COLOR_SUNRISE = '#f39c12'
const COLOR_SUNSET = '#e74c3c'
const COLOR_AERO = '#e67e22'
const COLOR_DUR_AERO = '#9b59b6' // durée du jour aéronautique (axe droit)

const FILL_NIGHT = 'rgba(20, 30, 55, 0.45)'
const FILL_TWILIGHT = 'rgba(243, 156, 18, 0.18)'
const FILL_DAY = 'rgba(255, 214, 102, 0.20)'

// Modèle dérivé : pour chaque jour, les 4 horaires en heures locales décimales.
const model = computed(() =>
  props.days.map((d) => {
    const aeroDawn = toLocalHour(addMinutes(d.sunrise, -AERO_NIGHT_OFFSET_MIN))
    const sunrise = toLocalHour(d.sunrise)
    const sunset = toLocalHour(d.sunset)
    const aeroDusk = toLocalHour(addMinutes(d.sunset, AERO_NIGHT_OFFSET_MIN))
    return {
      date: d.date ?? d.sunrise,
      isoAeroDawn: addMinutes(d.sunrise, -AERO_NIGHT_OFFSET_MIN),
      isoSunrise: d.sunrise,
      isoSunset: d.sunset,
      isoAeroDusk: addMinutes(d.sunset, AERO_NIGHT_OFFSET_MIN),
      aeroDawn,
      sunrise,
      sunset,
      aeroDusk,
      // Durée du jour aéro (h) pour l'axe droit. Dérivée des mêmes heures locales
      // (diff de bornes d'un même jour → pas d'effet de fuseau résiduel).
      aeroDayLength: aeroDawn != null && aeroDusk != null ? aeroDusk - aeroDawn : null,
    }
  }),
)

const xData = computed(() => model.value.map((m) => shortDate(m.date)))

/** Séries empilées (deltas) pour remplir les bandes du bas (0 h) vers le haut. */
function bandSeries(name, color, valuesFn) {
  return {
    name,
    type: 'line',
    stack: 'eph',
    silent: true,
    symbol: 'none',
    lineStyle: { opacity: 0 },
    areaStyle: { color },
    data: model.value.map(valuesFn),
    z: 1,
  }
}

/** Série ligne visible (valeur absolue, hors stack). */
function lineSeries(name, color, key, dashed) {
  return {
    name,
    type: 'line',
    symbol: 'none',
    smooth: true,
    lineStyle: { color, width: 2, type: dashed ? 'dashed' : 'solid' },
    itemStyle: { color },
    data: model.value.map((m) => m[key]),
    z: 5,
  }
}

/** Série durée (axe Y droit, en h). Trait fin pour ne pas masquer les bandes. */
function durationSeries(name, color, key) {
  return {
    name,
    type: 'line',
    yAxisIndex: 1,
    symbol: 'none',
    smooth: true,
    lineStyle: { color, width: 1.5 },
    itemStyle: { color },
    data: model.value.map((m) => m[key]),
    z: 6,
  }
}

const chartOption = computed(() => {
  const m = model.value

  // Bandes empilées : nuit (0→aeroDawn), crépuscule (aeroDawn→sunrise),
  // jour (sunrise→sunset), crépuscule (sunset→aeroDusk), nuit (aeroDusk→24).
  const bands = [
    bandSeries('zNightBottom', FILL_NIGHT, (p) => p.aeroDawn ?? 0),
    bandSeries('zTwilightAm', FILL_TWILIGHT, (p) => (p.sunrise ?? 0) - (p.aeroDawn ?? 0)),
    bandSeries('zDay', FILL_DAY, (p) => (p.sunset ?? 0) - (p.sunrise ?? 0)),
    bandSeries('zTwilightPm', FILL_TWILIGHT, (p) => (p.aeroDusk ?? 0) - (p.sunset ?? 0)),
    bandSeries('zNightTop', FILL_NIGHT, (p) => 24 - (p.aeroDusk ?? 24)),
  ]

  const lines = [
    lineSeries('Aube aéro', COLOR_AERO, 'aeroDawn', true),
    lineSeries('Lever', COLOR_SUNRISE, 'sunrise', false),
    lineSeries('Coucher', COLOR_SUNSET, 'sunset', false),
    lineSeries('Fin jour aéro', COLOR_AERO, 'aeroDusk', true),
  ]

  const durations = [durationSeries('Durée jour aéro', COLOR_DUR_AERO, 'aeroDayLength')]

  // Marqueur du jour sélectionné, posé sur la première série ligne.
  if (props.selectedIndex >= 0 && props.selectedIndex < m.length) {
    lines[0] = {
      ...lines[0],
      markLine: {
        silent: true,
        symbol: 'none',
        label: {
          formatter: 'Jour sélectionné',
          color: '#90caf9',
          fontSize: 10,
          position: 'insideEndTop',
        },
        lineStyle: { color: 'rgba(144, 202, 249, 0.7)', type: 'solid', width: 1.5 },
        data: [{ xAxis: props.selectedIndex }],
      },
    }
  }

  return {
    backgroundColor: 'transparent',
    legend: {
      // Seules les lignes nommées apparaissent dans la légende (bandes = noms "z…" masqués).
      data: ['Aube aéro', 'Lever', 'Coucher', 'Fin jour aéro', 'Durée jour aéro'],
      textStyle: { color: '#ccc' },
      top: 0,
    },
    tooltip: {
      trigger: 'axis',
      formatter: (params) => {
        const idx = params?.[0]?.dataIndex
        const p = m[idx]
        if (!p) return ''
        const full = formatDateOnly(p.date)
        let html = `<b>${full}</b><br/>`
        html += `<span style="color:${COLOR_AERO}">●</span> Aube aéro : ${formatLocalUTC(p.isoAeroDawn).combined}<br/>`
        html += `<span style="color:${COLOR_SUNRISE}">●</span> Lever : ${formatLocalUTC(p.isoSunrise).combined}<br/>`
        html += `<span style="color:${COLOR_SUNSET}">●</span> Coucher : ${formatLocalUTC(p.isoSunset).combined}<br/>`
        html += `<span style="color:${COLOR_AERO}">●</span> Fin jour aéro : ${formatLocalUTC(p.isoAeroDusk).combined}<br/>`
        html += `<span style="color:${COLOR_DUR_AERO}">●</span> Durée jour aéro : ${formatHours(p.aeroDayLength)}`
        return html
      },
    },
    grid: { left: 45, right: 20, top: 40, bottom: 40 },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: xData.value,
      axisLabel: {
        color: '#999',
        fontSize: 10,
        // ~10 labels max sur l'axe, quel que soit le nombre de jours (évite le chevauchement)
        interval: Math.max(0, Math.floor(m.length / 10)),
      },
      axisLine: { lineStyle: { color: '#666' } },
    },
    yAxis: [
      {
        type: 'value',
        min: 0,
        max: 24,
        interval: 3,
        axisLabel: { color: '#999', formatter: '{value}h' },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } },
      },
      {
        // Axe droit : durées (h). Même échelle 0–24 que l'axe gauche pour aligner les
        // graduations (une durée de 16 h se lit à la hauteur du repère 16 h).
        type: 'value',
        name: 'durée',
        nameTextStyle: { color: '#999' },
        min: 0,
        max: 24,
        interval: 3,
        axisLabel: { color: '#999', formatter: '{value}h' },
        splitLine: { show: false },
      },
    ],
    series: [...bands, ...lines, ...durations],
  }
})
</script>

<style scoped>
.evolution-chart {
  width: 100%;
  height: 320px;
}
</style>
