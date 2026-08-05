<template>
  <div>
    <!-- Premier chargement (cache vide) : ne pas afficher « Aucun REX » à tort -->
    <div v-if="loading && totalCount === 0" class="text-center q-pa-xl">
      <q-spinner size="3em" color="primary" />
      <div class="text-subtitle1 text-grey-7 q-mt-md">Chargement des REX…</div>
    </div>

    <template v-else>
      <RexFilters
        v-if="totalCount > 0"
        :search="filters.search"
        :type="filters.type"
        :subject="filters.subject"
        :regime="filters.regime"
        :flight-kind="filters.flightKind"
        :event-kind="filters.eventKind"
        :club-only="filters.clubOnly"
        :options="filterOptions"
        :filtered-count="filteredCount"
        :total-count="totalCount"
        @update:search="filters.search = $event"
        @update:type="filters.type = $event"
        @update:subject="filters.subject = $event"
        @update:regime="filters.regime = $event"
        @update:flight-kind="filters.flightKind = $event"
        @update:event-kind="filters.eventKind = $event"
        @update:club-only="filters.clubOnly = $event"
        @reset="resetFilters"
      />

      <div v-if="totalCount === 0" class="text-center q-pa-xl">
        <q-icon name="info" size="4em" color="grey-5" />
        <div class="text-h6 text-grey-7 q-mt-md">Aucun REX disponible</div>
        <div class="text-body2 text-grey-6 q-mt-sm">
          Les données REX FFA n'ont pas encore été générées ou n'ont pas pu être chargées.
        </div>
      </div>

      <div v-else-if="filteredCount === 0" class="text-center q-pa-xl">
        <q-icon name="filter_alt_off" size="4em" color="grey-5" />
        <div class="text-h6 text-grey-7 q-mt-md">Aucun REX ne correspond aux filtres</div>
        <div class="text-body2 text-grey-6 q-mt-sm">
          Essayez de modifier ou réinitialiser les filtres pour voir plus de résultats.
        </div>
      </div>

      <template v-else>
        <!-- Sentinelle de scroll (retour en haut de liste au changement de page) -->
        <div ref="listTopRef" class="rex-list-top" />

        <RexCard
          v-for="rex in pageItems"
          :id="`rex-${rex.id}`"
          :key="rex.id"
          :rex="rex"
          :highlight="rex.id === highlightedId"
        />

        <div class="row justify-center q-mt-lg" v-if="pageCount > 1">
          <q-card flat bordered class="q-pa-xs">
            <q-pagination
              v-model="page"
              :max="pageCount"
              :max-pages="7"
              boundary-numbers
              direction-links
              color="primary"
              active-color="primary"
              active-text-color="white"
              @update:model-value="scrollToListTop"
            />
          </q-card>
        </div>
      </template>
    </template>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { Notify } from 'quasar'
import { useRexFfaStore } from '../../stores/rexFfaStore'
import { matchesAllFilters, distinctValues } from '../../utils/rexHelpers'
import RexFilters from './RexFilters.vue'
import RexCard from './RexCard.vue'

const PAGE_SIZE = 20
const HIGHLIGHT_DURATION_MS = 4000

const rexFfaStore = useRexFfaStore()
const { rexList, loading } = storeToRefs(rexFfaStore)

// ============================================
// Filtres — état d'UI local (même pattern que NotamPage),
// prédicats purs dans src/utils/rexHelpers.js
// ============================================

const defaultFilters = () => ({
  type: 'all',
  subject: 'all',
  regime: 'all',
  flightKind: 'all',
  eventKind: 'all',
  search: '',
  clubOnly: false,
})

const filters = ref(defaultFilters())

const resetFilters = () => {
  filters.value = defaultFilters()
}

// Options disponibles pour chaque filtre, dérivées des données réelles
const filterOptions = computed(() => ({
  types: distinctValues(rexList.value, 'type'),
  subjects: distinctValues(rexList.value, 'subject'),
  regimes: distinctValues(rexList.value, 'flightRegime'),
  flightKinds: distinctValues(rexList.value, 'flightKind'),
  eventKinds: distinctValues(rexList.value, 'eventKind'),
}))

/** REX filtrés, triés par date d'évènement décroissante. */
const filteredRexList = computed(() => {
  return rexList.value
    .filter((rex) => matchesAllFilters(rex, filters.value))
    .sort((a, b) => (b.eventDate || '').localeCompare(a.eventDate || ''))
})

const filteredCount = computed(() => filteredRexList.value.length)
const totalCount = computed(() => rexList.value.length)

// ============================================
// Pagination client (709 REX potentiels sur 12 mois glissants) : on filtre
// puis on découpe côté front, comme le reste de l'app charge tout le JSON.
// ============================================

