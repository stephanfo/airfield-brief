<template>
  <SectionCard title="Prévisions des prochains jours" icon="calendar_month">
    <div v-if="!tiles.length" class="text-grey-7 flex items-center">
      <q-icon name="info" class="q-mr-sm" />
      Prévisions indisponibles.
    </div>

    <template v-else>
      <div class="thermal-strip">
        <div
          v-for="tile in tiles"
          :key="tile.date"
          :class="[
            'thermal-tile',
            tile.meta.bgClass,
            tile.meta.textColor,
            { 'thermal-tile--today': tile.today },
          ]"
        >
          <div class="thermal-tile__dow">{{ tile.dow }}</div>
          <div class="thermal-tile__day">{{ tile.day }}</div>
          <div class="thermal-tile__temp">{{ tile.temp }}°</div>
        </div>
      </div>
      <div class="text-caption text-grey-7 q-mt-sm">
        Niveau au pic de chaleur de chaque journée (profil pilote appliqué).
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
  /** Jours de prévision issus de thermal_forecast.json (peakTemp/peakHumidity) */
  forecastDays: { type: Array, default: null },
})

const { settings } = useThermalStressSettings()
const shiftCount = computed(() => getThermalStressShift(settings))

const dowFmt = new Intl.DateTimeFormat('fr-FR', { weekday: 'short' })
const todayStr = new Date().toISOString().slice(0, 10)

const tiles = computed(() =>
  (props.forecastDays || []).map((day) => {
    const today = day.date === todayStr
    const level = applyPersonalShift(
      getThermalStressLevel(day.peakTemp, day.peakHumidity),
      shiftCount.value,
    )
    return {
      date: day.date,
      today,
      meta: thermalStressMeta(level),
      // "lun." → "LUN" ; aujourd'hui affiché "AUJ"
      dow: today
        ? 'AUJ'
        : dowFmt
            .format(new Date(`${day.date}T12:00:00`))
            .replace('.', '')
            .toUpperCase(),
      day: day.date.slice(8, 10),
      temp: Math.round(day.peakTemp),
    }
  }),
)
</script>

<style scoped>
.thermal-strip {
  display: flex;
  gap: 6px;
  width: 100%;
}
.thermal-tile {
  flex: 1 1 0;
  min-width: 0;
  border-radius: 12px;
  padding: 8px 2px 10px;
  text-align: center;
  border: 2px solid transparent;
}
.thermal-tile__dow {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.02em;
}
.thermal-tile__day {
  font-size: 22px;
  font-weight: 800;
  line-height: 1.15;
}
.thermal-tile__temp {
  font-size: 13px;
  font-weight: 600;
}
.thermal-tile--today {
  border-color: currentColor;
}

/* Très petits écrans (iPhone SE ~320px) : compacter pour rester sur 1 ligne. */
@media (max-width: 360px) {
  .thermal-strip {
    gap: 4px;
  }
  .thermal-tile {
    padding: 6px 1px 8px;
  }
  .thermal-tile__dow {
    font-size: 9px;
  }
  .thermal-tile__day {
    font-size: 18px;
  }
  .thermal-tile__temp {
    font-size: 11px;
  }
}
</style>
