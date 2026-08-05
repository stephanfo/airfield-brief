<template>
  <q-card flat bordered class="q-pa-md q-mb-lg">
    <div class="text-h5 q-mb-sm flex items-center text-primary text-weight-bold">
      <q-icon name="explore" size="md" class="q-mr-sm" />
      Rose des Vents
    </div>

    <!-- Rose des vents -->
    <div v-if="hasData" class="chart-container">
      <v-chart :option="chartOption" autoresize class="wind-rose-chart" />
    </div>

    <!-- Légende -->
    <div v-if="hasData" class="row justify-center q-gutter-xs q-mt-xs text-caption">
      <div class="row items-center no-wrap q-mr-xs">
        <span class="legend-dot" style="background: rgba(46, 204, 113, 0.85)" />
        <span class="text-grey-7">0–5 kt</span>
      </div>
      <div class="row items-center no-wrap q-mr-xs">
        <span class="legend-dot" style="background: rgba(168, 224, 99, 0.85)" />
        <span class="text-grey-7">5–10 kt</span>
      </div>
      <div class="row items-center no-wrap q-mr-xs">
        <span class="legend-dot" style="background: rgba(243, 156, 18, 0.85)" />
        <span class="text-grey-7">10–15 kt</span>
      </div>
      <div class="row items-center no-wrap q-mr-xs">
        <span class="legend-dot" style="background: rgba(230, 126, 34, 0.85)" />
        <span class="text-grey-7">15–20 kt</span>
      </div>
      <div class="row items-center no-wrap q-mr-xs">
        <span class="legend-dot" style="background: rgba(231, 76, 60, 0.85)" />
        <span class="text-grey-7">20–25 kt</span>
      </div>
      <div class="row items-center no-wrap">
        <span class="legend-dot" style="background: rgba(192, 57, 43, 0.85)" />
        <span class="text-grey-7">&gt; 25 kt</span>
      </div>
    </div>
    <div v-else class="text-center text-grey-6 q-pa-xl">
      <q-icon name="air" size="48px" class="q-mb-sm" />
      <div>Aucune donnée de vent disponible</div>
    </div>

    <!-- Sélecteur de période (en dessous) -->
    <div class="q-mt-md">
      <q-btn-toggle
        v-model="presetPeriod"
        dense
        no-caps
        rounded
        spread
        toggle-color="primary"
        class="full-width q-mb-sm"
        :options="[
          { label: '2h', value: '2h' },
          { label: '6h', value: '6h' },
          { label: '12h', value: '12h' },
          { label: '24h', value: '24h' },
          { label: 'Libre', value: 'custom' },
        ]"
        @update:model-value="onPresetChange"
      />
      <div v-if="presetPeriod === 'custom'" class="q-px-sm">
        <q-range
          v-model="customRange"
          :min="0"
          :max="rangeSteps"
          :step="1"
          snap
          label
          :left-label-value="formatRangeLabel(customRange.min)"
          :right-label-value="formatRangeLabel(customRange.max)"
          color="primary"
        />
        <div class="row justify-between text-caption text-grey-7">
          <span>{{ formatRangeLabel(0) }}</span>
          <span>{{ formatRangeLabel(rangeSteps) }}</span>
        </div>
      </div>
    </div>
  </q-card>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { BarChart } from 'echarts/charts'
import {
  PolarComponent,
  TooltipComponent,
  LegendComponent,
  GraphicComponent,
} from 'echarts/components'
import VChart from 'vue-echarts'
import { aggregateWindRose, RUNWAY_HEADING } from '../../utils/stationHelpers'

use([CanvasRenderer, BarChart, PolarComponent, TooltipComponent, LegendComponent, GraphicComponent])

/**
 * Props - Format natif wind_history.json
 * @type {{ windRose: Array<{ dir: number, speed_bin: number, time_slot: string, count: number }> }}
 * @type {{ windHistory24h: Array<{ P10: number, P50: number, P90: number, dir: number, dir_sigma: number, time_slot: string }> }}
 */
const props = defineProps({
  windRose: { type: Array, default: () => [] },
  windHistory24h: { type: Array, default: () => [] },
})

// --- Sélecteur de période ---
const presetPeriod = ref('2h')
const customRange = ref({ min: 0, max: 0 })

/** Nombre de steps dans le slider (basé sur windHistory24h) */
const rangeSteps = computed(() => Math.max(0, props.windHistory24h.length - 1))

