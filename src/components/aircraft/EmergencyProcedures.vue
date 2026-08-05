<template>
  <div v-if="!urgence && !secours" class="text-grey-6 text-body2">
    Aucune procédure d'urgence ou de secours définie pour cet avion.
  </div>
  <div v-else class="q-mb-md">
    <!-- Deux gros blocs d'accès direct, bien visibles en vol -->
    <div class="row q-col-gutter-md">
      <div v-if="urgence" class="col-12 col-sm-6">
        <q-card
          flat
          bordered
          class="emergency-tile bg-red-2 text-red-10 cursor-pointer"
          v-ripple
          @click="open('urgence')"
        >
          <q-icon name="warning" size="42px" />
          <div class="text-h5 text-weight-bold q-mt-sm">Urgence</div>
          <div class="text-caption">{{ urgence.sections.length }} procédures</div>
        </q-card>
      </div>
      <div v-if="secours" class="col-12 col-sm-6">
        <q-card
          flat
          bordered
          class="emergency-tile bg-orange-2 text-orange-10 cursor-pointer"
          v-ripple
          @click="open('secours')"
        >
          <q-icon name="medical_services" size="42px" />
          <div class="text-h5 text-weight-bold q-mt-sm">Secours</div>
          <div class="text-caption">{{ secours.sections.length }} procédures</div>
        </q-card>
      </div>
    </div>

    <!-- Overlay plein écran : grille de procédures puis détail -->
    <q-dialog v-model="dialog" maximized>
      <q-card :class="theme.bg">
        <q-bar :class="[theme.bar, 'text-white']">
          <q-btn
            v-if="selected != null"
            flat
            dense
            icon="arrow_back"
            label="Procédures"
            no-caps
            @click="selected = null"
          />
          <q-icon v-else :name="theme.icon" />
          <div class="text-weight-bold q-ml-sm">{{ theme.title }}</div>
          <q-space />
          <q-btn flat dense icon="close" aria-label="Fermer" v-close-popup />
        </q-bar>

        <!-- Taille de texte : pleine largeur sur mobile, ne suit pas l'échelle -->
        <q-card-section class="q-py-sm">
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
        </q-card-section>

        <q-card-section class="emergency-scroll" :style="{ fontSize: scale + 'em' }">
          <!-- Grille des sous-procédures -->
          <div v-if="selected == null" class="row q-col-gutter-md">
            <div
              v-for="(section, sIdx) in activeList.sections"
              :key="sIdx"
              class="col-12 col-sm-6 col-md-4"
            >
              <q-card
                flat
                bordered
                :class="[theme.tile, 'proc-tile cursor-pointer']"
                v-ripple
                @click="selected = sIdx"
              >
                <div class="text-weight-bold">{{ section.name }}</div>
                <q-icon name="chevron_right" />
              </q-card>
            </div>
          </div>

          <!-- Détail d'une procédure -->
          <div v-else>
            <div class="text-h5 text-weight-bold q-mb-md" :class="theme.text">
              {{ activeList.sections[selected].name }}
            </div>
            <div
              v-if="activeList.sections[selected].header"
              class="text-subtitle2 text-grey-8 q-mb-md"
            >
              {{ activeList.sections[selected].header }}
            </div>
            <q-list separator>
              <q-item
                v-for="(item, idx) in activeList.sections[selected].items"
                :key="idx"
                tag="label"
                v-ripple
                :class="checked(selected, idx) ? 'bg-green-1' : ''"
              >
                <q-item-section avatar>
                  <q-checkbox
                    :model-value="checked(selected, idx)"
                    color="positive"
                    size="lg"
                    @update:model-value="(v) => setChecked(selected, idx, v)"
                  />
                </q-item-section>
                <q-item-section>
                  <q-item-label
                    class="text-weight-bold"
                    :class="checked(selected, idx) ? 'text-strike text-grey-6' : ''"
                  >
                    {{ item.challenge }}
                  </q-item-label>
                  <q-item-label class="em-response text-grey-8">{{ item.response }}</q-item-label>
                </q-item-section>
              </q-item>
            </q-list>

            <q-btn
              flat
              no-caps
              color="grey-8"
              icon="restart_alt"
              label="Réinitialiser cette procédure"
              class="q-mt-md"
              @click="resetActive()"
            />
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useAircraftStore } from '../../stores/aircraftStore'
import { useChecklistChecks } from '../../composables/useChecklistChecks'
import { useChecklistTextScale } from '../../composables/useChecklistTextScale'

const aircraftStore = useAircraftStore()
const { selectedAircraft } = storeToRefs(aircraftStore)
const reg = computed(() => selectedAircraft.value?.registration ?? '_')

// Procédures d'urgence/secours dérivées de l'avion sélectionné (phase Emergency).
const emergency = computed(
  () => selectedAircraft.value?.checklists?.filter((c) => c.phase === 'Emergency') ?? [],
)
const urgence = computed(() => emergency.value.find((c) => /urgence/i.test(c.name)) ?? null)
const secours = computed(() => emergency.value.find((c) => /secours/i.test(c.name)) ?? null)

const { isChecked, setChecked: setCheckState, resetChecklist } = useChecklistChecks()
const { scale, setScale, options: textScaleOptions } = useChecklistTextScale()

const dialog = ref(false)
const active = ref('urgence') // 'urgence' | 'secours'
const selected = ref(null) // index de sous-procédure, null = grille

const activeList = computed(() => (active.value === 'secours' ? secours.value : urgence.value))

const THEMES = {
  urgence: {
    title: 'Procédures d’urgence',
    icon: 'warning',
    bar: 'bg-red-8',
    bg: 'bg-red-1',
    tile: 'bg-red-2 text-red-10',
    text: 'text-red-10',
  },
  secours: {
    title: 'Procédures de secours',
    icon: 'medical_services',
    bar: 'bg-orange-8',
    bg: 'bg-orange-1',
    tile: 'bg-orange-2 text-orange-10',
    text: 'text-orange-10',
  },
}
const theme = computed(() => THEMES[active.value])

function open(which) {
  active.value = which
  selected.value = null
  dialog.value = true
}

function checked(sIdx, idx) {
  return isChecked(reg.value, activeList.value.id, sIdx, idx)
}
function setChecked(sIdx, idx, v) {
  setCheckState(reg.value, activeList.value.id, sIdx, idx, v)
}
function resetActive() {
  // Réinitialise toute la check-list d'urgence active (toutes ses sections).
  resetChecklist(reg.value, activeList.value.id)
}
</script>

<style scoped>
.emergency-tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  text-align: center;
  min-height: 120px;
}
.proc-tile {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  min-height: 64px;
}
.emergency-scroll {
  overflow-y: auto;
  max-height: calc(100vh - 96px);
}
/* Le détail/commentaire suit l'échelle (em) de la zone de contenu. */
.em-response {
  font-size: 0.8em;
}
/* Boutons de taille un peu plus gros et bien lisibles. */
.text-size-toggle :deep(.q-btn) {
  font-size: 1rem;
  font-weight: 600;
}
</style>
