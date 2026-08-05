<template>
  <q-page class="q-pa-md">
    <div class="q-mt-lg q-mb-xl text-center">
      <div class="text-h3 text-white text-weight-bold">NOTAM</div>
      <UpdateStatusIndicator
        :timestamp="generatedAt"
        :is-refreshing="isRefreshing"
        :stale-threshold="getEndpointConfig('notam').staleThreshold"
        text-class="text-subtitle2 text-white q-mt-xs flex items-center justify-center"
      />
    </div>

    <DataLoadError :error="error" title="Erreur de chargement des NOTAM" :on-retry="forceRefresh" />

    <StaleDataBanner
      :timestamp="generatedAt"
      :stale-threshold="getEndpointConfig('notam').staleThreshold"
      data-label="NOTAM"
    />

    <!-- Résumé des NOTAMs -->
    <NotamSummary :notam-data="notamData" />

    <!-- Barre de filtres -->
    <NotamFilters
      v-model:validity="validityFilter"
      v-model:traffic="trafficFilter"
      v-model:fl-range="flRange"
      v-model:show-hidden="showHiddenNotams"
      :hidden-count="hiddenCount"
      @reset-hidden="confirmUnhideAll"
    />

    <!-- Section AD (Aérodromes) -->
    <div v-if="filteredAD.length > 0" class="q-mb-lg">
      <div class="text-h5 text-white q-mb-md">
        <q-icon name="flight" class="q-mr-sm" />
        Aérodromes (AD)
      </div>

      <!-- Aérodrome expansion items -->
      <q-expansion-item
        v-for="aerodrome in filteredAD"
        :key="aerodrome.code"
        :label="`${aerodrome.name} (${aerodrome.code})`"
        :caption="`${aerodrome.totalNotams} NOTAM(s)`"
        default-opened
        expand-separator
        icon="flight_takeoff"
        class="q-mb-sm bg-white rounded-borders"
      >
        <!-- Catégories de l'aérodrome -->
        <q-card>
          <q-expansion-item
            v-for="category in aerodrome.categories"
            :key="category.name"
            :label="category.label"
            :caption="`${category.notams.length} NOTAM(s)`"
            default-opened
            dense-toggle
            expand-separator
            class="bg-orange-2"
          >
            <q-card>
              <q-list separator>
                <NotamCard
                  v-for="notam in category.notams"
                  :key="notam.id"
                  :notam="notam"
                  :is-hidden="isHidden(notam.id)"
                  :is-new="isNew(notam.id)"
                  @hide="handleHideNotam"
                  @mark-seen="handleMarkSeen"
                />
              </q-list>
            </q-card>
          </q-expansion-item>
        </q-card>
      </q-expansion-item>
    </div>

    <!-- Section FIR -->
    <div v-if="filteredFIR.length > 0">
      <div class="text-h5 text-white q-mb-md">
        <q-icon name="public" class="q-mr-sm" />
        FIR
      </div>

      <!-- FIR expansion items -->
      <q-expansion-item
        v-for="firCategory in filteredFIR"
        :key="firCategory.name"
        :label="firCategory.label"
        :caption="`${firCategory.totalNotams} NOTAM(s)`"
        default-opened
        expand-separator
        icon="map"
        class="q-mb-lg bg-white rounded-borders"
      >
        <q-card>
          <!-- Groupes par code23 -->
          <q-expansion-item
            v-for="group in firCategory.groups"
            :key="group.code23"
            :label="group.label"
            :caption="`${group.totalNotams} NOTAM(s)`"
            default-opened
            dense-toggle
            expand-separator
            class="bg-orange-2"
          >
            <q-card>
              <!-- Aérodromes impactés -->
              <q-expansion-item
                v-for="impacted in group.impactedAerodromes"
                :key="impacted.code"
                :label="impacted.name"
                :caption="`${impacted.notams.length} NOTAM(s)`"
                default-opened
                dense-toggle
                expand-separator
                class="bg-grey-3"
              >
                <q-card>
                  <q-list separator>
                    <NotamCard
                      v-for="notam in impacted.notams"
                      :key="notam.id"
                      :notam="notam"
                      :is-hidden="isHidden(notam.id)"
                      :is-new="isNew(notam.id)"
                      @hide="handleHideNotam"
                      @mark-seen="handleMarkSeen"
                    />
                  </q-list>
                </q-card>
              </q-expansion-item>
            </q-card>
          </q-expansion-item>
        </q-card>
      </q-expansion-item>
    </div>

    <!-- Message si aucun NOTAM -->
    <div v-if="filteredNotamsCount === 0" class="text-center q-pa-xl">
      <q-icon name="info" size="4em" color="grey-5" />
      <div class="text-h6 text-grey-7 q-mt-md">Aucun NOTAM trouvé</div>
      <div class="text-body2 text-grey-6 q-mt-sm">
        Essayez de modifier les filtres pour voir plus de résultats.
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useVisibilityRefresh } from '../composables/useVisibilityRefresh'
import { useHiddenNotams } from '../composables/useHiddenNotams'
import { useSeenNotams } from '../composables/useSeenNotams'
import {
  formatCategoryName,
  matchesValidityFilter,
  matchesTrafficFilter,
  matchesFlRange,
  qLineCode23Map,
} from '../utils/notamHelpers'
import { NOTAM_CATEGORIES } from '../config/constants'
import NotamCard from '../components/NotamCard.vue'
import NotamFilters from '../components/NotamFilters.vue'
import NotamSummary from '../components/NotamSummary.vue'
import UpdateStatusIndicator from '../components/common/UpdateStatusIndicator.vue'
import DataLoadError from '../components/common/DataLoadError.vue'
import StaleDataBanner from '../components/common/StaleDataBanner.vue'
import { storeToRefs } from 'pinia'
import { useNotamStore } from '../stores/notamStore'
import { getEndpointConfig } from '../config/app.config'