/** À chaque changement de windHistory24h, reset le slider sur toute la plage */
watch(
  () => props.windHistory24h.length,
  () => {
    customRange.value = { min: 0, max: rangeSteps.value }
  },
  { immediate: true },
)

function onPresetChange(preset) {
  if (preset === 'custom') return
  // Le filtrage est géré dans filteredWindRose
}

function formatRangeLabel(stepIndex) {
  const data = props.windHistory24h
  if (!data.length || stepIndex < 0 || stepIndex >= data.length) return ''
  const date = new Date(data[stepIndex].time_slot)
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

/** Données wind_rose filtrées et agrégées selon la période */
const filteredWindRose = computed(() => {
  if (!props.windRose || props.windRose.length === 0) return []

  if (presetPeriod.value === '2h') {
    return aggregateWindRose(props.windRose, 2)
  } else if (presetPeriod.value === '6h') {
    return aggregateWindRose(props.windRose, 6)
  } else if (presetPeriod.value === '12h') {
    return aggregateWindRose(props.windRose, 12)
  } else if (presetPeriod.value === '24h') {
    return aggregateWindRose(props.windRose, 24)
  } else {
    // Mode custom : utiliser les timestamps de windHistory24h pour définir la plage
    const data = props.windHistory24h
    if (!data.length) return aggregateWindRose(props.windRose, 24)

    const startTime = data[customRange.value.min]?.time_slot
    const endTime = data[customRange.value.max]?.time_slot

    if (!startTime || !endTime) return aggregateWindRose(props.windRose, 24)

    return aggregateWindRose(props.windRose, { startTime, endTime })
  }
})

const hasData = computed(() => filteredWindRose.value.length > 0)

/** Secteurs agrégés pour la rose */
const sectors = computed(() => filteredWindRose.value)

/** Valeur max pour l'échelle radiale (basée sur les fréquences %) */
const maxWind = computed(() => {
  const maxFreq = Math.max(...sectors.value.map((s) => s.frequency), 0)
  return Math.max(Math.ceil(maxFreq), 10) // Minimum 10% pour lisibilité
})

/** Génère le graphic pour la ligne de piste */
function getRunwayGraphic() {
  // Calcul de la ligne de piste basé sur RUNWAY_HEADING (250° / 070°)
  const rwyRad = (RUNWAY_HEADING * Math.PI) / 180
  const oppositeRad = ((RUNWAY_HEADING - 180) * Math.PI) / 180
  const R = 130 // rayon en px (≈ 75% du polar radius)
  const labelOffset = 16 // décalage texte au-delà de la ligne

  // Endpoints (conversion compass → écran : x=sin, y=-cos)
  const x25 = R * Math.sin(rwyRad)
  const y25 = -R * Math.cos(rwyRad)
  const x07 = R * Math.sin(oppositeRad)
  const y07 = -R * Math.cos(oppositeRad)

  // Labels positionnés légèrement au-delà des extrémités
  const lx25 = (R + labelOffset) * Math.sin(rwyRad)
  const ly25 = -(R + labelOffset) * Math.cos(rwyRad)
  const lx07 = (R + labelOffset) * Math.sin(oppositeRad)
  const ly07 = -(R + labelOffset) * Math.cos(oppositeRad)

  return [
    {
      type: 'group',
      left: 'center',
      top: 'middle',
      children: [
        // Ligne de piste en pointillés
        {
          type: 'line',
          shape: { x1: x07, y1: y07, x2: x25, y2: y25 },
          style: {
            stroke: 'rgba(7, 59, 138, 0.6)',
            lineWidth: 3.5,
            lineDash: [10, 6],
          },
          silent: true,
        },
        // Label QFU 25 (seuil 25 côté NE — on décolle vers 250° depuis ce bout)
        {
          type: 'text',
          x: lx07,
          y: ly07,
          style: {
            text: '25',
            fill: '#073b8a',
            fontSize: 13,
            fontWeight: 'bold',
            textAlign: 'center',
            textVerticalAlign: 'middle',
          },
          silent: true,
        },
        // Label QFU 07 (seuil 07 côté SW — on décolle vers 070° depuis ce bout)
        {
          type: 'text',
          x: lx25,
          y: ly25,
          style: {
            text: '07',
            fill: '#073b8a',
            fontSize: 13,
            fontWeight: 'bold',
            textAlign: 'center',
            textVerticalAlign: 'middle',
          },
          silent: true,
        },
      ],
    },
  ]
}

/** Option ECharts pour la rose des vents (format natif avec fréquences) */
const chartOption = computed(() => {
  const sectorData = sectors.value

  return {
    tooltip: {
      trigger: 'item',
      formatter: (params) => {
        const s = sectorData[params.dataIndex]
        if (!s) return ''
        let tooltip = `<b>${s.sector}</b><br/>Fréquence totale : ${s.frequency.toFixed(1)}%<br/>`
        tooltip += `<span style="color:#2ecc71">●</span> 0-5 kt : ${s.freq0.toFixed(1)}%<br/>`
        tooltip += `<span style="color:#a8e063">●</span> 5-10 kt : ${s.freq5.toFixed(1)}%<br/>`
        tooltip += `<span style="color:#f39c12">●</span> 10-15 kt : ${s.freq10.toFixed(1)}%<br/>`
        tooltip += `<span style="color:#e67e22">●</span> 15-20 kt : ${s.freq15.toFixed(1)}%<br/>`
        tooltip += `<span style="color:#e74c3c">●</span> 20-25 kt : ${s.freq20.toFixed(1)}%<br/>`
        tooltip += `<span style="color:#c0392b">●</span> >25 kt : ${s.freq25.toFixed(1)}%<br/>`
        tooltip += `Total mesures : ${s.total}`
        return tooltip
      },
    },
    legend: { show: false },
    polar: {
      radius: ['12%', '75%'],
    },
    angleAxis: {
      type: 'category',
      data: sectorData.map((s) => s.sector),
      startAngle: 90, // Nord en haut
      clockwise: true,
      axisLine: { lineStyle: { color: '#666' } },
      axisLabel: {
        color: '#ccc',
        fontSize: 11,
        fontWeight: 'bold',
      },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
    },
    radiusAxis: {
      min: 0,
      max: maxWind.value,
      axisLine: { show: false },
      axisLabel: {
        color: '#999',
        fontSize: 10,
        formatter: '{value}%',
      },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } },
    },
    series: [
      // Bin 0 : 0-5 kt (vert clair, base)
      {
        name: '0-5 kt',
        type: 'bar',
        coordinateSystem: 'polar',
        data: sectorData.map((s) => s.freq0),
        stack: 'wind',
        barWidth: '80%',
        itemStyle: {
          color: 'rgba(46, 204, 113, 0.85)',
          borderRadius: [0, 0, 0, 0],
        },
      },
      // Bin 5 : 5-10 kt (vert-jaune)
      {
        name: '5-10 kt',
        type: 'bar',
        coordinateSystem: 'polar',
        data: sectorData.map((s) => s.freq5),
        stack: 'wind',
        barWidth: '80%',
        itemStyle: {
          color: 'rgba(168, 224, 99, 0.85)',
        },
      },
      // Bin 10 : 10-15 kt (orange clair)
      {
        name: '10-15 kt',
        type: 'bar',
        coordinateSystem: 'polar',
        data: sectorData.map((s) => s.freq10),
        stack: 'wind',
        barWidth: '80%',
        itemStyle: {
          color: 'rgba(243, 156, 18, 0.85)',
        },
      },
      // Bin 15 : 15-20 kt (orange foncé)
      {
        name: '15-20 kt',
        type: 'bar',
        coordinateSystem: 'polar',
        data: sectorData.map((s) => s.freq15),
        stack: 'wind',
        barWidth: '80%',
        itemStyle: {
          color: 'rgba(230, 126, 34, 0.85)',
        },
      },
      // Bin 20 : 20-25 kt (rouge-orange)
      {
        name: '20-25 kt',
        type: 'bar',
        coordinateSystem: 'polar',
        data: sectorData.map((s) => s.freq20),
        stack: 'wind',
        barWidth: '80%',
        itemStyle: {
          color: 'rgba(231, 76, 60, 0.85)',
        },
      },
      // Bin 25 : >25 kt (rouge foncé, sommet)
      {
        name: '>25 kt',
        type: 'bar',
        coordinateSystem: 'polar',
        data: sectorData.map((s) => s.freq25),
        stack: 'wind',
        barWidth: '80%',
        itemStyle: {
          color: 'rgba(192, 57, 43, 0.85)',
          borderRadius: [4, 4, 0, 0],
        },
      },
    ],
    graphic: getRunwayGraphic(),
    backgroundColor: 'transparent',
  }
})
</script>

<style scoped>
.chart-container {
  width: 100%;
  display: flex;
  justify-content: center;
}

.wind-rose-chart {
  width: 100%;
  height: 350px;
  max-width: 450px;
}

.legend-dot {
  display: inline-block;
  width: 12px;
  height: 12px;
  border-radius: 2px;
  margin-right: 4px;
}
</style>
