<template>
  <q-page class="q-pa-md">
    <div class="q-mt-lg q-mb-lg text-center">
      <div class="text-h3 text-white text-weight-bold">REX Sécurité</div>
      <UpdateStatusIndicator
        :timestamp="generatedAt"
        :is-refreshing="isRefreshing"
        :stale-threshold="rexFfaConfig.staleThreshold"
        text-class="text-subtitle2 text-white q-mt-xs flex items-center justify-center"
      />
    </div>

    <DataLoadError
      :error="error"
      title="Erreur de chargement des REX FFA"
      :on-retry="forceRefresh"
    />

    <StaleDataBanner
      :timestamp="generatedAt"
      :stale-threshold="rexFfaConfig.staleThreshold"
      data-label="REX FFA"
    />

    <q-card flat bordered class="q-mb-md">
      <q-tabs
        v-model="tab"
        dense
        no-caps
        align="justify"
        active-color="primary"
        indicator-color="primary"
        class="text-grey-7 rex-tabs"
        narrow-indicator
      >
        <q-tab
          v-for="t in tabs"
          :key="t.name"
          :name="t.name"
          :icon="t.icon"
          :label="showLabels ? t.label : undefined"
        >
          <q-tooltip v-if="!showLabels">{{ t.label }}</q-tooltip>
        </q-tab>
      </q-tabs>
    </q-card>

    <q-tab-panels
      v-model="tab"
      animated
      keep-alive
      class="bg-transparent"
      @transition="onPanelTransition"
    >
      <q-tab-panel name="synthese" class="q-pa-none">
        <!-- Premier chargement (cache vide) : ne pas laisser un panneau blanc -->
        <div v-if="loading && !selectedSummary" class="text-center q-pa-xl">
          <q-spinner size="3em" color="primary" />
          <div class="text-subtitle1 text-grey-7 q-mt-md">Chargement des REX…</div>
        </div>
        <!-- Aucune synthèse servie, toutes périodes confondues -->
        <div v-else-if="periodOptions.length === 0" class="text-center q-pa-xl">
          <q-icon name="info" size="4em" color="grey-5" />
          <div class="text-h6 text-grey-7 q-mt-md">Aucune synthèse disponible</div>
          <div class="text-body2 text-grey-6 q-mt-sm">
            La synthèse mensuelle n'a pas encore été générée.
          </div>
        </div>
        <template v-else>
          <!-- Sélecteur d'archives intégré au titre de la carte (RexSummary) : reste
               monté même sur un mois sans texte, pour que l'utilisateur puisse en
               choisir un autre plutôt que rester bloqué. -->
          <RexSummary
            v-if="selectedSummary?.text"
            :summary="selectedSummary"
            :period-options="periodOptions"
            v-model="selectedPeriod"
            @cite="handleCite"
          />
          <template v-else>
            <q-select
              v-if="periodOptions.length > 1"
              v-model="selectedPeriod"
              :options="periodOptions"
              emit-value
              map-options
              dense
              outlined
              bg-color="white"
              label="Mois de la synthèse"
              class="q-mb-md"
            >
              <template #prepend>
                <q-icon name="event" color="primary" />
              </template>
            </q-select>
            <div class="text-center q-pa-xl">
              <q-icon name="info" size="4em" color="grey-5" />
              <div class="text-h6 text-grey-7 q-mt-md">Aucune synthèse pour ce mois</div>
              <div class="text-body2 text-grey-6 q-mt-sm">
                Choisissez un autre mois dans la liste ci-dessus.
              </div>
            </div>
          </template>
        </template>
      </q-tab-panel>
      <q-tab-panel name="rex" class="q-pa-none">
        <RexListTab ref="rexListTab" />
        <q-page-sticky v-if="arrivedViaCitation" position="bottom-right" :offset="[18, 18]">
          <q-btn
            fab
            icon="undo"
            color="primary"
            aria-label="Retour à la synthèse"
            @click="returnToSummary"
          >
            <q-tooltip>Retour à la synthèse</q-tooltip>
          </q-btn>
        </q-page-sticky>
      </q-tab-panel>
      <q-tab-panel name="soumission" class="q-pa-none">
        <RexSubmitTab @submitted="tab = 'synthese'" />
      </q-tab-panel>
    </q-tab-panels>
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { Notify } from 'quasar'
import { useRoute, useRouter } from 'vue-router'
import { useVisibilityRefresh } from '../composables/useVisibilityRefresh'
import { useTabQuerySync } from '../composables/useTabQuerySync'
import { useRexFfaStore } from '../stores/rexFfaStore'
import { getEndpointConfig } from '../config/app.config'
import { formatSummaryPeriod } from '../utils/rexHelpers'
import RexSummary from '../components/rex/RexSummary.vue'
import RexListTab from '../components/rex/RexListTab.vue'
import RexSubmitTab from '../components/rex/RexSubmitTab.vue'
import UpdateStatusIndicator from '../components/common/UpdateStatusIndicator.vue'
import DataLoadError from '../components/common/DataLoadError.vue'
import StaleDataBanner from '../components/common/StaleDataBanner.vue'

