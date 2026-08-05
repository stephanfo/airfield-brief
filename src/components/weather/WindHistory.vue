<template>
  <q-card flat bordered class="q-pa-md q-mb-lg">
    <div class="text-h5 q-mb-sm flex items-center text-primary text-weight-bold">
      <q-icon name="air" size="md" class="q-mr-sm" />
      Historique Vent
    </div>

    <div v-if="hasData">
      <v-chart :option="chartOption" autoresize class="wind-history-chart" />
    </div>
    <div v-else class="text-center text-grey-6 q-pa-xl">
      <q-icon name="air" size="48px" class="q-mb-sm" />
      <div>Aucune donnée disponible</div>
    </div>
  </q-card>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart, CustomChart } from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  MarkLineComponent,
  DataZoomComponent,
} from 'echarts/components'
import VChart from 'vue-echarts'

use([
  CanvasRenderer,
  LineChart,
  CustomChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  MarkLineComponent,
  DataZoomComponent,
])

/**
 * Props - Format natif wind_history.24h_history
 * @type {{ P10: number, P50: number, P90: number, dir: number, dir_sigma: number, time_slot: string }[]}
 */
const props = defineProps({
  data: { type: Array, default: () => [] },
})

const hasData = computed(() => props.data.length > 0)

/** Timestamps formatés pour l'axe X */
const timeLabels = computed(() =>
  props.data.map((p) =>
    new Date(p.time_slot).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
  ),
)

/** Valeur max Y pour l'échelle */
const maxY = computed(() => {
  const maxP90 = Math.max(...props.data.map((p) => p.P90 || 0))
  const maxP50 = Math.max(...props.data.map((p) => p.P50 || 0))
  return Math.max(Math.ceil(Math.max(maxP90, maxP50)), 5)
})

/** Symbole flèche SVG pour les directions */
const ARROW_SVG = 'M0,-8 L4,4 L0,1 L-4,4 Z'

/** Détection petit écran pour adapter l'affichage des flèches */
const isSmallScreen = ref(window.innerWidth < 600)
const onResize = () => {
  isSmallScreen.value = window.innerWidth < 600
}
onMounted(() => window.addEventListener('resize', onResize))
onUnmounted(() => window.removeEventListener('resize', onResize))

/**
 * Données de direction pour le custom series.
 * Format : [indexCatégorie, yPosition, directionDeg]
 * - Grand écran : toutes les 24 flèches
 * - Petit écran : 1 flèche sur 2
 */
const directionData = computed(() => {
  const result = []
  const step = isSmallScreen.value ? 2 : 1
  for (let i = 0; i < props.data.length; i += step) {
    const p = props.data[i]
    // Ignorer les vents calmes (direction 0 et vent 0)
    if (p.P50 === 0 && p.dir === 0) continue
    // [xIndex, yPos, dirDeg] — flèche pointe d'où vient le vent (convention météo)
    result.push([i, maxY.value * 0.92, p.dir])
  }
  return result
})

/** renderItem pour le custom series : dessine une flèche orientée */
function renderArrow(params, api) {
  const x = api.coord([api.value(0), api.value(1)])
  const dirDeg = api.value(2)
  return {
    type: 'path',
    shape: {
      pathData: ARROW_SVG,
      x: -6,
      y: -8,
      width: 12,
      height: 12,
    },
    rotation: (dirDeg * Math.PI) / 180,
    position: [x[0], x[1]],
    style: {
      fill: '#546e7a',
      stroke: '#37474f',
      lineWidth: 0.5,
    },
  }
}

