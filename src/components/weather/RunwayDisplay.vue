<template>
  <SectionCard title="Piste" icon="flight_takeoff">
    <template #header-actions>
      <div
        v-if="weatherData?.current?.wind_direction && weatherData?.current?.wind_speed"
        class="wind-info"
      >
        <q-icon name="air" size="sm" class="q-mr-xs" />
        <span
          >{{ weatherData.current.wind_direction }}° /
          {{ weatherData.current.wind_speed }} kts</span
        >
        <span v-if="weatherData?.current?.wind_gust" class="q-ml-xs"
          >G{{ weatherData.current.wind_gust }}</span
        >
      </div>
    </template>

    <div>
      <div class="runway">
        <div class="runway-line"></div>
        <div :class="['runway-number', 'left', { active: runwayDirection === '07' }]">07</div>
        <div :class="['runway-number', 'right', { active: runwayDirection === '25' }]">25</div>
        <div class="wind-display" ref="windDisplay">
          <!-- Headwind/Tailwind Arrow -->
          <div
            v-if="Math.abs(headwind) > 0"
            :class="['arrow-axial', headwind > 0 ? 'from-left' : 'from-right']"
          >
            <svg viewBox="0 0 60 30">
              <path
                :d="
                  headwind > 0
                    ? 'M 5 15 L 45 15 M 30 5 L 45 15 L 30 25'
                    : 'M 55 15 L 15 15 M 30 5 L 15 15 L 30 25'
                "
                stroke="#2ecc71"
                stroke-width="4"
                fill="none"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
            <span>{{ Math.abs(headwind) }} kts</span>
          </div>

          <!-- Crosswind Arrow -->
          <div
            v-if="crosswind > 0"
            :class="[
              'arrow-crosswind',
              crosswindSide > 0 ? 'from-top' : 'from-bottom',
              crosswindClass,
            ]"
          >
            <svg viewBox="0 0 30 60">
              <path
                :d="
                  crosswindSide > 0
                    ? 'M 15 5 L 15 45 M 5 30 L 15 45 L 25 30'
                    : 'M 15 55 L 15 15 M 5 30 L 15 15 L 25 30'
                "
                :stroke="crosswindColor"
                stroke-width="4"
                fill="none"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
            <span
              >{{ crosswind }} kts
              <span v-if="crosswindGust" class="crosswind-gust">(G{{ crosswindGust }})</span>
            </span>
          </div>
        </div>
        <div class="plane" :data-direction="runwayDirection">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="white">
            <path
              d="M21,16v-2l-8-5V3.5C13,2.67,12.33,2,11.5,2S10,2.67,10,3.5V9l-8,5v2l8-2.5V19l-2,1.5V22l3.5-1l3.5,1v-1.5L13,19v-5.5L21,16z"
            />
          </svg>
        </div>
      </div>
    </div>
  </SectionCard>
</template>

<script setup>
import { computed } from 'vue'
import SectionCard from '../common/SectionCard.vue'
import { useVfrThresholds } from '../../composables/useVfrThresholds'
import { getVfrLevel } from '../../utils/vfrCriticality'
import {
  calculateWindComponents,
  worstCrosswind as calcWorstCrosswind,
} from '../../utils/windHelpers'

const props = defineProps({
  weatherData: {
    type: Object,
    required: false,
    default: null,
  },
})

const { thresholds } = useVfrThresholds()

const windComponents = computed(() =>
  calculateWindComponents(
    props.weatherData?.current?.wind_direction,
    props.weatherData?.current?.wind_speed,
  ),
)

const headwind = computed(() => windComponents.value.headwind)
const crosswind = computed(() => windComponents.value.crosswind)
const crosswindSide = computed(() => windComponents.value.crosswindSide)

const crosswindGust = computed(() => {
  const gust = props.weatherData?.current?.wind_gust
  if (!gust) return null
  const { crosswind: cwGust } = calculateWindComponents(
    props.weatherData?.current?.wind_direction,
    gust,
  )
  return cwGust > crosswind.value ? cwGust : null
})

