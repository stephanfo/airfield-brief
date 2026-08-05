<template>
  <q-page class="q-pa-md">
    <div class="q-mt-lg q-mb-xl text-center">
      <div class="text-h3 text-white text-weight-bold">AZBA</div>
      <UpdateStatusIndicator
        :timestamp="generatedAt"
        :is-refreshing="isRefreshing"
        :stale-threshold="getEndpointConfig('azba').staleThreshold"
        text-class="text-subtitle2 text-white q-mt-xs flex items-center justify-center"
      />
    </div>

    <DataLoadError
      :error="error"
      title="Erreur de chargement des données AZBA"
      :on-retry="forceRefresh"
    />

    <StaleDataBanner
      :timestamp="generatedAt"
      :stale-threshold="getEndpointConfig('azba').staleThreshold"
      data-label="Données AZBA"
    />

    <AzbaStatusCards
      :azba-data="azbaData"
      :generated-at="generatedAt"
      :error="error"
      :stale-threshold="getEndpointConfig('azba').staleThreshold"
    />

    <q-card flat bordered class="q-mb-lg">
      <q-card-section>
        <div class="row items-center q-mb-md">
          <q-icon name="schedule" color="primary" size="32px" class="q-mr-sm" />
          <div class="text-h5 text-weight-bold text-primary">Fenêtre d'observation</div>
        </div>
        <div v-if="azbaData?.windowUTC" class="row q-col-gutter-md">
          <div class="col-12 col-sm-6">
            <div class="text-subtitle2 text-grey">Début</div>
            <div>{{ windowStart }}</div>
          </div>
          <div class="col-12 col-sm-6">
            <div class="text-subtitle2 text-grey">Fin</div>
            <div>{{ windowEnd }}</div>
          </div>
        </div>
      </q-card-section>
    </q-card>

    <div v-if="allDays && allDays.length > 0">
      <div v-for="dayData in allDays" :key="dayData.isoDate" class="q-mb-lg">
        <div class="text-h6 text-white text-weight-bold q-mb-md">{{ dayData.date }}</div>
        <template v-if="dayData.activations && dayData.activations.length > 0">
          <q-table
            flat
            bordered
            :rows="dayData.activations"
            :columns="columns"
            row-key="zone"
            :pagination="{ rowsPerPage: 0 }"
          >
            <template v-slot:body-cell-zone="props">
              <q-td :props="props">
                <span :class="{ 'text-warning text-weight-bold': isZoneActiveNow(props.row.zone) }">
                  {{ props.row.zone }}
                </span>
                <q-icon
                  v-if="isZoneActiveNow(props.row.zone)"
                  name="check_circle"
                  color="warning"
                  size="sm"
                  class="q-ml-sm"
                />
              </q-td>
            </template>
            <template v-slot:body-cell-time="props">
              <q-td :props="props">
                <span>
                  {{ props.row.slots.join(', ') }}
                </span>
              </q-td>
            </template>
          </q-table>
        </template>
        <template v-else>
          <q-banner class="bg-grey-2 text-grey-8" rounded dense>
            <q-icon name="info" size="16px" class="q-mr-xs" /> Néant
          </q-banner>
        </template>
      </div>
    </div>

    <div v-if="!azbaData && !error" class="text-center text-grey q-mt-lg">
      Chargement des données AZBA...
    </div>
  </q-page>
</template>

<script setup>
import { computed } from 'vue'
import AzbaStatusCards from '../components/AzbaStatusCards.vue'
import { useVisibilityRefresh } from '../composables/useVisibilityRefresh'
import { useAzbaStore } from '../stores/azbaStore'
import { storeToRefs } from 'pinia'
import UpdateStatusIndicator from '../components/common/UpdateStatusIndicator.vue'
import DataLoadError from '../components/common/DataLoadError.vue'
import StaleDataBanner from '../components/common/StaleDataBanner.vue'
import { getEndpointConfig } from '../config/app.config'

const azbaStore = useAzbaStore()
const { rawData: azbaData, generatedAt, isRefreshing, error } = storeToRefs(azbaStore)

const forceRefresh = () => azbaStore.forceRefresh()

useVisibilityRefresh(() => azbaStore.loadAzba())

const columns = [
  { name: 'zone', label: 'Zone', field: 'zone', align: 'left' },
  { name: 'time', label: 'Créneau (UTC)', field: 'startUTC', align: 'left' },
]

const windowStart = computed(() => {
  if (!azbaData.value?.windowUTC?.startISO) return ''
  return (
    new Date(azbaData.value.windowUTC.startISO).toLocaleString('fr-FR', {
      dateStyle: 'short',
      timeStyle: 'short',
      timeZone: 'UTC',
    }) + ' UTC'
  )
})

const windowEnd = computed(() => {
  if (!azbaData.value?.windowUTC?.endISO) return ''
  return (
    new Date(azbaData.value.windowUTC.endISO).toLocaleString('fr-FR', {
      dateStyle: 'short',
      timeStyle: 'short',
      timeZone: 'UTC',
    }) + ' UTC'
  )
})

const allDays = computed(() => {
  if (!azbaData.value?.windowUTC) return []
  const start = new Date(azbaData.value.windowUTC.startISO)
  const end = new Date(azbaData.value.windowUTC.endISO)
  const days = []

  // Créer un jour pour chaque date dans la fenêtre (sans mutation de l'objet Date)
  for (let d = new Date(start); d <= end; d = new Date(d.getTime() + 86400000)) {
    const isoDate = d.toISOString().slice(0, 10)
    const date = d.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
    days.push({ isoDate, date, activations: [] })
  }

  // Remplir activations pour chaque jour à partir du nouveau format
  if (azbaData.value?.zones) {
    azbaData.value.zones.forEach((zone) => {
      if (!zone.activations || zone.activations.length === 0) return

      zone.activations.forEach((activation) => {
        const activationStart = new Date(activation.startISO)
        const activationEnd = new Date(activation.endISO)
        const activationDateStr = activationStart.toISOString().slice(0, 10)

        // Trouver le jour correspondant
        const day = days.find((d) => d.isoDate === activationDateStr)
        if (!day) return

        // Trouver ou créer l'entrée de zone pour ce jour
        let zoneActivation = day.activations.find((a) => a.zone === zone.zone)
        if (!zoneActivation) {
          zoneActivation = {
            zone: zone.zone,
            slots: [],
          }
          day.activations.push(zoneActivation)
        }

        // Formater le créneau horaire en UTC
        const startUTC = activationStart.toISOString().slice(11, 16)
        const endUTC = activationEnd.toISOString().slice(11, 16)
        const slotStr = `${startUTC} - ${endUTC} UTC`

        if (!zoneActivation.slots.includes(slotStr)) {
          zoneActivation.slots.push(slotStr)
        }
      })
    })
  }

  return days
})

const isZoneActiveNow = (zoneName) => {
  if (!azbaData.value?.zones) return false

  const now = new Date()
  const zone = azbaData.value.zones.find((z) => z.zone === zoneName)

  if (!zone || !zone.activations) return false

  // Vérifier si une des activations est en cours
  return zone.activations.some((activation) => {
    const start = new Date(activation.startISO)
    const end = new Date(activation.endISO)
    return now >= start && now <= end
  })
}
</script>

<style scoped lang="scss">
// Styles for table layout
</style>