const chartOption = computed(() => ({
  tooltip: {
    trigger: 'axis',
    formatter: (params) => {
      if (!params || params.length === 0) return ''
      const idx = params[0].dataIndex
      const p = props.data[idx]
      if (!p) return ''
      const time = new Date(p.time_slot).toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
      })
      const dir = p.dir === 0 && p.P50 === 0 ? 'Calme' : `${p.dir}°`
      const varDir = p.dir_sigma ? ` (±${p.dir_sigma}°)` : ''
      let html = `<b>${time}</b><br/>`
      html += `<span style="color:#2ecc71">●</span> Min (P10) : ${(p.P10 ?? 0).toFixed(1)} kt<br/>`
      html += `<span style="color:#3498db">●</span> Moyen (P50) : ${(p.P50 ?? 0).toFixed(1)} kt<br/>`
      html += `<span style="color:#e74c3c">●</span> Max (P90) : ${(p.P90 ?? 0).toFixed(1)} kt<br/>`
      html += `Direction : ${dir}${varDir}`
      return html
    },
  },
  legend: {
    data: ['Min', 'Moyen', 'Max', 'Direction'],
    textStyle: { color: '#ccc' },
    top: 0,
  },
  grid: {
    left: 50,
    right: 20,
    top: 55,
    bottom: 40,
  },
  xAxis: {
    type: 'category',
    data: timeLabels.value,
    axisLabel: { color: '#999', fontSize: 10, rotate: 45 },
    axisLine: { lineStyle: { color: '#666' } },
  },
  yAxis: {
    type: 'value',
    name: 'kt',
    nameTextStyle: { color: '#999' },
    min: 0,
    max: maxY.value,
    axisLabel: { color: '#999' },
    splitLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } },
  },
  series: [
    // Bande de variation P10-P90 (zone ombrée entre min et max)
    // Série invisible pour P10 (base de l'empilement)
    {
      name: 'Base P10',
      type: 'line',
      data: props.data.map((p) => p.P10 ?? 0),
      smooth: true,
      symbol: 'none',
      lineStyle: { width: 0, opacity: 0 },
      stack: 'variation',
      silent: true,
      showSymbol: false,
      areaStyle: {
        color: 'transparent', // Base invisible
      },
    },
    // Série pour la bande P90-P10 (empilée sur P10)
    {
      name: 'Variation',
      type: 'line',
      data: props.data.map((p) => {
        const min = p.P10 ?? 0
        const max = p.P90 ?? 0
        return Math.max(0, max - min) // Différence P90 - P10
      }),
      smooth: true,
      symbol: 'none',
      lineStyle: { width: 0, opacity: 0 },
      stack: 'variation',
      silent: true,
      showSymbol: false,
      areaStyle: {
        color: 'rgba(231, 76, 60, 0.12)', // Zone rouge semi-transparente
      },
      z: 1,
    },
    // Min (P10) — ligne verte en bas
    {
      name: 'Min',
      type: 'line',
      data: props.data.map((p) => p.P10 ?? 0),
      smooth: true,
      symbol: 'none',
      lineStyle: { color: 'rgba(46, 204, 113, 0.7)', width: 1, type: 'dashed' },
      itemStyle: { color: 'rgba(46, 204, 113, 0.8)' },
      z: 3,
    },
    // Moyen (P50) — ligne bleue principale
    {
      name: 'Moyen',
      type: 'line',
      data: props.data.map((p) => p.P50 ?? 0),
      smooth: true,
      symbol: 'circle',
      symbolSize: 4,
      lineStyle: { color: '#3498db', width: 2 },
      itemStyle: { color: '#3498db' },
      z: 4,
    },
    // Max (P90) — ligne rouge en haut (sans zone ombrée, juste la ligne)
    {
      name: 'Max',
      type: 'line',
      data: props.data.map((p) => p.P90 ?? 0),
      smooth: true,
      symbol: 'none',
      lineStyle: { color: 'rgba(231, 76, 60, 0.7)', width: 1, type: 'dashed' },
      itemStyle: { color: 'rgba(231, 76, 60, 0.8)' },
      z: 3,
    },
    // Flèches de direction (une par heure)
    {
      name: 'Direction',
      type: 'custom',
      renderItem: renderArrow,
      data: directionData.value,
      encode: { x: 0, y: 1 },
      z: 10,
    },
  ],
  backgroundColor: 'transparent',
}))
</script>

<style scoped>
.wind-history-chart {
  width: 100%;
  height: 300px;
}
</style>
