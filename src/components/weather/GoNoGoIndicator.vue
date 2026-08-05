<template>
  <SectionCard title="Go / No-Go VFR (IA)" icon="traffic">
    <template #header-actions>
      <q-chip
        :color="isStale ? 'grey-7' : meta.color"
        text-color="white"
        :icon="isStale ? 'update_disabled' : meta.icon"
        :label="isStale ? '—' : meta.label"
        class="text-weight-bold"
      />
    </template>

    <div
      v-if="timestamp"
      :class="['freshness-line q-mb-sm', isStale ? 'text-negative' : 'text-grey-6']"
    >
      <q-icon :name="isStale ? 'warning' : 'schedule'" size="14px" class="q-mr-xs" />
      <span v-if="isStale">Données possiblement périmées — </span>{{ formatTimeAgo(timestamp) }}
    </div>

    <div class="criteria-grid">
      <div v-for="c in criteria" :key="c.key" :class="['criterion-item', `level-${c.level}`]">
        <q-icon :name="criterionIcon(c.key)" size="xs" class="q-mr-xs" />
        <span class="criterion-label">{{ c.label }}</span>
        <span class="criterion-value">{{ c.formatted }}</span>
        <q-badge
          :color="criterionLevelColor(c.level)"
          :label="criterionLevelLabel(c.level)"
          class="criterion-badge"
        />
      </div>
    </div>
  </SectionCard>
</template>

<script setup>
import { computed } from 'vue'
import SectionCard from '../common/SectionCard.vue'
import {
  goNoGoMeta,
  criterionIcon,
  criterionLevelColor,
  criterionLevelLabel,
} from '../../utils/goNoGoHelpers'
import { formatTimeAgo } from '../../utils/dateHelpers'

const props = defineProps({
  /** Résultat de evaluateGoNoGo() — null si données non disponibles */
  goNoGo: {
    type: Object,
    default: null,
  },
  /** Horodatage ISO de génération du fichier météo (isoNow de weather.json) */
  timestamp: {
    type: String,
    default: null,
  },
  /** Vrai si la donnée dépasse le staleThreshold de l'endpoint weather */
  isStale: {
    type: Boolean,
    default: false,
  },
})

const status = computed(() => props.goNoGo?.status ?? 'marginal')
const criteria = computed(() => props.goNoGo?.criteria ?? [])

const meta = computed(() => goNoGoMeta(status.value))
</script>

<style scoped>
.freshness-line {
  font-size: 0.78em;
  display: flex;
  align-items: center;
}

.criteria-grid {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.criterion-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  border-radius: 6px;
  font-size: 0.9em;
}

.criterion-item.level-good {
  background: rgba(46, 204, 113, 0.08);
}

.criterion-item.level-marginal {
  background: rgba(243, 156, 18, 0.1);
}

.criterion-item.level-poor {
  background: rgba(231, 76, 60, 0.1);
}

.criterion-label {
  flex: 1;
  color: var(--q-dark);
  opacity: 0.8;
}

.criterion-value {
  font-weight: 600;
  min-width: 60px;
  text-align: right;
}

.criterion-badge {
  min-width: 72px;
  text-align: center;
}
</style>
