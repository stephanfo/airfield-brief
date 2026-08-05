<template>
  <SectionCard title="Prévisions des prochains jours" icon="calendar_month">
    <!-- Données indisponibles -->
    <div v-if="!forecastDays || forecastDays.length === 0" class="text-grey-7 flex items-center">
      <q-icon name="info" class="q-mr-sm" />
      Prévisions indisponibles.
    </div>

    <template v-else>
      <div class="text-caption text-grey-7 q-mb-md">
        Niveau de stress au pic de chaleur de chaque journée (température maximale), profil pilote
        appliqué.
      </div>

      <q-list separator>
        <q-expansion-item
          v-for="day in days"
          :key="day.date"
          dense
          :header-class="day.meta.bgClass"
        >
          <template #header>
            <q-item-section avatar style="min-width: 40px">
              <q-icon :name="day.meta.icon" :class="day.meta.textColor" size="sm" />
            </q-item-section>
            <q-item-section>
              <div :class="['text-weight-bold', day.meta.textColor]">{{ day.dayLabel }}</div>
              <div class="text-caption text-grey-8">
                {{ day.peakTempLabel }} · {{ day.peakHumidityLabel }} d'humidité · pic
                {{ day.peakHourLabel }}
              </div>
            </q-item-section>
            <q-item-section side>
              <q-chip :color="day.meta.color" text-color="white" class="text-weight-bold">
                {{ day.meta.label }}
              </q-chip>
            </q-item-section>
          </template>

          <!-- Détail horaire diurne -->
          <div class="q-pa-md">
            <div class="thermal-hourly">
              <div v-for="h in day.hourly" :key="h.time" class="thermal-hourly-cell">
                <div class="text-caption text-grey-7">{{ h.hourLabel }}</div>
                <div :class="['thermal-hourly-dot', h.meta.bgClass]">
                  <q-icon :name="h.meta.icon" size="14px" :class="h.meta.textColor" />
                </div>
                <div class="text-caption text-weight-medium">{{ h.tempLabel }}</div>
                <div class="text-caption text-grey-7">{{ h.humidityLabel }}</div>
              </div>
            </div>
          </div>
        </q-expansion-item>
      </q-list>

      <div v-if="shiftCount > 0" class="text-caption text-grey-8 q-mt-md flex items-center">
        <q-icon name="person" class="q-mr-xs" />
        Niveaux ajustés selon le profil (âge / pathologie).
      </div>
      <div class="text-caption text-grey-7 q-mt-xs">
        Source : prévisions Open-Meteo, grille Commission Prévention Sécurité FFA (2025_07_01).
      </div>
    </template>
  </SectionCard>
</template>

<script setup>
import { computed } from 'vue'
import SectionCard from '../common/SectionCard.vue'
import { useThermalStressSettings } from '../../composables/useThermalStressSettings'
import {
  getThermalStressLevel,
  applyPersonalShift,
  getThermalStressShift,
  thermalStressMeta,
} from '../../utils/thermalStressHelpers'

const props = defineProps({
  /** Jours de prévision issus de thermal_forecast.json (peakTemp/peakHumidity/hourly) */
  forecastDays: { type: Array, default: null },
})

const { settings } = useThermalStressSettings()

const shiftCount = computed(() => getThermalStressShift(settings))

/** Niveau FFA décalé du profil, partagé par le pic journalier et les heures. */
function levelFor(temp, humidity) {
  return applyPersonalShift(getThermalStressLevel(temp, humidity), shiftCount.value)
}

const dayFmt = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
const hourFmt = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' })

const days = computed(() =>
  (props.forecastDays || []).map((day) => {
    const meta = thermalStressMeta(levelFor(day.peakTemp, day.peakHumidity))
    return {
      date: day.date,
      meta,
      dayLabel: capitalize(dayFmt.format(new Date(`${day.date}T12:00:00`))),
      peakTempLabel: `${day.peakTemp.toFixed(1)} °C`,
      peakHumidityLabel: `${Math.round(day.peakHumidity)} %`,
      peakHourLabel: hourFmt.format(new Date(day.peakHour)),
      hourly: (day.hourly || []).map((h) => ({
        time: h.time,
        meta: thermalStressMeta(levelFor(h.temp, h.humidity)),
        hourLabel: hourFmt.format(new Date(h.time)),
        tempLabel: `${h.temp.toFixed(0)}°`,
        humidityLabel: `${Math.round(h.humidity)}%`,
      })),
    }
  }),
)

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
</script>

<style scoped>
.thermal-hourly {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding-bottom: 4px;
}
.thermal-hourly-cell {
  flex: 0 0 auto;
  text-align: center;
  min-width: 46px;
}
.thermal-hourly-dot {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 2px auto;
}
</style>
