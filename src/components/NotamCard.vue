<template>
  <q-item class="q-ma-sm bg-grey-2" style="position: relative">
    <div class="row full-width no-wrap">
      <!-- Colonne gauche: contenu principal -->
      <q-item-section :class="hasCoordinates ? 'col-12 col-sm' : ''">
        <q-item-label>
          <div class="row items-center q-gutter-xs">
            <!-- Nouveau badge -->
            <q-badge v-if="isNew" label="Nouveau" color="accent" text-color="white" rounded />

            <!-- Série et numéro NOTAM -->
            <q-badge
              :color="markerColor"
              :label="`${notam.series}${notam.number}/${notam.year}`"
              rounded
            />

            <!-- État de validité -->
            <q-badge :color="validityColor" :label="validityLabel" rounded />

            <!-- Purpose -->
            <q-badge
              v-if="qLineDetails.purpose"
              :label="qLineDetails.purpose"
              color="primary"
              text-color="white"
              rounded
            />

            <!-- Traffic -->
            <q-badge
              v-if="qLineDetails.traffic"
              :label="qLineDetails.traffic"
              color="secondary"
              text-color="white"
              rounded
            />

            <!-- Basse altitude -->
            <q-badge
              v-if="notam.qLine?.upper !== undefined && notam.qLine.upper < 10"
              label="Basse altitude"
              color="orange"
              text-color="white"
              rounded
            />
          </div>
        </q-item-label>

        <!-- Texte français du NOTAM -->
        <q-item-label caption class="q-mt-sm text-body2 text-grey-9">
          {{ frenchText }}
        </q-item-label>

        <!-- Dates de validité -->
        <q-item-label caption class="q-mt-sm text-grey-9">
          <div class="row q-gutter-sm q-mt-xs">
            <div><strong>Début:</strong> {{ formatDate(notam.startValidity) }}</div>
            <div>
              <strong>Fin:</strong>
              {{ notam.endValidity === 'PERM' ? 'PERMANENT' : formatDate(notam.endValidity) }}
            </div>
          </div>
          <q-item-label caption class="q-mt-sm text-grey-9"> </q-item-label>
          <div class="row q-gutter-sm">
            <div v-if="qLineDetails.subject">
              <strong>Sujet:</strong> {{ qLineDetails.subject }}
            </div>
            <div v-if="qLineDetails.condition">
              <strong>État:</strong> {{ qLineDetails.condition }}
            </div>
          </div>
          <div class="row q-gutter-sm">
            <div v-if="qLineDetails.scope"><strong>Portée:</strong> {{ qLineDetails.scope }}</div>
            <div v-if="qLineDetails.altitude">
              <strong>Altitude:</strong> {{ qLineDetails.altitude }}
            </div>
            <div v-if="qLineDetails.fir"><strong>FIR:</strong> {{ qLineDetails.fir }}</div>
          </div>
        </q-item-label>

        <!-- Coordonnées et rayon -->
        <q-item-label v-if="notam.coordinates || notam.radius" caption class="text-grey-9">
          <div class="row q-gutter-sm">
            <div v-if="notam.coordinates">
              <strong>Coordonnées:</strong> {{ notam.coordinates }}
            </div>
            <div v-if="notam.radius"><strong>Rayon:</strong> {{ notam.radius }} NM</div>
          </div>
        </q-item-label>

        <!-- Carte sur petit écran (en dessous du texte) -->
        <div v-if="hasCoordinates" class="lt-sm q-mt-md" style="width: 100%; height: 200px">
          <div
            :id="`notam-mini-map-${notam.id}`"
            style="width: 100%; height: 100%; border-radius: 8px"
          ></div>
        </div>

        <!-- Actions en bas -->
        <div class="row q-gutter-sm q-mt-sm" :class="{ 'justify-end': $q.screen.xs }">
          <q-btn
            v-if="!isNew || isHidden"
            :icon="isHidden ? 'visibility' : 'visibility_off'"
            :label="isHidden ? 'Démasquer' : 'Masquer'"
            :color="isHidden ? 'primary' : 'grey-7'"
            size="sm"
            outline
            no-caps
            @click.stop.prevent="handleHide"
          />
          <q-btn
            v-if="isNew"
            icon="check"
            label="Vu"
            color="accent"
            size="sm"
            outline
            no-caps
            @click.stop.prevent="handleMarkSeen"
          />
          <q-btn
            v-if="supAipInfo"
            :href="supAipInfo.url"
            target="_blank"
            rel="noopener noreferrer"
            icon="picture_as_pdf"
            :label="`SUP AIP ${supAipInfo.isAirac ? 'AIRAC ' : ''}${supAipInfo.number}/${supAipInfo.year}`"
            color="primary"
            size="sm"
            outline
            no-caps
            @click.stop
          />
        </div>
      </q-item-section>

      <!-- Colonne droite: mini carte (grand écran) -->
      <div
        v-if="hasCoordinates"
        class="gt-xs q-ml-md"
        style="width: 250px; flex-shrink: 0; align-self: stretch; display: flex"
      >
        <div
          :id="`notam-mini-map-desktop-${notam.id}`"
          style="width: 100%; height: 100%; border-radius: 8px"
        ></div>
      </div>
    </div>
  </q-item>