const page = ref(1)
const pageCount = computed(() => Math.max(1, Math.ceil(filteredCount.value / PAGE_SIZE)))
const pageItems = computed(() => {
  const start = (page.value - 1) * PAGE_SIZE
  return filteredRexList.value.slice(start, start + PAGE_SIZE)
})

// Tout changement de filtre repart en page 1 : la page N d'un jeu de résultats
// n'a aucun sens dans un autre jeu, même de taille identique.
watch(filters, () => (page.value = 1), { deep: true })

// Filet si les données rafraîchies réduisent la liste sous la page courante
watch(pageCount, (max) => {
  if (page.value > max) page.value = 1
})

const listTopRef = ref(null)

// Changement de page via la pagination (en bas de liste) : ramener l'utilisateur
// en haut de la nouvelle page de résultats.
const scrollToListTop = async () => {
  await nextTick()
  listTopRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

// ============================================
// Citations {id} de la synthèse : localise le REX dans la liste filtrée,
// saute à sa page, scrolle jusqu'à sa carte et la met en évidence.
// Appelée depuis la page conteneur (via defineExpose) après bascule d'onglet.
// ============================================

const highlightedId = ref(null)
let highlightTimer = null

const setHighlight = (id) => {
  highlightedId.value = id
  clearTimeout(highlightTimer)
  highlightTimer = setTimeout(() => {
    highlightedId.value = null
  }, HIGHLIGHT_DURATION_MS)
}

onBeforeUnmount(() => clearTimeout(highlightTimer))

const findFilteredIndex = (id) =>
  filteredRexList.value.findIndex((rex) => String(rex.id) === String(id))

/**
 * Attend qu'un élément apparaisse dans le DOM (max ~1 s), en laissant le
 * navigateur peindre entre deux essais. Renvoie l'élément, ou null s'il ne
 * vient jamais (on renonce alors au scroll plutôt que de bloquer).
 */
const waitForElement = async (elementId) => {
  for (let i = 0; i < 60; i++) {
    const el = document.getElementById(elementId)
    if (el) return el
    await new Promise((resolve) => requestAnimationFrame(resolve))
  }
  return document.getElementById(elementId)
}

// L'id est déjà validé (findRexById) par la page conteneur avant l'appel.
const handleCite = async (id) => {
  let index = findFilteredIndex(id)
  if (index === -1) {
    // Le REX cité est hors du filtre courant (ex: filtre « club » actif) :
    // on lève les filtres en le signalant, plutôt que de le faire en silence.
    resetFilters()
    Notify.create({
      type: 'info',
      message: `Filtres réinitialisés pour afficher le REX #${id}.`,
      timeout: 2500,
    })
    await nextTick()
    index = findFilteredIndex(id)
    if (index === -1) return
  }

  page.value = Math.floor(index / PAGE_SIZE) + 1

  // La carte n'est pas forcément dans le DOM au tick suivant : sur une arrivée
  // par lien direct (?rexId=), la liste vient d'être montée ET la pagination
  // change au même moment, donc le rendu de la nouvelle page prend quelques
  // frames. On attend l'élément lui-même plutôt qu'un nombre de ticks deviné.
  const card = await waitForElement(`rex-${id}`)

  // Sans carte au bout de l'attente, surligner ne ferait que teinter une carte
  // hors écran pendant 4 s : on préfère le dire, l'utilisateur reste sur la
  // bonne page et peut chercher le REX à la main.
  if (!card) {
    Notify.create({
      type: 'warning',
      message: `Impossible d'afficher le REX #${id} dans la liste.`,
      timeout: 2500,
    })
    return
  }

  setHighlight(id)

  // Le panneau d'onglets (q-tab-panels `animated`) applique un transform CSS
  // pendant son animation ; un scrollIntoView lancé à ce moment se calcule sur
  // une position transitoire et n'aboutit pas — la carte est bien surlignée
  // mais la page ne bouge pas. On laisse l'animation finir, comme le fait déjà
  // ChecklistRunner.vue pour ses q-expansion-item.
  await new Promise((resolve) => setTimeout(resolve, 350))

  // `start` et non `center` : une carte REX dépasse souvent la hauteur d'un
  // écran mobile, et centrer son milieu ferait alors sortir son haut (titre,
  // badges) de l'écran — on cale donc son début sous le header fixe, via le
  // scroll-margin-top de .rex-card.
  card.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

// Exposé à la page conteneur : depuis l'onglet Synthèse, un clic sur une
// citation bascule sur cet onglet puis appelle handleCite une fois la
// transition du panneau terminée (le panneau est alors monté et visible —
// keep-alive ne met en cache une instance qu'après sa première activation).
defineExpose({ handleCite })
</script>

<style scoped>
/* Laisse la sentinelle de scroll s'arrêter sous le header fixe */
.rex-list-top {
  scroll-margin-top: 70px;
}
</style>