const route = useRoute()
const router = useRouter()

const rexFfaConfig = getEndpointConfig('rexFfa')

const rexFfaStore = useRexFfaStore()
const { generatedAt, summaries, loading, isRefreshing, error } = storeToRefs(rexFfaStore)

const forceRefresh = () => rexFfaStore.forceRefresh()

const tabs = [
  { name: 'synthese', icon: 'summarize', label: 'Synthèse' },
  { name: 'rex', icon: 'format_list_bulleted', label: 'REX' },
  { name: 'soumission', icon: 'edit_note', label: 'Soumettre' },
]

// Onglet actif ↔ query `?tab=` (raccourcis directs, redirection /rex-soumission).
// Seulement 3 libellés courts : on garde le texte plus bas que le seuil xs par
// défaut, ils tiennent sans se recouvrir jusque vers 380 px.
const { tab, showLabels } = useTabQuerySync(tabs, 'synthese', { labelsMinWidth: 380 })

// rex.json pèse ~2 Mo : une arrivée directe sur l'onglet Soumettre (ancien
// signet /rex-soumission) ne doit pas le télécharger. On ne charge que
// lorsqu'un onglet qui en a besoin est ou devient actif.
const needsRexData = computed(() => tab.value !== 'soumission')

useVisibilityRefresh(() => {
  if (needsRexData.value) rexFfaStore.loadRexFfa()
})

watch(needsRexData, (needs) => {
  if (needs) rexFfaStore.loadRexFfa()
})

// ============================================
// Archives : sélection du mois de synthèse
// ============================================

// Choix explicite de l'utilisateur ; `null` = aucun choix encore fait.
const pickedPeriod = ref(null)

const periodOptions = computed(() =>
  summaries.value.map((s) => ({ label: formatSummaryPeriod(s.period), value: s.period })),
)

// Le select doit afficher un libellé dès l'ouverture : à défaut de choix
// explicite, on retombe sur le mois le plus récent servi. Un nouveau mois publié
// par le script s'affiche ainsi sans que l'utilisateur ait à le rechoisir.
const selectedPeriod = computed({
  get: () => pickedPeriod.value ?? summaries.value[0]?.period ?? null,
  set: (value) => {
    pickedPeriod.value = value
  },
})

const selectedSummary = computed(() => rexFfaStore.findSummaryByPeriod(selectedPeriod.value))

// Une période choisie puis disparue de la fenêtre servie (mois sorti des 12 mois
// après un run du script) laisserait le select sur une valeur orpheline : on
// revient au suivi automatique du mois le plus récent.
watch(summaries, (list) => {
  if (pickedPeriod.value && !list.some((s) => s.period === pickedPeriod.value)) {
    pickedPeriod.value = null
  }
})

// ============================================
// Citation {id} depuis l'onglet Synthèse : valide l'id, bascule sur l'onglet
// REX en attendant la fin de l'animation du panneau, puis délègue à RexListTab.
// ============================================

const rexListTab = ref(null)

// Fin de transition des q-tab-panels : Quasar émet `transition` exactement à
// la fin de l'animation (après `transition-duration`), ce qui évite de deviner
// la durée avec un setTimeout.
let transitionResolvers = []

const onPanelTransition = () => {
  const resolvers = transitionResolvers
  transitionResolvers = []
  resolvers.forEach((resolve) => resolve())
}

// Filet : si l'événement ne vient pas (ex. `animated` retiré un jour, Quasar
// n'émet alors plus `transition`), on ne reste pas bloqué indéfiniment.
const waitForPanelTransition = () =>
  Promise.race([
    new Promise((resolve) => transitionResolvers.push(resolve)),
    new Promise((resolve) => setTimeout(resolve, 500)),
  ])

// ============================================
// Retour à la synthèse : FAB visible uniquement après un saut applicatif
// (citation cliquée ou lien direct ?rexId=) vers l'onglet REX, jamais lors
// d'un clic manuel de l'utilisateur sur l'onglet dans la barre.
// ============================================

const arrivedViaCitation = ref(false)
const returnToSummaryPeriod = ref(null)

// Sortie de l'onglet REX (que ce soit par le FAB ou par un clic manuel sur un
// autre onglet) : le contexte « arrivée via citation » ne tient plus, la
// prochaine visite de l'onglet sera un usage normal, sans FAB.
watch(tab, (val, oldVal) => {
  if (oldVal === 'rex' && val !== 'rex') {
    arrivedViaCitation.value = false
    returnToSummaryPeriod.value = null
  }
})

