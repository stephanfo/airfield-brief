<template>
  <div v-if="!checklists.length" class="text-grey-6 text-body2">
    Aucune check-list définie pour cet avion.
  </div>
  <div v-else>
    <!-- Sélecteur + taille de texte -->
    <div class="row items-center q-col-gutter-md q-mb-md">
      <div class="col-12 col-sm">
        <q-select
          v-model="selectedId"
          :options="checklistOptions"
          emit-value
          map-options
          dense
          outlined
          label="Check-list"
        />
      </div>
      <div class="col-auto">
        <q-btn
          flat
          dense
          round
          icon="restart_alt"
          color="grey-7"
          aria-label="Réinitialiser la check-list"
          @click="resetCurrent"
        >
          <q-tooltip>Réinitialiser</q-tooltip>
        </q-btn>
      </div>
      <!-- Boutons de taille : pleine largeur sur mobile (col-12), compacts dès sm -->
      <div class="col-12 col-sm-auto">
        <q-btn-toggle
          :model-value="scale"
          :options="textScaleOptions"
          spread
          no-caps
          unelevated
          size="md"
          padding="sm md"
          toggle-color="primary"
          color="grey-3"
          text-color="grey-9"
          class="text-size-toggle"
          @update:model-value="setScale"
        >
          <q-tooltip>Taille du texte</q-tooltip>
        </q-btn-toggle>
      </div>
    </div>

    <div v-if="current" :style="{ fontSize: scale + 'em' }">
      <q-linear-progress
        :value="progress.ratio"
        size="20px"
        rounded
        color="positive"
        track-color="grey-3"
        class="q-mb-md"
      >
        <div class="absolute-full flex flex-center">
          <span class="text-caption text-weight-medium"
            >{{ progress.done }}/{{ progress.total }}</span
          >
        </div>
      </q-linear-progress>

      <q-list bordered class="rounded-borders">
        <q-expansion-item
          v-for="(section, sIdx) in current.sections"
          :key="sIdx"
          :ref="(el) => (sectionRefs[sIdx] = el)"
          :model-value="openSection === sIdx"
          :header-class="sectionComplete(sIdx) ? 'bg-green-1' : 'bg-blue-1 text-primary'"
          @update:model-value="(v) => (openSection = v ? sIdx : -1)"
        >
          <template #header>
            <q-item-section avatar>
              <q-icon
                :name="sectionComplete(sIdx) ? 'check_circle' : 'radio_button_unchecked'"
                :color="sectionComplete(sIdx) ? 'positive' : 'grey-5'"
                size="sm"
              />
            </q-item-section>
            <q-item-section>
              <q-item-label class="text-weight-bold">{{ section.name }}</q-item-label>
              <q-item-label v-if="section.header" caption>{{ section.header }}</q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-item-label caption>{{ doneCount(sIdx) }}/{{ section.items.length }}</q-item-label>
            </q-item-section>
          </template>

          <q-list>
            <q-item
              v-for="(item, idx) in section.items"
              :key="idx"
              tag="label"
              v-ripple
              :class="isChecked(reg, selectedId, sIdx, idx) ? 'bg-green-1' : ''"
            >
              <q-item-section avatar>
                <q-checkbox
                  :model-value="isChecked(reg, selectedId, sIdx, idx)"
                  color="positive"
                  @update:model-value="(v) => onToggle(sIdx, idx, v)"
                />
              </q-item-section>
              <q-item-section>
                <q-item-label
                  :class="
                    isChecked(reg, selectedId, sIdx, idx)
                      ? 'text-strike text-grey-6'
                      : 'text-weight-medium'
                  "
                >
                  {{ item.challenge }}
                </q-item-label>
                <q-item-label class="cl-response text-grey-7">{{ item.response }}</q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </q-expansion-item>
      </q-list>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useAircraftStore } from '../../stores/aircraftStore'
import { useChecklistChecks } from '../../composables/useChecklistChecks'
import { useChecklistTextScale } from '../../composables/useChecklistTextScale'

