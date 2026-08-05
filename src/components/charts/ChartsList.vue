<template>
  <SectionCard :title="`Cartes ${chartType}`" :icon="iconName">
    <div class="row q-col-gutter-md">
      <div v-for="item in sortedCharts" :key="item.link" :class="colClass">
        <q-card
          flat
          bordered
          :class="['q-pa-sm text-center', statusClass(item)]"
          style="min-height: 70px"
        >
          <div class="text-subtitle1 text-grey-7">
            <a
              :href="item.link"
              target="_blank"
              rel="noopener noreferrer"
              class="text-primary"
              style="text-decoration: none"
            >
              <q-icon name="picture_as_pdf" class="q-mr-xs" color="red" />
              {{ chartType }}
              {{ formatDateUTC(item.date) }} UTC ({{ stateLabel(item) }})
            </a>
          </div>
          <div class="text-caption q-mt-xs">Zone : {{ item.zone }}, Niveau : {{ item.level }}</div>
        </q-card>
      </div>
    </div>
  </SectionCard>
</template>

<script setup>
import { computed } from 'vue'
import SectionCard from '../common/SectionCard.vue'
import {
  parseCustomDate,
  formatDateUTC,
  getChartStateLabel,
  getChartStatusClass,
} from '../../utils/dateHelpers'

const props = defineProps({
  chartList: {
    type: Array,
    default: () => [],
  },
  limit: {
    type: Number,
    default: null,
  },
  chartType: {
    type: String,
    required: true,
    validator: (value) => ['TEMSI', 'WINTEM'].includes(value),
  },
})

const iconName = computed(() => {
  return props.chartType === 'TEMSI' ? 'map' : 'air'
})

const stateLabel = (item) => getChartStateLabel(item)
const statusClass = (item) => getChartStatusClass(item)

const sortedCharts = computed(() => {
  const sorted = [...(props.chartList || [])].sort(
    (a, b) => parseCustomDate(b.date) - parseCustomDate(a.date),
  )
  return typeof props.limit === 'number' && props.limit > 0 ? sorted.slice(0, props.limit) : sorted
})

const colClass = computed(() => {
  const n = sortedCharts.value.length || 1
  const cols = Math.min(n, 4)
  const mdSize = Math.floor(12 / cols) || 12
  return `col-6 col-md-${mdSize}`
})
</script>

<style scoped>
/* status classes (paler variants) */
.courant {
  background: rgba(16, 185, 129, 0.06); /* softened positive */
  color: #222;
}
.futur {
  background: rgba(245, 158, 11, 0.06); /* pale warning */
  color: #222;
}
.perime {
  background: rgba(239, 68, 68, 0.08); /* softened negative */
  color: #222;
}
</style>