const returnToSummary = () => {
  // Lu AVANT de changer d'onglet : le watch(tab) ci-dessus remet la période à
  // null dès que l'onglet REX est quitté.
  const period = returnToSummaryPeriod.value
  if (period) pickedPeriod.value = period
  tab.value = 'synthese'
}

const handleCite = async (id) => {
  // La synthèse LLM peut citer un ID inexistant dans le JSON (erreur du
  // modèle) : on vérifie AVANT de changer d'onglet pour ne pas arracher
  // l'utilisateur de sa lecture pour rien.
  if (!rexFfaStore.findRexById(id)) {
    Notify.create({ type: 'warning', message: `REX #${id} introuvable dans les données.` })
    return
  }

  if (tab.value !== 'rex') {
    returnToSummaryPeriod.value = selectedPeriod.value
    arrivedViaCitation.value = true
    tab.value = 'rex'
    // Un scrollIntoView pendant l'animation cible un conteneur encore
    // transformé et n'aboutit pas : on attend la fin de la transition.
    await waitForPanelTransition()
  }

  // L'utilisateur a pu changer d'onglet pendant la transition : on abandonne
  // proprement plutôt que de modifier page/filtres sur un panneau caché.
  if (tab.value !== 'rex') return

  rexListTab.value?.handleCite(id)
}

// ============================================
// Lien direct vers un REX (`?rexId=`) : même traitement qu'un clic sur une
// citation, y compris le message d'erreur si le REX est absent du JSON servi
// (hors fenêtre glissante, ou id invalide).
// ============================================

const consumeRexIdFromQuery = async (rexId) => {
  if (!rexId) return

  // Un lien direct peut arriver avant que rex.json ne soit chargé. On attend
  // que les REX soient réellement disponibles plutôt que de surveiller
  // `loading` : celui-ci reste à false quand useDataFetcher déduplique une
  // requête déjà en vol (déclenchée par MainLayout), ce qui ferait conclure à
  // tort « REX introuvable ». On s'arrête aussi sur erreur, car le bandeau
  // DataLoadError informe déjà l'utilisateur — inutile d'ajouter un toast qui
  // le contredirait.
  if (!rexFfaStore.rexList.length && !error.value) {
    // Le chargement est déclenché par le watch(needsRexData) plus haut ; on le
    // redemande ici car un lien direct peut monter la page sans que ce watch
    // n'ait eu à se déclencher (l'onglet ciblé est déjà le bon).
    rexFfaStore.loadRexFfa()

    await new Promise((resolve) => {
      let timeout = null

      const stop = watch(
        () => [rexFfaStore.rexList.length, error.value],
        ([count, err]) => {
          if (count || err) {
            clearTimeout(timeout)
            stop()
            resolve()
          }
        },
      )

      // Filet : sans données ni erreur (réseau bloqué sans rejet), on ne reste
      // pas suspendu indéfiniment — handleCite affichera alors « introuvable ».
      timeout = setTimeout(() => {
        stop()
        resolve()
      }, 10000)
    })
  }

  // Chargement en échec : le bandeau d'erreur porte déjà le message, et on
  // garde `rexId` dans l'URL pour qu'un simple rechargement retente le saut.
  if (!rexFfaStore.rexList.length) return

  await handleCite(rexId)

  // On retire rexId de l'URL une fois le saut RÉUSSI, pour ne pas le rejouer
  // à un rechargement ou un retour arrière. En cas d'échec (REX absent du JSON
  // servi), on le laisse : recharger la page reste la voie de récupération
  // naturelle pour un lien partagé.
  if (!rexFfaStore.findRexById(rexId)) return

  const rest = { ...route.query }
  delete rest.rexId
  router.replace({ query: rest })
}

onMounted(() => consumeRexIdFromQuery(route.query.rexId))

// Chemin de la page, capturé au montage : les watchers de route se déclenchent
// aussi pendant la navigation VERS une autre page (même garde que
// useTabQuerySync), on ne doit pas y rejouer le saut.
const basePath = route.path

// Coller un lien ?rexId= dans un onglet DÉJÀ ouvert sur /rex-ffa ne remonte pas
// le composant : seule la query change, donc onMounted ne rejoue pas. Sans ce
// watch, le lien ne scrollerait que dans un nouvel onglet.
watch(
  () => route.query.rexId,
  (rexId) => {
    // On ignore la disparition de rexId (retrait par consumeRexIdFromQuery
    // lui-même après un saut réussi), sinon on rejouerait le saut en boucle.
    if (rexId && route.path === basePath) consumeRexIdFromQuery(rexId)
  },
)
</script>

<style scoped>
/* Les onglets icône-seule (mobile) ont un min-width Quasar de ~72px : on lève le
   plancher pour qu'ils se répartissent (align="justify") et tiennent à l'écran. */
.rex-tabs :deep(.q-tab) {
  min-width: 0;
}
</style>