const aircraftStore = useAircraftStore()
const { selectedAircraft } = storeToRefs(aircraftStore)

const allChecklists = computed(() => selectedAircraft.value?.checklists ?? [])
// Les procédures d'urgence/secours (phase Emergency) ont leur propre onglet dédié.
const checklists = computed(() => allChecklists.value.filter((c) => c.phase !== 'Emergency'))

const checklistOptions = computed(() =>
  checklists.value.map((c) => ({ value: c.id, label: c.name })),
)

const { isChecked, setChecked, isSectionComplete, resetChecklist } = useChecklistChecks()
const { scale, setScale, options: textScaleOptions } = useChecklistTextScale()

const selectedId = ref(null)
const openSection = ref(0)
const sectionRefs = ref([])

// Amène le début de la section indiquée en haut de la fenêtre.
// Délai > transition d'ouverture/fermeture des q-expansion-item (~300 ms),
// sinon le scroll se fait avant que la section précédente n'ait fini de se replier.
function scrollSectionToTop(sIdx) {
  nextTick(() => {
    setTimeout(() => {
      // On vise l'en-tête de la sous-catégorie (et non son premier item) :
      // le `.q-item` d'en-tête de la q-expansion-item, qui porte un
      // `scroll-margin-top` pour passer sous le header collant de l'app.
      const root = sectionRefs.value[sIdx]?.$el
      const header = root?.querySelector('.q-expansion-item__container > .q-item') ?? root
      if (header) header.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 350)
  })
}
watch(
  checklists,
  (list) => {
    if (!list.length) {
      selectedId.value = null
    } else if (!list.some((c) => c.id === selectedId.value)) {
      selectedId.value = list[0].id
    }
  },
  { immediate: true },
)
// Nouvelle check-list → ouvre la première section.
watch(selectedId, () => (openSection.value = 0))

const current = computed(() => checklists.value.find((c) => c.id === selectedId.value) ?? null)
const reg = computed(() => selectedAircraft.value?.registration ?? '_')

function doneCount(sIdx) {
  const section = current.value?.sections[sIdx]
  if (!section) return 0
  let n = 0
  section.items.forEach((_, idx) => {
    if (isChecked(reg.value, selectedId.value, sIdx, idx)) n++
  })
  return n
}

function sectionComplete(sIdx) {
  const section = current.value?.sections[sIdx]
  if (!section) return false
  return isSectionComplete(reg.value, selectedId.value, sIdx, section.items.length)
}

// Coche un item ; si la section est alors complète, passe automatiquement à la suivante.
function onToggle(sIdx, idx, value) {
  setChecked(reg.value, selectedId.value, sIdx, idx, value)
  if (value && sectionComplete(sIdx) && current.value && sIdx < current.value.sections.length - 1) {
    openSection.value = sIdx + 1
    scrollSectionToTop(sIdx + 1)
  }
}

function resetCurrent() {
  resetChecklist(reg.value, selectedId.value)
  openSection.value = 0
}

const progress = computed(() => {
  if (!current.value) return { done: 0, total: 0, ratio: 0 }
  let total = 0
  let done = 0
  current.value.sections.forEach((section, sIdx) => {
    section.items.forEach((_, idx) => {
      total++
      if (isChecked(reg.value, selectedId.value, sIdx, idx)) done++
    })
  })
  return { done, total, ratio: total ? done / total : 0 }
})
</script>

<style scoped>
/* Le détail/commentaire suit l'échelle (em) du conteneur de la check-list. */
.cl-response {
  font-size: 0.8em;
}
/* Boutons de taille un peu plus gros et bien lisibles. */
.text-size-toggle :deep(.q-btn) {
  font-size: 1rem;
  font-weight: 600;
}
/* L'auto-scroll vers la section suivante cadre sur son en-tête : on réserve
   la hauteur du header collant de l'app (~50px) pour qu'il reste visible. */
:deep(.q-expansion-item__container > .q-item) {
  scroll-margin-top: 60px;
}
</style>
