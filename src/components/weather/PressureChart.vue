<template>
  <q-card flat bordered class="q-pa-md q-mb-lg">
    <div class="text-h5 q-mb-sm flex items-center text-primary text-weight-bold">
      <q-icon name="speed" size="md" class="q-mr-sm" />
      Pression Atmosphérique
    </div>

    <!-- Tendance barométrique -->
    <div v-if="hasData" class="q-mb-sm">
      <q-badge :color="trendColor" class="q-pa-sm text-body2">
        <q-icon :name="trendIcon" size="16px" class="q-mr-xs" />
        {{ trendLabel }} ({{ trendDelta }})
      </q-badge>
    </div>

    <div v-if="hasData">
      <v-chart :option="chartOption" autoresize class="pressure-chart" />
    </div>
    <div v-else class="text-center text-grey-6 q-pa-xl">
      <q-icon name="speed" size="48px" class="q-mb-sm" />
      <div>Aucune donnée disponible</div>
    </div>
  </q-card>
</template>

<script setup>
import { computed } from 'vue'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components'
import VChart from 'vue-echarts'
import { calculateQNH, calculatePressureTrend } from '../../utils/stationHelpers'

use([CanvasRenderer, LineChart, GridComponent, TooltipComponent, LegendComponent])

/**
 * Props - Format natif atmosphere.json
 * @type {{ data: Array<{ temperature_c: number, humidity_percent: number, pressure_hpa: number, time_slot: string }> }}
 */
const props = defineProps({
  data: { type: Array, default: () => [] },
})

const hasData = computed(() => props.data.length > 0)

/** Timestamps pour l'axe X */
const timeLabels = computed(() =>
  props.data.map((p) =>
    new Date(p.time_slot).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
  ),
)

/** QNH calculé pour chaque point */
const qnhValues = computed(() => props.data.map((p) => calculateQNH(p.pressure_hpa)))

/** Tendance barométrique */
const pressureTrend = computed(() => calculatePressureTrend(props.data))

const trendIcon = computed(() => {
  switch (pressureTrend.value.trend) {
    case 'rising':
      return 'trending_up'
    case 'falling':
      return 'trending_down'
    default:
      return 'trending_flat'
  }
})

const trendColor = computed(() => {
  switch (pressureTrend.value.trend) {
    case 'rising':
      return 'green'
    case 'falling':
      return 'orange'
    default:
      return 'blue-grey'
  }
})

const trendLabel = computed(() => {
  switch (pressureTrend.value.trend) {
    case 'rising':
      return 'En hausse'
    case 'falling':
      return 'En baisse'
    default:
      return 'Stable'
  }
})

const trendDelta = computed(() => {
  const d = pressureTrend.value.delta
  const sign = d > 0 ? '+' : ''
  return `${sign}${d} hPa / 3h`
})

/** Plage Y : affichage centré sur les valeurs pour bien voir les variations */
const pressureRange = computed(() => {
  const qfe = props.data.map((p) => p.pressure_hpa)
  const qnh = qnhValues.value.filter((v) => v !== null)
  const allVals = [...qfe, ...qnh]
  const min = Math.min(...allVals)
  const max = Math.max(...allVals)
  return {
    min: Math.floor(min) - 1,
    max: Math.ceil(max) + 1,
  }
})

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
      const qnh = qnhValues.value[idx]
      let html = `<b>${time}</b><br/>`
      html += `<span style="color:#9b59b6">●</span> QFE : ${p.pressure_hpa.toFixed(1)} hPa<br/>`
      html += `<span style="color:#e67e22">●</span> QNH : ${qnh !== null ? qnh.toFixed(1) : '—'} hPa`
      return html
    },
  },
  legend: {
    data: ['QFE (station)', 'QNH (niveau mer)'],
    textStyle: { color: '#ccc' },
    top: 0,
  },
  grid: {
    left: 60,
    right: 20,
    top: 50,
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
    name: 'hPa',
    nameTextStyle: { color: '#999' },
    min: pressureRange.value.min,
    max: pressureRange.value.max,
    axisLabel: { color: '#999' },
    splitLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } },
  },
  series: [
    // QFE
    {
      name: 'QFE (station)',
      type: 'line',
      data: props.data.map((p) => p.pressure_hpa),
      smooth: true,
      symbol: 'circle',
      symbolSize: 4,
      lineStyle: { color: '#9b59b6', width: 2 },
      itemStyle: { color: '#9b59b6' },
    },
    // QNH
    {
      name: 'QNH (niveau mer)',
      type: 'line',
      data: qnhValues.value,
      smooth: true,
      symbol: 'none',
      lineStyle: { color: '#e67e22', width: 2, type: 'dashed' },
      itemStyle: { color: '#e67e22' },
    },
  ],
  backgroundColor: 'transparent',
}))
</script>

<style scoped>
.pressure-chart {
  width: 100%;
  height: 280px;
}
</style>