// Quasar et composables
const $q = useQuasar()
const {
  hideNotam,
  unhideNotam,
  clearAllHidden,
  isHidden,
  hiddenCount,
  cleanupExpired,
  pruneStale: pruneStaleHidden,
} = useHiddenNotams()
const {
  markAsSeen,
  isNew,
  cleanupExpired: cleanupExpiredSeen,
  pruneStale: pruneStaleSeen,
} = useSeenNotams()

const notamStore = useNotamStore()
const { rawData: notamData, generatedAt, isRefreshing, error } = storeToRefs(notamStore)

const forceRefresh = () => notamStore.forceRefresh()

// État
const validityFilter = ref('current')
const trafficFilter = ref('vfr')
const flRange = ref({ min: 0, max: 100 })
const showHiddenNotams = ref(false)

useVisibilityRefresh(() => notamStore.loadNotams())

/**
 * Applique les trois filtres (validité, trafic, FL) + le masquage.
 * Les prédicats purs vivent dans notamHelpers (testés unitairement).
 */
const passesAllFilters = (notam) =>
  matchesValidityFilter(notam, validityFilter.value) &&
  matchesTrafficFilter(notam, trafficFilter.value) &&
  matchesFlRange(notam, flRange.value) &&
  (showHiddenNotams.value || !isHidden(notam.id))

// Traiter les données AD
const filteredAD = computed(() => {
  if (!notamData.value?.notamList?.listnotams?.AD) return []

  const adList = notamData.value.notamList.listnotams.AD
  const result = []

  adList.forEach((aerodrome) => {
    const categories = []

    // Parcourir toutes les catégories possibles
    const categoryKeys = [
      'aerodromes_services',
      'aire_mouvement',
      'aire_trafic',
      'balisage',
      'aides_atter_instal_radionav_GNSS',
      'procedures',
      'organisation_espace_services_circulation',
      'meteorologie_equipements',
      'reglementation_espace_aerien',
      'avertissements_navigation',
      'obstacles',
      'autres_info',
    ]

    categoryKeys.forEach((catKey) => {
      const notams = aerodrome[catKey] || []
      const filteredNotams = notams.filter(passesAllFilters)

      if (filteredNotams.length > 0) {
        categories.push({
          name: catKey,
          label: formatCategoryName(catKey),
          notams: filteredNotams,
        })
      }
    })

    if (categories.length > 0) {
      const totalNotams = categories.reduce((sum, cat) => sum + cat.notams.length, 0)
      result.push({
        code: aerodrome.code,
        name: aerodrome.name,
        totalNotams,
        categories,
      })
    }
  })

  return result
})

// Traiter les données FIR
const filteredFIR = computed(() => {
  if (!notamData.value?.notamList?.listnotams?.FIR) return []

  const firData = notamData.value.notamList.listnotams.FIR
  const result = []

  // Mapping des catégories FIR
  const firCategoryMap = {
    organisation_espace_procedures: 'organisation_espace_procedures',
    services_circulation_aerienne_VOLMET: 'services_circulation_aerienne_VOLMET',
    installations_com_surveillance: 'installations_com_surveillance',
    GNSS_installations_radionav: 'GNSS_installations_radionav',
    reglementation_espace_aerien: 'reglementation_espace_aerien',
    avertissements_navigation: 'avertissements_navigation',
    obstacles: 'obstacles',
    autres_info: 'autres_info',
  }

  Object.entries(firCategoryMap).forEach(([firCatKey, categoryName]) => {
    const categoryData = firData[firCatKey]
    if (!categoryData || categoryData.length === 0) return

    const groups = []

    categoryData.forEach((item) => {
      const code23 = item.code23
      const label = qLineCode23Map[code23] || code23

      if (!item.sortedNotamsByImpactedAerodromes) return

      const impactedAerodromes = []

      item.sortedNotamsByImpactedAerodromes.forEach((impacted) => {
        // Collecter tous les NOTAMs (de notam et sortedNotamsByPurpose)
        let allNotams = [...(impacted.notam || [])]

        if (impacted.sortedNotamsByPurpose) {
          impacted.sortedNotamsByPurpose.forEach((purposeGroup) => {
            allNotams = [...allNotams, ...(purposeGroup.notam || [])]
          })
        }

        // Filtrer par validité, traffic, FL et masquage
        const filteredNotams = allNotams.filter(passesAllFilters)

        if (filteredNotams.length > 0) {
          impactedAerodromes.push({
            code: impacted.code,
            name: impacted.name,
            notams: filteredNotams,
          })
        }
      })

      if (impactedAerodromes.length > 0) {
        const totalNotams = impactedAerodromes.reduce((sum, imp) => sum + imp.notams.length, 0)
        groups.push({
          code23,
          label,
          totalNotams,
          impactedAerodromes,
        })
      }
    })

    if (groups.length > 0) {
      const totalNotams = groups.reduce((sum, g) => sum + g.totalNotams, 0)
      result.push({
        name: firCatKey,
        label: formatCategoryName(categoryName),
        totalNotams,
        groups,
      })
    }
  })

  return result
})

