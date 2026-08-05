<template>
  <!-- summary.text peut être vide (fail-safe backend niveau 3) : ne rien afficher -->
  <SectionCard v-if="summary?.text" title="Synthèse REX" icon="summarize">
    <template v-if="periodOptions.length > 1" #header-actions>
      <q-select
        :model-value="modelValue"
        :options="periodOptions"
        emit-value
        map-options
        dense
        outlined
        bg-color="white"
        style="min-width: 180px"
        @update:model-value="(value) => emit('update:modelValue', value)"
      >
        <template #prepend>
          <q-icon name="event" color="primary" />
        </template>
      </q-select>
    </template>

    <div v-for="(block, idx) in blocks" :key="idx" class="q-mb-xs">
      <q-separator v-if="block.type === 'hr'" class="q-my-md" />

      <div
        v-else-if="block.type === 'heading'"
        :class="block.level === 2 ? 'text-h6' : 'text-subtitle1'"
        class="text-primary text-weight-bold q-mt-md"
      >
        <RexSummaryInline :parts="block.parts" @cite="scrollToRex" />
      </div>

      <div v-else-if="block.type === 'listItem'" class="text-body2 q-ml-md">
        <q-icon name="chevron_right" size="xs" class="q-mr-xs" />
        <RexSummaryInline :parts="block.parts" @cite="scrollToRex" />
      </div>

      <div
        v-else
        class="text-body2"
        :class="
          isTakeaway(block)
            ? 'rex-takeaway bg-green-1 text-green-9 q-pa-sm q-mt-sm rounded-borders'
            : ''
        "
      >
        <q-icon v-if="isTakeaway(block)" name="lightbulb" size="xs" class="q-mr-xs" />
        <RexSummaryInline :parts="block.parts" @cite="scrollToRex" />
      </div>
    </div>

    <q-separator class="q-my-md" />
    <div class="text-right">
      <q-btn
        flat
        dense
        no-caps
        icon="content_copy"
        label="Copier la synthèse"
        color="primary"
        @click="handleCopy"
      />
    </div>
  </SectionCard>
</template>

<script setup>
import { computed } from 'vue'
import { useQuasar } from 'quasar'
import SectionCard from '../common/SectionCard.vue'
import RexSummaryInline from './RexSummaryInline.vue'
import { parseSummaryMarkdown, formatSummaryForSharing } from '../../utils/rexHelpers'

const props = defineProps({
  summary: {
    type: Object,
    default: null,
  },
  // Mois disponibles ({label, value}, cf. RexFfaPage) : le sélecteur ne s'affiche
  // dans le titre que s'il y a un choix à faire (plus d'un mois).
  periodOptions: {
    type: Array,
    default: () => [],
  },
  modelValue: {
    type: String,
    default: null,
  },
})

const emit = defineEmits(['cite', 'update:modelValue'])

const $q = useQuasar()

const blocks = computed(() => parseSummaryMarkdown(props.summary?.text || ''))

/**
 * Détecte la ligne « À retenir » de fin de thème (préfixe **À retenir :** imposé
 * par le prompt) pour la mettre en avant visuellement (encart vert + ampoule).
 */
const isTakeaway = (block) => {
  const first = block.parts?.[0]
  return first?.type === 'bold' && first.value.trim().toLowerCase().startsWith('à retenir')
}

const scrollToRex = (id) => emit('cite', id)

const handleCopy = async () => {
  try {
    await navigator.clipboard.writeText(formatSummaryForSharing(props.summary?.text || ''))
    $q.notify({
      type: 'positive',
      message: 'Synthèse copiée dans le presse-papier',
      icon: 'check_circle',
      timeout: 2000,
    })
  } catch {
    $q.notify({
      type: 'negative',
      message: 'Impossible de copier la synthèse',
      timeout: 2000,
    })
  }
}
</script>
