<template>
  <SectionCard :title="`Webcam ${CLUB_CONFIG.airfield.name}`" icon="videocam" :to="to">
    <img
      :src="camSrc"
      :alt="alt"
      loading="lazy"
      style="width: 100%; height: auto; border-radius: 12px"
    />
  </SectionCard>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import SectionCard from './SectionCard.vue'
import { WEBCAM_CONFIG } from '../../config/app.config'
import { useVisibilityRefresh } from '../../composables/useVisibilityRefresh'
import { CLUB_CONFIG } from '../../config/club.config'

const props = defineProps({
  src: { type: String, default: WEBCAM_CONFIG.url },
  alt: { type: String, default: `Webcam ${CLUB_CONFIG.airfield.name}` },
  /** Route de détail — rend le titre cliquable (Accueil uniquement) */
  to: { type: String, default: null },
})

const camSrc = ref(props.src)

// Le serveur ignore les query params : `t` sert uniquement de cache-buster.
// Préchargement via Image() pour éviter le flash blanc au changement de src.
const refreshCam = () => {
  const sep = props.src.includes('?') ? '&' : '?'
  const newSrc = `${props.src}${sep}t=${Date.now()}`
  const pre = new Image()
  pre.onload = () => {
    camSrc.value = newSrc
  }
  pre.src = newSrc
}

useVisibilityRefresh(refreshCam)

let camIntervalId = null

onMounted(() => {
  camIntervalId = setInterval(refreshCam, WEBCAM_CONFIG.refreshInterval)
})

onUnmounted(() => {
  if (camIntervalId) clearInterval(camIntervalId)
})
</script>
