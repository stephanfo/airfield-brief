<template>
  <SectionCard v-if="notamData" title="Résumé des NOTAMs" icon="summarize" :to="to">
    <!-- Critères de filtrage NOTAMs -->
    <div class="q-my-md">
      <q-card flat bordered class="q-pa-sm bg-blue-1">
        <div class="text-body2 text-blue-9">
          Seuls les NOTAMs VFR autour de {{ CLUB_CONFIG.airfield.icao }} (25 NM, FL 0-100, 12h à
          partir de maintenant) sont affichés.
        </div>
      </q-card>
    </div>
    <div class="row q-col-gutter-md">
      <!-- Total -->
      <div class="col-6 col-sm-3">
        <q-card flat bordered class="text-center q-pa-md bg-blue-1">
          <div class="text-h6 text-blue-9">{{ totalNotamsCount }}</div>
          <div class="text-caption text-grey-7">NOTAM(s) total</div>
        </q-card>
      </div>
      <!-- Nouveaux -->
      <div class="col-6 col-sm-3">
        <q-card flat bordered class="text-center q-pa-md bg-orange-1">
          <div class="text-h6 text-orange-9">{{ totalNewCount }}</div>
          <div class="text-caption text-grey-7">Nouveau(x)</div>
        </q-card>
      </div>
      <!-- En cours -->
      <div class="col-6 col-sm-3">
        <q-card flat bordered class="text-center q-pa-md bg-green-1">
          <div class="text-h6 text-green-9">{{ totalCurrentCount }}</div>
          <div class="text-caption text-grey-7">En cours</div>
        </q-card>
      </div>
      <!-- Futurs -->
      <div class="col-6 col-sm-3">
        <q-card flat bordered class="text-center q-pa-md bg-amber-1">
          <div class="text-h6 text-amber-9">{{ totalFutureCount }}</div>
          <div class="text-caption text-grey-7">Futur(s)</div>
        </q-card>
      </div>
    </div>
  </SectionCard>
</template>

<script setup>
import { computed } from 'vue'
import SectionCard from './common/SectionCard.vue'
import { useHiddenNotams } from '../composables/useHiddenNotams'
import { useSeenNotams } from '../composables/useSeenNotams'
import { getValidityState } from '../utils/notamHelpers'
import { NOTAM_CATEGORIES } from '../config/constants'
import { CLUB_CONFIG } from '../config/club.config'

const props = defineProps({
  notamData: {
    type: Object,
    default: null,
  },
  /** Route de détail — rend le titre cliquable (Accueil uniquement) */
  to: {
    type: String,
    default: null,
  },
})

const { isHidden } = useHiddenNotams()
const { isNew } = useSeenNotams()

/**
 * Parcourt tous les NOTAMs (AD + FIR) et appelle le callback pour chacun
 */
const walkAllNotams = (listnotams, callback) => {
  // Parcourir AD
  const adList = listnotams.AD || []
  adList.forEach((ad) => {
    NOTAM_CATEGORIES.forEach((key) => {
      ;(ad[key] || []).forEach(callback)
    })
  })

  // Parcourir FIR
  const firData = listnotams.FIR || {}
  Object.values(firData).forEach((categoryData) => {
    if (Array.isArray(categoryData)) {
      categoryData.forEach((item) => {
        if (item.sortedNotamsByImpactedAerodromes) {
          item.sortedNotamsByImpactedAerodromes.forEach((impacted) => {
            ;(impacted.notam || []).forEach(callback)
            if (impacted.sortedNotamsByPurpose) {
              impacted.sortedNotamsByPurpose.forEach((purposeGroup) => {
                ;(purposeGroup.notam || []).forEach(callback)
              })
            }
          })
        }
      })
    }
  })
}

// Une seule passe pour calculer les 4 compteurs
const stats = computed(() => {
  const result = { total: 0, new: 0, current: 0, future: 0 }
  if (!props.notamData?.notamList?.listnotams) return result

  walkAllNotams(props.notamData.notamList.listnotams, (notam) => {
    if (isHidden(notam.id)) return
    result.total++
    if (isNew(notam.id)) result.new++
    const state = getValidityState(notam)
    if (state === 'current') result.current++
    if (state === 'future') result.future++
  })

  return result
})

const totalNotamsCount = computed(() => stats.value.total)
const totalNewCount = computed(() => stats.value.new)
const totalCurrentCount = computed(() => stats.value.current)
const totalFutureCount = computed(() => stats.value.future)
</script>
