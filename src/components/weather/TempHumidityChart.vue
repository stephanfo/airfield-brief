<template>
  <q-card flat bordered class="q-pa-md q-mb-lg">
    <div class="text-h5 q-mb-sm flex items-center text-primary text-weight-bold">
      <q-icon name="thermostat" size="md" class="q-mr-sm" />
      Température &amp; Humidité
    </div>

    <div v-if="hasData">
      <v-chart :option="chartOption" autoresize class="temp-humidity-chart" />
    </div>
    <div v-else class="text-center text-grey-6 q-pa-xl">
      <q-icon name="thermostat" size="48px" class="q-mb-sm" />
      <div>Aucune donnée disponible</div>
    </div>
  </q-card>
</template>

<script setup>
import { computed } from 'vue'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart } from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  MarkAreaComponent,
} from 'echarts/components'
import VChart from 'vue-echarts'
import { calculateDewPoint } from '../../utils/stationHelpers'

use([
  CanvasRenderer,
  LineChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  MarkAreaComponent,
])

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

/** Points de rosée calculés */
const dewPoints = computed(() =>
  props.data.map((p) => calculateDewPoint(p.temperature_c, p.humidity_percent)),
)

/** Zones d'alerte brouillard (temp - dew point < 2°C) */
const fogAlertAreas = computed(() => {
  const areas = []
  let inAlert = false
  let startIdx = 0

  for (let i = 0; i < props.data.length; i++) {
    const temp = props.data[i].temperature_c
    const dp = dewPoints.value[i]
    const isClose = dp !== null && temp - dp < 2

    if (isClose && !inAlert) {
      inAlert = true
      startIdx = i
    } else if (!isClose && inAlert) {
      inAlert = false
      areas.push([{ xAxis: timeLabels.value[startIdx] }, { xAxis: timeLabels.value[i - 1] }])
    }
  }
  // Fermer la zone si ouverte à la fin
  if (inAlert) {
    areas.push([
      { xAxis: timeLabels.value[startIdx] },
      { xAxis: timeLabels.value[props.data.length - 1] },
    ])
  }
  return areas
})

/** Plage Y température */
const tempRange = computed(() => {
  const temps = props.data.map((p) => p.temperature_c)
  const dps = dewPoints.value.filter((v) => v !== null)
  const allVals = [...temps, ...dps]
  return {
    min: Math.floor(Math.min(...allVals)) - 1,
    max: Math.ceil(Math.max(...allVals)) + 1,
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
      const dp = dewPoints.value[idx]
      const spread = dp !== null ? (p.temperature_c - dp).toFixed(1) : '—'
      let html = `<b>${time}</b><br/>`
      html += `<span style="color:#e74c3c">●</span> Température : ${p.temperature_c.toFixed(1)} °C<br/>`
      html += `<span style="color:#00bcd4">●</span> Point de rosée : ${dp !== null ? dp.toFixed(1) : '—'} °C<br/>`
      html += `<span style="color:#3498db">●</span> Humidité : ${p.humidity_percent.toFixed(0)} %<br/>`
      html += `Écart T-Td : ${spread} °C`
      if (dp !== null && p.temperature_c - dp < 2) {
        html += ' <span style="color:#e74c3c">⚠ Risque brouillard</span>'
      }
      return html
    },
  },
  legend: {
    data: ['Température', 'Point de rosée', 'Humidité'],
    textStyle: { color: '#ccc' },
    top: 0,
  },
  grid: {
    left: 50,
    right: 55,
    top: 50,
    bottom: 40,
  },
  xAxis: {
    type: 'category',
    data: timeLabels.value,
    axisLabel: { color: '#999', fontSize: 10, rotate: 45 },
    axisLine: { lineStyle: { color: '#666' } },
  },
  yAxis: [
    {
      type: 'value',
      name: '°C',
      nameTextStyle: { color: '#999' },
      min: tempRange.value.min,
      max: tempRange.value.max,
      axisLabel: { color: '#999' },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } },
    },
    {
      type: 'value',
      name: '%',
      nameTextStyle: { color: '#999' },
      min: 0,
      max: 100,
      axisLabel: { color: '#999' },
      splitLine: { show: false },
    },
  ],
  series: [
    // Température
    {
      name: 'Température',
      type: 'line',
      yAxisIndex: 0,
      data: props.data.map((p) => p.temperature_c),
      smooth: true,
      symbol: 'circle',
      symbolSize: 4,
      lineStyle: { color: '#e74c3c', width: 2 },
      itemStyle: { color: '#e74c3c' },
      // Zone ombrée entre température et point de rosée
      areaStyle: {
        color: 'rgba(0, 188, 212, 0.08)',
        origin: 'auto',
      },
      markArea: {
        silent: true,
        data: fogAlertAreas.value,
        itemStyle: {
          color: 'rgba(231, 76, 60, 0.1)',
        },
        label: {
          show: fogAlertAreas.value.length > 0,
          position: 'insideTop',
          formatter: '⚠ Brouillard',
          color: 'rgba(231, 76, 60, 0.6)',
          fontSize: 10,
        },
      },
    },
    // Point de rosée
    {
      name: 'Point de rosée',
      type: 'line',
      yAxisIndex: 0,
      data: dewPoints.value,
      smooth: true,
      symbol: 'none',
      lineStyle: { color: '#00bcd4', width: 2, type: 'dashed' },
      itemStyle: { color: '#00bcd4' },
    },
    // Humidité
    {
      name: 'Humidité',
      type: 'line',
      yAxisIndex: 1,
      data: props.data.map((p) => p.humidity_percent),
      smooth: true,
      symbol: 'none',
      lineStyle: { color: '#3498db', width: 1.5, opacity: 0.6 },
      itemStyle: { color: '#3498db' },
    },
  ],
  backgroundColor: 'transparent',
}))
</script>

<style scoped>
.temp-humidity-chart {
  width: 100%;
  height: 300px;
}
</style>
