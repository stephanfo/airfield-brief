<template>
  <SectionCard
    v-if="azbaData || isDataUnreliable"
    title="Zones AZBA à proximité"
    icon="flight"
    :to="to"
    class="azba-status-cards"
  >
    <q-banner
      v-if="isDataUnreliable"
      rounded
      dense
      class="bg-red-1 text-red-9 q-mb-md"
      role="alert"
    >
      <template v-slot:avatar>
        <q-icon name="warning" color="negative" />
      </template>
      <div class="text-weight-bold">Données AZBA indisponibles ou périmées</div>
      <div class="text-body2">
        Ne vous fiez pas à l'absence d'activité affichée — vérifiez le briefing officiel SIA avant
        tout vol.
      </div>
    </q-banner>

    <div class="cards-grid">
      <q-card
        flat
        bordered
        v-for="zoneName in priorityZones"
        :key="zoneName"
        :class="['zone-card', getBackgroundClass(zoneName)]"
      >
        <q-card-section class="q-pa-md">
          <div :class="['text-h6 text-center', getTextClass(zoneName)]">
            {{ getStatusLabel(zoneName) }}
          </div>
          <div class="text-caption text-center text-grey-7">
            {{ zoneName }}
          </div>
        </q-card-section>
      </q-card>
    </div>
  </SectionCard>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import SectionCard from './common/SectionCard.vue'
import { AZBA_CONFIG } from '../config/app.config'

const props = defineProps({
  azbaData: {
    type: Object,
    required: false,
    default: null,
  },
  priorityZones: {
    type: Array,
    default: () => AZBA_CONFIG.priorityZones,
  },
  /** Route de détail — rend le titre cliquable (Accueil uniquement) */
  to: {
    type: String,
    default: null,
  },
  /** Timestamp de génération des données AZBA (ISO). Sert au contrôle de fraîcheur. */
  generatedAt: {
    type: String,
    default: null,
  },
  /** Seuil de péremption (ms) — au-delà, les données sont jugées non fiables. */
  staleThreshold: {
    type: Number,
    default: 90 * 60 * 1000,
  },
  /** Erreur de chargement éventuelle (objet d'erreur du store) — null si OK. */
  error: {
    type: Object,
    default: null,
  },
})

const priorityZones = props.priorityZones

// Horloge réactive pour mettre à jour les décomptes
const now = ref(new Date())
let timer

onMounted(() => {
  timer = setInterval(() => {
    now.value = new Date()
  }, 60000) // mise à jour chaque minute
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})

// Formate une durée (ms) en j/h/min
const formatDuration = (ms) => {
  const totalMinutes = Math.max(0, Math.round(ms / 60000))
  const days = Math.floor(totalMinutes / 1440)
  const hours = Math.floor((totalMinutes % 1440) / 60)
  const minutes = totalMinutes % 60

  const parts = []
  if (days) parts.push(`${days}j`)
  if (hours) parts.push(`${hours}h`)
  if (minutes || parts.length === 0) parts.push(`${minutes}min`)
  return parts.join(' ')
}

// Activation en cours
const getCurrentActivation = (activations, current = now.value) => {
  if (!activations?.length) return null

  return activations.find((activation) => {
    const start = new Date(activation.startISO)
    const end = new Date(activation.endISO)
    return current >= start && current <= end
  })
}

// Prochaine activation future
const getNextFutureActivation = (activations, current = now.value) => {
  if (!activations?.length) return null

  return activations
    .filter((activation) => new Date(activation.startISO) > current)
    .sort((a, b) => new Date(a.startISO) - new Date(b.startISO))[0]
}

/**
 * Données AZBA non fiables ⇒ on ne doit JAMAIS afficher un faux « inactif » (vert).
 * Fail-safe : un faux « rien d'actif » pourrait masquer une zone militaire active.
 * Trois signaux (l'un suffit) :
 *   - erreur de chargement (fetch en échec),
 *   - absence de données ou de fenêtre de validité,
 *   - fenêtre de validité SIA dépassée (now > windowUTC.endISO) — signal métier fort,
 *   - generatedAt absent ou trop ancien (> staleThreshold).
 */