// Compteur total de NOTAMs filtrés
const filteredNotamsCount = computed(() => {
  const adCount = filteredAD.value.reduce((sum, ad) => sum + ad.totalNotams, 0)
  const firCount = filteredFIR.value.reduce((sum, fir) => sum + fir.totalNotams, 0)
  return adCount + firCount
})

// Gérer le masquage d'un NOTAM
const handleHideNotam = (notam) => {
  // Si le NOTAM est déjà masqué, le démasquer
  if (isHidden(notam.id)) {
    unhideNotam(notam.id)
    $q.notify({
      type: 'positive',
      message: 'NOTAM démasqué',
      icon: 'visibility',
      position: 'top-right',
      timeout: 2000,
    })
  } else {
    // Ne peut masquer que si le NOTAM a été lu
    if (isNew(notam.id)) {
      $q.notify({
        type: 'warning',
        message: 'Marquez d\'abord ce NOTAM comme "Vu"',
        icon: 'warning',
        position: 'top-right',
        timeout: 3000,
      })
      return
    }
    // Masquer le NOTAM
    hideNotam(notam.id, notam.endValidity)
    $q.notify({
      type: 'info',
      message: 'NOTAM masqué',
      icon: 'visibility_off',
      position: 'top-right',
      timeout: 2000,
    })
  }
}

// Gérer le marquage comme vu
const handleMarkSeen = (notam) => {
  markAsSeen(notam.id, notam.endValidity)
  $q.notify({
    type: 'positive',
    message: 'NOTAM marqué comme vu',
    icon: 'check',
    position: 'top-right',
    timeout: 2000,
  })
}

// Démasquer tous les NOTAMs
const confirmUnhideAll = () => {
  $q.dialog({
    title: 'Confirmer la réinitialisation',
    message: 'Voulez-vous vraiment réinitialiser le masquage de tous les NOTAMs ?',
    cancel: {
      label: 'Annuler',
      color: 'grey',
      flat: true,
    },
    ok: {
      label: 'Confirmer',
      color: 'negative',
    },
    persistent: true,
  }).onOk(() => {
    handleUnhideAll()
  })
}

const handleUnhideAll = () => {
  clearAllHidden()
  $q.notify({
    type: 'positive',
    message: 'Tous les NOTAMs sont à nouveau visibles',
    icon: 'visibility',
    position: 'top-right',
    timeout: 2000,
  })
}

/**
 * Collecte tous les IDs de NOTAMs présents dans les données JSON actuelles.
 * Utilisé pour nettoyer les entrées localStorage obsolètes.
 */
const collectAllNotamIds = (listnotams) => {
  const ids = new Set()
  if (!listnotams) return ids

  // Parcourir AD
  const adList = listnotams.AD || []
  adList.forEach((ad) => {
    NOTAM_CATEGORIES.forEach((key) => {
      ;(ad[key] || []).forEach((notam) => ids.add(notam.id))
    })
  })

  // Parcourir FIR
  const firData = listnotams.FIR || {}
  Object.values(firData).forEach((categoryData) => {
    if (Array.isArray(categoryData)) {
      categoryData.forEach((item) => {
        if (item.sortedNotamsByImpactedAerodromes) {
          item.sortedNotamsByImpactedAerodromes.forEach((impacted) => {
            ;(impacted.notam || []).forEach((notam) => ids.add(notam.id))
            if (impacted.sortedNotamsByPurpose) {
              impacted.sortedNotamsByPurpose.forEach((purposeGroup) => {
                ;(purposeGroup.notam || []).forEach((notam) => ids.add(notam.id))
              })
            }
          })
        }
      })
    }
  })

  return ids
}

// Nettoyer les entrées obsolètes quand les données NOTAM changent
watch(
  () => notamData.value?.notamList?.listnotams,
  (listnotams) => {
    if (!listnotams) return
    const validIds = collectAllNotamIds(listnotams)
    if (validIds.size > 0) {
      pruneStaleHidden(validIds)
      pruneStaleSeen(validIds)
    }
  },
  { immediate: true },
)

// Nettoyer les NOTAMs expirés au montage
onMounted(() => {
  cleanupExpired()
  cleanupExpiredSeen()
})
</script>

<style scoped>
.rounded-borders {
  border-radius: 8px;
}
</style>