</template>

<script setup>
import { computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { useQuasar } from 'quasar'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix Leaflet icon paths for production build
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: './leaflet/marker-icon-2x.png',
  iconUrl: './leaflet/marker-icon.png',
  shadowUrl: './leaflet/marker-shadow.png',
})

import {
  formatQLineDetails,
  getValidityState,
  hasValidCoordinates,
  parseCoordinates,
  radiusToMeters,
} from '../utils/notamHelpers'
import { formatDate } from '../utils/dateHelpers'

const props = defineProps({
  notam: {
    type: Object,
    required: true,
  },
  isHidden: {
    type: Boolean,
    default: false,
  },
  isNew: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['hide', 'mark-seen'])
const $q = useQuasar()

let map = null
let circle = null
let resizeTimeoutId = null
let screenTimeoutId = null
let mapObserver = null

// Détails Q-Line formatés
const qLineDetails = computed(() => {
  return formatQLineDetails(props.notam.qLine)
})

// Texte français du NOTAM
const frenchText = computed(() => {
  return props.notam.multiLanguage?.itemE || props.notam.itemE || 'Aucune description disponible'
})

// État de validité
const validityState = computed(() => {
  return getValidityState(props.notam)
})

// Label de validité
const validityLabel = computed(() => {
  const states = {
    current: 'En cours',
    future: 'Futur',
    expired: 'Expiré',
    unknown: 'Inconnu',
  }
  return states[validityState.value] || 'Inconnu'
})

// Couleur selon validité
const validityColor = computed(() => {
  const colors = {
    current: 'positive',
    future: 'warning',
    expired: 'negative',
    unknown: 'grey',
  }
  return colors[validityState.value] || 'grey'
})

// Couleur selon marker
const markerColor = computed(() => {
  return props.notam.marker === '+' ? 'info' : 'grey-6'
})

// Vérifier si le NOTAM a des coordonnées valides
const hasCoordinates = computed(() => {
  return hasValidCoordinates(props.notam)
})

// Détecter et extraire les informations du SUP AIP
const supAipInfo = computed(() => {
  if (!props.notam) return null

  // Chercher dans le texte français et itemE
  const textToSearch = `${frenchText.value} ${props.notam.itemE || ''}`

  // Regex pour détecter SUP AIP XXX/YYYY, SUP AIP XXX/YY ou SUP AIP AIRAC XXX/YY
  const supAipRegex = /SUP\s+AIP\s+(AIRAC\s+)?(\d{3})\/(\d{2,4})/i
  const match = textToSearch.match(supAipRegex)

  if (!match) return null

  const isAirac = !!match[1] // Vérifier si AIRAC est présent
  const number = match[2] // 069
  let year = match[3] // 24 ou 2024

  // Si année à 4 chiffres, garder seulement les 2 derniers
  if (year.length === 4) {
    year = year.substring(2)
  }

  // Construire l'URL du PDF (avec _a_ pour AIRAC)
  const urlSuffix = isAirac ? `_a_` : `_`
  const url = `https://www.sia.aviation-civile.gouv.fr/media/store/documents/file/l/f/lf_sup${urlSuffix}20${year}_${number}_fr.pdf`

  return {
    number,
    year,
    url,
    isAirac,
  }
})

// Détermine l'ID de l'élément carte selon le breakpoint actif
const activeMapId = () => {
  return $q.screen.xs
    ? `notam-mini-map-${props.notam.id}`
    : `notam-mini-map-desktop-${props.notam.id}`
}

// Initialiser la mini carte (une seule selon le breakpoint actif)
const initMiniMap = () => {
  if (!hasCoordinates.value) return

  nextTick(() => {
    const coords = parseCoordinates(props.notam.coordinates)
    if (!coords) return

    const { lat, lon } = coords
    const radius = props.notam.radius || 0
    const mapId = activeMapId()

    const mapElement = document.getElementById(mapId)
    if (!mapElement || map) return

    // Créer la carte
    map = L.map(mapId, {
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      touchZoom: false,
    }).setView([lat, lon], 8)

    // Ajouter les tuiles OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map)

    // Ajouter le marqueur
    L.marker([lat, lon]).addTo(map)

    // Ajouter le cercle de rayon
    if (radius > 0) {
      const radiusM = radiusToMeters(radius)
      circle = L.circle([lat, lon], {
        color: 'red',
        fillColor: '#f03',
        fillOpacity: 0.2,
        radius: radiusM,
      }).addTo(map)

      // Ajuster la vue pour inclure le cercle
      const bounds = circle.getBounds()
      map.fitBounds(bounds, { padding: [10, 10] })
    }

    // Forcer le redimensionnement
    if (resizeTimeoutId) clearTimeout(resizeTimeoutId)
    resizeTimeoutId = setTimeout(() => {
      if (map) {
        map.invalidateSize()
      }
      resizeTimeoutId = null
    }, 100)
  })
}

// Cleanup de la carte
const cleanupMap = () => {
  // Nettoyer les timeouts
  if (resizeTimeoutId) {
    clearTimeout(resizeTimeoutId)
    resizeTimeoutId = null
  }
  if (screenTimeoutId) {
    clearTimeout(screenTimeoutId)
    screenTimeoutId = null
  }

  // Nettoyer l'observer
  if (mapObserver) {
    mapObserver.disconnect()
    mapObserver = null
  }

  // Nettoyer la carte
  if (map) {
    map.remove()
    map = null
    circle = null
  }
}

// Gestion du masquage
const handleHide = () => {
  emit('hide', props.notam)
}

// Gestion du marquage comme vu
const handleMarkSeen = () => {
  emit('mark-seen', props.notam)
}

// Initialiser la carte au montage avec IntersectionObserver pour lazy-load
onMounted(() => {
  if (hasCoordinates.value) {
    // Observer l'élément carte du breakpoint actif
    const mapElement = document.getElementById(activeMapId())

    if (mapElement) {
      mapObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && !map) {
              initMiniMap()
              if (mapObserver) {
                mapObserver.disconnect()
                mapObserver = null
              }
            }
          })
        },
        {
          rootMargin: '100px',
          threshold: 0.01,
        },
      )

      mapObserver.observe(mapElement)
    }
  }
})

// Cleanup au démontage
onBeforeUnmount(() => {
  cleanupMap()
})

// Watch pour réinitialiser si le NOTAM change
watch(
  () => props.notam.id,
  () => {
    cleanupMap()
    if (hasCoordinates.value) {
      initMiniMap()
    }
  },
)

// Watch pour réinitialiser quand la taille d'écran change
watch(
  () => $q.screen.name,
  () => {
    if (hasCoordinates.value) {
      // Nettoyer le timeout existant
      if (screenTimeoutId) clearTimeout(screenTimeoutId)

      // Attendre que le DOM soit mis à jour
      screenTimeoutId = setTimeout(() => {
        cleanupMap()
        initMiniMap()
        screenTimeoutId = null
      }, 150)
    }
  },
)
</script>

<style scoped>
.q-item {
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 8px;
  background-color: white;
}

.q-item:hover {
  background-color: rgba(0, 0, 0, 0.03);
}
</style>