const worstCw = computed(() =>
  calcWorstCrosswind(
    props.weatherData?.current?.wind_direction,
    props.weatherData?.current?.wind_speed,
    props.weatherData?.current?.wind_gust,
  ),
)

const runwayDirection = computed(() => (headwind.value > 0 ? '25' : '07'))

const crosswindColor = computed(() => {
  const level = getVfrLevel(worstCw.value, 'crosswind', thresholds)
  return { good: '#2ecc71', marginal: '#f39c12', poor: '#e74c3c' }[level]
})

const crosswindClass = computed(() => {
  const level = getVfrLevel(worstCw.value, 'crosswind', thresholds)
  return { good: '', marginal: 'warning', poor: 'critical' }[level]
})
</script>

<style scoped>
.runway {
  position: relative;
  height: 50px;
  background: #2c2c2c;
  border-radius: 8px;
  box-shadow: inset 0 0 20px rgba(0, 0, 0, 0.5);
  overflow: hidden;
}

.runway-line {
  position: absolute;
  top: 50%;
  left: 40px;
  width: calc(100% - 80px);
  height: 1px;
  background: repeating-linear-gradient(
    90deg,
    white 0px,
    white 10px,
    transparent 10px,
    transparent 20px
  );
}

.runway-number {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  font-size: 1.3em;
  font-weight: bold;
  color: #666;
  transition: all 0.3s ease;
}

.runway-number.left {
  left: 8px;
  transform: translateY(-50%) rotate(90deg);
}

.runway-number.right {
  right: 8px;
  transform: translateY(-50%) rotate(-90deg);
}

.runway-number.active {
  color: white;
  font-size: 1.5em;
}

.plane {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  font-size: 1.8em;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
  animation: fly-right 4s ease-in-out infinite;
}

/* Animation vers la droite (piste 07) */
@keyframes fly-right {
  0% {
    left: 40px;
    transform: translateY(-50%) rotate(90deg);
  }
  100% {
    left: calc(100% - 80px);
    transform: translateY(-50%) rotate(90deg);
  }
}

/* Animation vers la gauche (piste 25) */
@keyframes fly-left {
  0% {
    right: 40px;
    transform: translateY(-50%) rotate(-90deg);
  }
  100% {
    right: calc(100% - 80px);
    transform: translateY(-50%) rotate(-90deg);
  }
}

/* Classe pour changer la direction */
.plane[data-direction='25'] {
  animation: fly-left 4s ease-in-out infinite;
}

/* Respect de l'accessibilité : désactiver les animations si l'utilisateur le demande */
@media (prefers-reduced-motion: reduce) {
  .plane {
    animation: none !important;
    left: 50%;
    transform: translateY(-50%) rotate(90deg);
  }
  .plane[data-direction='25'] {
    animation: none !important;
    right: 50%;
    left: auto;
    transform: translateY(-50%) rotate(-90deg);
  }
}

.wind-display {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.arrow-axial {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  color: #2ecc71;
  font-weight: bold;
  font-size: 1em;
}

.arrow-axial.from-left {
  left: 55px;
}

.arrow-axial.from-right {
  right: 55px;
}

.arrow-axial svg {
  width: 40px;
  height: 20px;
}

.arrow-crosswind {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.arrow-crosswind svg {
  width: 20px;
  height: 40px;
}

.arrow-crosswind span {
  color: #2ecc71;
  font-weight: bold;
  font-size: 1em;
  padding-top: 0;
  line-height: 1;
}

.crosswind-gust {
  font-size: 0.85em;
  opacity: 0.8;
}

.crosswind-label {
  font-size: 0.75em;
  white-space: nowrap;
}

.crosswind-label.warning {
  color: #f39c12;
}

.crosswind-label.critical {
  color: #e74c3c;
}

.arrow-crosswind.warning span {
  color: #f39c12;
}

.arrow-crosswind.critical span {
  color: #e74c3c;
  animation: pulse 1s ease-in-out infinite;
}

@media (prefers-reduced-motion: reduce) {
  .arrow-crosswind.critical span {
    animation: none !important;
    opacity: 1;
  }
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}

.wind-info {
  display: flex;
  align-items: center;
  font-size: 0.8em;
  font-weight: normal;
}
</style>