const isDataUnreliable = computed(() => {
  if (props.error) return true
  if (!props.azbaData?.windowUTC?.endISO) return true

  const current = now.value

  // Fenêtre de validité passée : les activations ne couvrent plus « maintenant ».
  const windowEnd = new Date(props.azbaData.windowUTC.endISO)
  if (Number.isNaN(windowEnd.getTime()) || current > windowEnd) return true

  // Fraîcheur du fichier (cas N8N/cron en panne : JSON figé mais encore servi).
  if (!props.generatedAt) return true
  const generated = new Date(props.generatedAt).getTime()
  if (Number.isNaN(generated)) return true
  if (current.getTime() - generated > props.staleThreshold) return true

  return false
})

// Cache des statuts pour éviter les recalculs
const zoneStatuses = computed(() => {
  // Données douteuses ⇒ toutes les zones en « inconnu » (jamais de vert trompeur).
  if (isDataUnreliable.value) {
    return Object.fromEntries(priorityZones.map((zoneName) => [zoneName, 'unknown']))
  }

  if (!props.azbaData?.zones) return {}

  const current = now.value
  const statuses = {}

  props.azbaData.zones.forEach((zone) => {
    const zoneName = zone.zone

    // Zone sans activations
    if (!zone.activations?.length) {
      statuses[zoneName] = 'inactive'
      return
    }

    // Vérifier activation en cours
    const currentActivation = getCurrentActivation(zone.activations, current)
    if (currentActivation) {
      statuses[zoneName] = 'active'
      return
    }

    // Vérifier prochaine activation
    const nextActivation = getNextFutureActivation(zone.activations, current)
    if (!nextActivation) {
      statuses[zoneName] = 'inactive'
      return
    }

    statuses[zoneName] = 'future'
  })

  return statuses
})

const getZoneData = (zoneName) => {
  if (!props.azbaData?.zones) return null
  return props.azbaData.zones.find((z) => z.zone === zoneName)
}

const getZoneStatus = (zoneName) => {
  return zoneStatuses.value[zoneName] || 'inactive'
}

const getStatusLabel = (zoneName) => {
  const status = getZoneStatus(zoneName)

  if (status === 'unknown') return 'Statut inconnu'

  const zone = getZoneData(zoneName)
  if (!zone?.activations?.length) return 'Inactive'

  const current = now.value

  if (status === 'active') {
    const currentActivation = getCurrentActivation(zone.activations, current)
    if (currentActivation) {
      const remaining = new Date(currentActivation.endISO) - current
      return `Active encore ${formatDuration(remaining)}`
    }
    return 'Active'
  }

  if (status === 'future') {
    const nextActivation = getNextFutureActivation(zone.activations, current)
    if (nextActivation) {
      const untilStart = new Date(nextActivation.startISO) - current
      return `Active dans ${formatDuration(untilStart)}`
    }
    return 'Futur'
  }

  return 'Inactive'
}

const getBackgroundClass = (zoneName) => {
  const status = getZoneStatus(zoneName)
  const classes = {
    active: 'bg-red-1',
    future: 'bg-yellow-1',
    inactive: 'bg-green-1',
    unknown: 'bg-grey-3',
  }
  // Repli volontaire sur « inconnu » (gris) et non « vert » : ne jamais
  // suggérer une zone libre par défaut.
  return classes[status] || 'bg-grey-3'
}

const getTextClass = (zoneName) => {
  const status = getZoneStatus(zoneName)
  const classes = {
    active: 'text-red-9',
    future: 'text-yellow-9',
    inactive: 'text-green-9',
    unknown: 'text-grey-8',
  }
  return classes[status] || 'text-grey-8'
}
</script>

<style scoped lang="scss">
.azba-status-cards {
  width: 100%;
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

@media (max-width: 960px) {
  .cards-grid {
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
  }
}

@media (max-width: 600px) {
  .cards-grid {
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .zone-card {
    .q-pa-md {
      padding: 12px !important;
    }
  }
}
</style>
