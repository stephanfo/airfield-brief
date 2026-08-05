<template>
  <div v-if="hasEnvelope">
    <v-chart :option="chartOption" autoresize class="envelope-chart" />
  </div>
  <div v-else class="text-center text-grey-6 q-pa-lg">
    <q-icon name="show_chart" size="40px" class="q-mb-sm" />
    <div>Enveloppe de centrage indisponible pour cet avion.</div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart, ScatterChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components'
import VChart from 'vue-echarts'

use([CanvasRenderer, LineChart, ScatterChart, GridComponent, TooltipComponent, LegendComponent])

const props = defineProps({
  envelope: { type: Array, default: () => [] },
  takeoff: { type: Object, default: null }, // décollage = réservoir plein { cg, totalWeight }
  landing: { type: Object, default: null }, // atterrissage = réservoir vide (ZFW)
  current: { type: Object, default: null }, // carburant sélectionné (losange)
  line: { type: Array, default: () => [] }, // courbe plein → vide [[arm,weight],…]
  takeoffOk: { type: Boolean, default: true },
  landingOk: { type: Boolean, default: true },
  currentOk: { type: Boolean, default: true },
})

const hasEnvelope = computed(() => props.envelope.length >= 3)

/** Polygone fermé (répète le 1er sommet). */
const polygon = computed(() => {
  const pts = props.envelope.map((p) => [p.arm, p.weight])
  if (pts.length) pts.push(pts[0])
  return pts
})

const toPoint = (p) => (p?.cg != null ? [[p.cg, p.totalWeight]] : [])
const takeoffPoint = computed(() => toPoint(props.takeoff))
const landingPoint = computed(() => toPoint(props.landing))
const currentPoint = computed(() => toPoint(props.current))

// Courbe plein → vide. Fournie échantillonnée (hyperbole) ; repli sur le chord
// droit décollage → atterrissage si absente.
const segment = computed(() => {
  if (props.line.length >= 2) return props.line
  if (!takeoffPoint.value.length || !landingPoint.value.length) return []
  return [takeoffPoint.value[0], landingPoint.value[0]]
})

const GREEN = '#21ba45'
const RED = '#c10015'
const BLUE = '#1976d2'

const chartOption = computed(() => ({
  grid: { left: 56, right: 18, top: 30, bottom: 44 },
  legend: {
    data: ['Plein', 'Vide', 'Actuel'],
    textStyle: { color: '#ccc' },
    itemWidth: 12,
    itemHeight: 12,
    top: 0,
  },
  tooltip: {
    trigger: 'item',
    formatter: (p) => {
      if (!p.value) return ''
      return `${p.seriesName}<br/>Bras : ${Math.round(p.value[0])} mm<br/>Masse : ${Math.round(p.value[1])} kg`
    },
  },
  xAxis: {
    type: 'value',
    name: 'Bras (mm)',
    nameLocation: 'middle',
    nameGap: 28,
    nameTextStyle: { color: '#999' },
    scale: true,
    axisLabel: { color: '#999' },
    splitLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } },
  },
  yAxis: {
    type: 'value',
    name: 'kg',
    scale: true,
    nameTextStyle: { color: '#999' },
    axisLabel: { color: '#999' },
    splitLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } },
  },
  series: [
    {
      name: 'Enveloppe',
      type: 'line',
      data: polygon.value,
      lineStyle: { color: '#e67e22', width: 2 },
      itemStyle: { color: '#e67e22' },
      areaStyle: { color: 'rgba(230,126,34,0.10)' },
      symbol: 'none',
      z: 1,
    },
    {
      name: 'Épuisement carburant',
      type: 'line',
      data: segment.value,
      lineStyle: { color: '#888', width: 1, type: 'dashed' },
      symbol: 'none',
      silent: true,
      legendHoverLink: false,
      z: 2,
      tooltip: { show: false },
    },
    {
      name: 'Plein',
      type: 'scatter',
      data: takeoffPoint.value,
      symbolSize: 16,
      itemStyle: { color: props.takeoffOk ? GREEN : RED, borderColor: '#fff', borderWidth: 1.5 },
      z: 5,
    },
    {
      name: 'Vide',
      type: 'scatter',
      data: landingPoint.value,
      symbol: 'emptyCircle',
      symbolSize: 14,
      itemStyle: {
        color: props.landingOk ? GREEN : RED,
        borderColor: props.landingOk ? GREEN : RED,
        borderWidth: 2.5,
      },
      z: 3,
    },
    {
      name: 'Actuel',
      type: 'scatter',
      data: currentPoint.value,
      symbol: 'diamond',
      symbolSize: 14,
      itemStyle: { color: props.currentOk ? BLUE : RED, borderColor: '#fff', borderWidth: 1.5 },
      z: 10,
    },
  ],
  backgroundColor: 'transparent',
}))
</script>

<style scoped>
.envelope-chart {
  width: 100%;
  height: 320px;
}
</style>
