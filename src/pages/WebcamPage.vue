<template>
  <q-page class="q-pa-md">
    <div class="q-mt-lg q-mb-lg text-center">
      <div class="text-h3 text-white text-weight-bold">Webcam {{ CLUB_CONFIG.airfield.name }}</div>
      <!-- Indicateur discret « dernière image il y a X » — comme les autres pages datées. -->
      <UpdateStatusIndicator
        :timestamp="lastImageAt"
        :is-refreshing="isRefreshing"
        :stale-threshold="WEBCAM_CONFIG.staleThreshold"
        label="Dernière image :"
        text-class="text-subtitle2 text-white q-mt-xs flex items-center justify-center"
      />
    </div>

    <!-- Bandeau « caméra hors ligne » : dernière image plus vieille que le seuil. -->
    <StaleDataBanner
      :timestamp="lastImageAt"
      :stale-threshold="WEBCAM_CONFIG.staleThreshold"
      data-label="Image de la webcam"
    />

    <!-- Image en direct (même source que la page d'accueil). -->
    <WebcamCard />

    <!-- Erreur de chargement de la liste timelapse, uniquement si aucune image
         à afficher (sinon on garde le timelapse en cache, échec signalé par toast). -->
    <DataLoadError
      :error="timelapseError"
      title="Erreur de chargement du timelapse"
      :on-retry="() => webcamStore.forceRefresh()"
    />

    <SectionCard title="Timelapse (1 h)" icon="movie">
      <template #header-actions>
        <q-spinner v-if="loading && !images.length" color="primary" size="1.5em" />
      </template>

      <div v-if="!loading && !images.length" class="text-grey-7 q-pa-md text-center">
        Aucune image disponible pour le moment.
      </div>

      <template v-else>
        <!-- Image timelapse — même rendu que WebcamCard (radius sur l'img). -->
        <img
          v-if="currentImage"
          :src="currentImage.url"
          alt="Image de timelapse"
          class="q-mb-md"
          style="width: 100%; height: auto; border-radius: 12px; display: block"
        />

        <!-- Horodatage + position -->
        <div class="flex items-center justify-between q-mb-sm text-grey-8">
          <div class="flex items-center">
            <q-icon name="schedule" class="q-mr-xs" />
            {{ currentImage?.time || '--:--:--' }}
          </div>
          <div class="text-caption">{{ idx + 1 }} / {{ images.length }}</div>
        </div>

        <!-- Scrubber -->
        <q-slider
          v-model="idx"
          :min="0"
          :max="Math.max(0, images.length - 1)"
          :step="1"
          color="primary"
          class="q-mb-md"
          @update:model-value="onScrub"
        />

        <!-- Contrôles lecture -->
        <div class="row items-center q-col-gutter-sm">
          <div class="col-auto">
            <q-btn
              :icon="playing ? 'pause' : 'play_arrow'"
              :label="playing ? 'Pause' : 'Lecture'"
              color="primary"
              unelevated
              @click="togglePlay"
            />
          </div>

          <div class="col-auto">
            <q-btn-toggle
              v-model="speed"
              :options="speedOptions"
              color="grey-4"
              text-color="grey-9"
              toggle-color="primary"
              toggle-text-color="white"
              unelevated
              dense
              @update:model-value="onSpeedChange"
            />
          </div>

          <q-space />

          <div class="col-auto">
            <q-btn
              :color="loop ? 'primary' : 'grey-4'"
              :text-color="loop ? 'white' : 'grey-9'"
              icon="loop"
              round
              unelevated
              dense
              title="À la fin : rejouer en boucle au lieu de revenir au début"
              @click="toggleLoop"
            />
          </div>
        </div>
      </template>
    </SectionCard>
  </q-page>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import SectionCard from '../components/common/SectionCard.vue'
import WebcamCard from '../components/common/WebcamCard.vue'
import DataLoadError from '../components/common/DataLoadError.vue'
import UpdateStatusIndicator from '../components/common/UpdateStatusIndicator.vue'
import StaleDataBanner from '../components/common/StaleDataBanner.vue'
import { useWebcamStore } from '../stores/webcamStore'
import { useVisibilityRefresh } from '../composables/useVisibilityRefresh'
import { logger } from '../utils/logger'
import { WEBCAM_CONFIG } from '../config/app.config'
import { CLUB_CONFIG } from '../config/club.config'
import { STORAGE_KEYS } from '../config/storageKeys'

const webcamStore = useWebcamStore()
const { images, lastImageAt, loading, error, isRefreshing } = storeToRefs(webcamStore)

// N'affiche l'erreur que si rien n'est affichable : avec une liste en cache,
// la page reste utilisable et l'échec est déjà signalé par un toast global.
const timelapseError = computed(() => (images.value.length ? null : error.value))

// ===== Préférences UI persistées (vitesse, boucle) — localStorage simple. =====
const SPEED_KEY = STORAGE_KEYS.WEBCAM_SPEED
const LOOP_KEY = STORAGE_KEYS.WEBCAM_LOOP

const readPref = (key) => {
  try {
    return localStorage.getItem(key)
  } catch (e) {
    logger.warn(`Lecture préférence webcam (${key}) impossible:`, e)
    return null
  }
}

const writePref = (key, value) => {
  try {
    localStorage.setItem(key, value)
  } catch (e) {
    logger.warn(`Sauvegarde préférence webcam (${key}) impossible:`, e)
  }
}

const storedSpeed = Number(readPref(SPEED_KEY))
const initialSpeed = WEBCAM_CONFIG.speeds.includes(storedSpeed)
  ? storedSpeed
  : WEBCAM_CONFIG.defaultSpeed

const idx = ref(0)
const playing = ref(false)
const speed = ref(initialSpeed)
const loop = ref(readPref(LOOP_KEY) === '1')

const speedOptions = WEBCAM_CONFIG.speeds.map((x) => ({ label: `×${x}`, value: x }))

const currentImage = computed(() => images.value[idx.value] || null)

// ===== Lecture =====
// Avance pilotée par le chargement : on ne passe à la frame suivante qu'une
// fois son image préchargée (onload) ET le délai mini de la vitesse écoulé.
// Sur réseau lent, la vitesse réelle ralentit au lieu de sauter des frames
// ou d'empiler des requêtes annulées. `playToken` invalide une boucle en vol
// (stop, changement de vitesse, démontage) pour éviter les avances fantômes.
let playTimer = null
let playToken = 0

const stopTimer = () => {
  if (playTimer) {
    clearTimeout(playTimer)
    playTimer = null
  }
}

const framePeriod = () => Math.max(30, 1000 / (WEBCAM_CONFIG.baseFps * speed.value))

/**
 * Précharge l'image d'index `i`. Résout quand elle est décodée (ou en erreur :
 * on n'attend pas indéfiniment une image manquante).
 */
const preload = (i) =>
  new Promise((resolve) => {
    const img = images.value[i]
    if (!img) {
      resolve()
      return
    }
    const pre = new Image()
    pre.onload = resolve
    pre.onerror = resolve
    pre.src = img.url
  })

/**
 * Boucle de lecture : affiche la frame courante au moins `framePeriod()`, et
 * précharge la suivante en parallèle. Avance dès que les deux sont prêts.
 */
const playLoop = async () => {
  const token = playToken
  while (playing.value && token === playToken) {
    const isLast = idx.value >= images.value.length - 1
    if (isLast) {
      if (!loop.value) {
        stop()
        return
      }
      // Boucle : on précharge la frame 0 avant de revenir, pour un retour net.
      await Promise.all([preload(0), wait(framePeriod())])
      if (!playing.value || token !== playToken) return
      idx.value = 0
      continue
    }

    const next = idx.value + 1
    // Attend en parallèle : durée mini de la frame + préchargement de la suivante.
    await Promise.all([wait(framePeriod()), preload(next)])
    if (!playing.value || token !== playToken) return
    idx.value = next
  }
}

const wait = (ms) =>
  new Promise((resolve) => {
    stopTimer()
    playTimer = setTimeout(resolve, ms)
  })

const play = () => {
  if (!images.value.length) return
  // Si on est à la fin, on repart du début.
  if (idx.value >= images.value.length - 1) idx.value = 0
  playing.value = true
  playToken += 1
  playLoop()
}

const stop = () => {
  playing.value = false
  playToken += 1
  stopTimer()
}

const togglePlay = () => (playing.value ? stop() : play())

const onSpeedChange = (x) => {
  writePref(SPEED_KEY, String(x))
  // La nouvelle période est lue à la prochaine itération de playLoop ;
  // on relance la boucle pour qu'un long wait en cours n'impose pas l'ancienne.
  if (playing.value) {
    playToken += 1
    playLoop()
  }
}

const toggleLoop = () => {
  loop.value = !loop.value
  writePref(LOOP_KEY, loop.value ? '1' : '0')
}

// Scrub manuel : on met en pause pour laisser l'utilisateur naviguer.
const onScrub = () => {
  if (playing.value) stop()
}

// La liste se recharge périodiquement (rattrapage) : si l'index dépasse la
// nouvelle longueur (liste tronquée), on le réaligne sur la dernière image.
watch(
  () => images.value.length,
  (len) => {
    if (idx.value > len - 1) idx.value = Math.max(0, len - 1)
  },
)

useVisibilityRefresh(() => webcamStore.loadImages())

// Recharge la liste toutes les 30 s pour rattraper les nouvelles images.
let listTimer = null

onMounted(async () => {
  await webcamStore.loadImages()
  // Démarre sur la dernière image disponible (vue « live » du timelapse).
  idx.value = Math.max(0, images.value.length - 1)
  // Rattrapage périodique. On saute le rechargement si l'onglet est masqué :
  // useVisibilityRefresh recharge déjà au retour de focus → pas de requête
  // cross-origin inutile en arrière-plan.
  listTimer = setInterval(() => {
    if (document.hidden) return
    webcamStore.loadImages()
  }, WEBCAM_CONFIG.imagesRefreshInterval)
})

onUnmounted(() => {
  playing.value = false
  playToken += 1 // invalide toute boucle de lecture en vol
  stopTimer()
  if (listTimer) clearInterval(listTimer)
})
</script>
