<template>
  <q-page class="q-pa-md">
    <!-- Titre -->
    <div class="q-mt-lg q-mb-xl text-center">
      <div class="text-h3 text-white text-weight-bold">Cartes VAC</div>
      <UpdateStatusIndicator
        :timestamp="generatedAt"
        :is-refreshing="isRefreshing"
        :stale-threshold="getEndpointConfig('vac').staleThreshold"
        text-class="text-subtitle2 text-white q-mt-xs flex items-center justify-center"
      />
      <div v-if="airacInfo" class="text-subtitle2 text-white q-mt-xs">
        AIRAC : {{ airacInfo.cycle }}
      </div>
    </div>

    <DataLoadError
      :error="error"
      title="Erreur de chargement des cartes VAC"
      :on-retry="forceRefresh"
    />

    <StaleDataBanner
      :timestamp="generatedAt"
      :stale-threshold="getEndpointConfig('vac').staleThreshold"
      data-label="Cartes VAC"
    />

    <!-- Carte interactive Leaflet -->
    <q-card flat bordered class="q-mb-lg">
      <q-card-section>
        <div class="row items-center justify-between q-mb-md">
          <div class="text-h5 text-weight-bold text-primary">
            <q-icon name="map" size="md" class="q-mr-sm" />
            Aérodromes à proximité
          </div>
          <q-btn
            outline
            size="sm"
            :icon="isMapLocked ? 'lock' : 'lock_open'"
            :label="isMapLocked ? 'Déverrouiller' : 'Verrouiller'"
            color="primary"
            @click="toggleMapLock"
          />
        </div>
        <div class="map-wrapper">
          <div id="vac-map" style="height: 400px; width: 100%"></div>
          <div v-if="isMapLocked" class="map-lock-overlay">
            <q-icon name="lock" size="28px" class="q-mr-sm" />
            Interaction verrouillée
          </div>
        </div>
      </q-card-section>
    </q-card>

    <!-- Tableau des cartes VAC -->
    <q-table
      flat
      bordered
      :rows="vacsSortedByProximity"
      :columns="columns"
      row-key="icao"
      :pagination="{ rowsPerPage: 0 }"
      :loading="loading"
      :filter="searchQuery"
      :table-row-class-fn="getRowClass"
    >
      <template v-slot:top-right>
        <q-input
          v-model="searchQuery"
          outlined
          dense
          debounce="300"
          placeholder="Rechercher..."
          clearable
        >
          <template v-slot:append>
            <q-icon name="search" />
          </template>
        </q-input>
      </template>
      <!-- ICAO en gras -->
      <template v-slot:body-cell-icao="props">
        <q-td :props="props">
          <span class="text-weight-bold" :class="props.row.isHomeField ? 'text-orange' : ''">
            {{ props.row.icao }}
          </span>
        </q-td>
      </template>

      <!-- Distance formatée avec 1 décimale -->
      <template v-slot:body-cell-distance="props">
        <q-td :props="props"> {{ props.row.distanceNm.toFixed(1) }} NM </q-td>
      </template>

      <!-- Élévation formatée avec unité -->
      <template v-slot:body-cell-elevation="props">
        <q-td :props="props"> {{ props.row.elevation_ft }} ft </q-td>
      </template>

      <!-- Date de mise à jour -->
      <template v-slot:body-cell-updateDate="props">
        <q-td :props="props">
          <div>{{ formatDateOnly(props.row.createDate) }}</div>
          <div class="text-caption text-grey-7">{{ formatTimeAgo(props.row.createDate) }}</div>
        </q-td>
      </template>

      <!-- Bouton PDF -->
      <template v-slot:body-cell-actions="props">
        <q-td :props="props">
          <q-btn
            flat
            dense
            round
            color="red"
            icon="picture_as_pdf"
            :href="props.row.url"
            target="_blank"
            rel="noopener noreferrer"
            :aria-label="`Ouvrir la carte VAC de ${props.row.icao} (PDF)`"
          >
            <q-tooltip>Ouvrir la carte VAC (PDF)</q-tooltip>
          </q-btn>
        </q-td>
      </template>
    </q-table>
  </q-page>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { storeToRefs } from 'pinia'
import { useVacStore } from '../stores/vacStore'
import { useVisibilityRefresh } from '../composables/useVisibilityRefresh'
import { formatDateOnly, formatTimeAgo } from '../utils/dateHelpers'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import UpdateStatusIndicator from '../components/common/UpdateStatusIndicator.vue'
import DataLoadError from '../components/common/DataLoadError.vue'
import StaleDataBanner from '../components/common/StaleDataBanner.vue'
import { getEndpointConfig } from '../config/app.config'
import { CLUB_CONFIG } from '../config/club.config'

// Fix pour les icônes Leaflet en production
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: './leaflet/marker-icon-2x.png',
  iconUrl: './leaflet/marker-icon.png',
  shadowUrl: './leaflet/marker-shadow.png',
})

// Couleurs des marqueurs Leaflet (SVG inline, hors classes Quasar) ;
// le titre de la popup reprend la couleur du marqueur correspondant.
const MARKER_COLOR_HOME = '#ff6d00'
const MARKER_COLOR_DEFAULT = '#1976d2' // = $secondary

// ============================================
// Store & Data
// ============================================

const vacStore = useVacStore()
const { vacsSortedByProximity, generatedAt, airacInfo, loading, isRefreshing, error } =
  storeToRefs(vacStore)

const forceRefresh = () => vacStore.forceRefresh()

// ============================================
// State
// ============================================

const searchQuery = ref('')
let map = null
const isMapLocked = ref(true)

// ============================================
// Computed
// ============================================

/**
 * Définition des colonnes du tableau
 */
const columns = [
  {
    name: 'icao',
    required: true,
    label: 'OACI',
    align: 'left',
    field: 'icao',
    sortable: true,
  },
  {
    name: 'name',
    required: true,
    label: 'Nom',
    align: 'left',
    field: 'name',
    sortable: true,
  },
  {
    name: 'elevation',
    label: 'Élévation',
    align: 'center',
    field: 'elevation_ft',
    sortable: true,
    classes: 'gt-sm',
    headerClasses: 'gt-sm',
  },
  {
    name: 'distance',
    label: `Distance depuis ${CLUB_CONFIG.airfield.icao}`,
    align: 'center',
    field: 'distanceNm',
    sortable: true,
    classes: 'gt-sm',
    headerClasses: 'gt-sm',
  },
  {
    name: 'updateDate',
    label: 'Mise à jour',
    align: 'center',
    field: 'createDate',
    sortable: true,
    classes: 'gt-xs',
    headerClasses: 'gt-xs',
  },
  {
    name: 'actions',
    label: 'VAC',
    align: 'center',
    field: 'actions',
  },
]

// ============================================
// Functions
// ============================================

/**
 * Retourne la classe CSS pour une ligne selon l'ancienneté de la carte VAC
 * @param {Object} row - Ligne du tableau contenant createDate
 * @returns {string} - Classe CSS à appliquer
 */
function getRowClass(row) {
  if (!row.createDate) return ''

  const now = new Date()
  const createDate = new Date(row.createDate)
  const diffMs = now - createDate
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays < 28) {
    return 'bg-red-1' // Rouge
  } else if (diffDays < 84) {
    return 'bg-orange-1' // Orange
  } else if (diffDays < 168) {
    return 'bg-yellow-1' // Jaune
  }

  return ''
}

// ============================================
// Carte Leaflet
// ============================================

/**
 * Initialise la carte Leaflet avec marqueurs
 */
function initMap() {
  if (!vacsSortedByProximity.value || vacsSortedByProximity.value.length === 0) {
    return
  }

  // Vérifier que le conteneur DOM existe et a des dimensions valides
  const container = document.getElementById('vac-map')
  if (!container || container.clientWidth === 0 || container.clientHeight === 0) {
    // Réessayer après un court délai si le conteneur n'est pas prêt
    setTimeout(() => initMap(), 100)
    return
  }

  // Initialiser la carte centrée sur le terrain de rattachement
  map = L.map('vac-map', {
    zoomControl: true,
    attributionControl: true,
  }).setView([CLUB_CONFIG.airfield.lat, CLUB_CONFIG.airfield.lon], 7)

  // Ajouter le fond de carte OpenStreetMap
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map)

  applyMapLock()

  // Forcer Leaflet à recalculer les dimensions du conteneur
  // Nécessaire car le conteneur peut ne pas avoir ses dimensions finales
  map.whenReady(() => {
    setTimeout(() => {
      if (map) map.invalidateSize()
    }, 200)
  })

  // Créer des icônes personnalisées avec divIcon : terrain de rattachement (orange) et autres (bleu)
  const homeIcon = L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="position: relative;">
        <svg width="25" height="41" viewBox="0 0 25 41" xmlns="http://www.w3.org/2000/svg">
          <path d="M12.5 0C5.596 0 0 5.596 0 12.5c0 8.437 12.5 28.5 12.5 28.5S25 20.937 25 12.5C25 5.596 19.404 0 12.5 0z" fill="${MARKER_COLOR_HOME}"/>
          <circle cx="12.5" cy="12.5" r="6" fill="white"/>
        </svg>
      </div>
    `,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
  })

  const defaultIcon = L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="position: relative;">
        <svg width="25" height="41" viewBox="0 0 25 41" xmlns="http://www.w3.org/2000/svg">
          <path d="M12.5 0C5.596 0 0 5.596 0 12.5c0 8.437 12.5 28.5 12.5 28.5S25 20.937 25 12.5C25 5.596 19.404 0 12.5 0z" fill="${MARKER_COLOR_DEFAULT}"/>
          <circle cx="12.5" cy="12.5" r="6" fill="white"/>
        </svg>
      </div>
    `,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
  })

  // Ajouter les marqueurs pour chaque aérodrome
  vacsSortedByProximity.value.forEach((vac) => {
    const icon = vac.isHomeField ? homeIcon : defaultIcon
    const marker = L.marker([vac.latitude, vac.longitude], { icon })
    marker.bindPopup(formatVacPopup(vac))
    marker.addTo(map)
  })
}

/**
 * Construit le HTML de la popup Leaflet d'un aérodrome.
 * La popup vit dans le DOM de la page : les classes Quasar s'y appliquent ;
 * seule la couleur du titre reste inline (alignée sur celle du marqueur).
 */
function formatVacPopup(vac) {
  const titleColor = vac.isHomeField ? MARKER_COLOR_HOME : MARKER_COLOR_DEFAULT
  return `
    <div style="min-width: 200px;">
      <div class="text-weight-bold text-subtitle2 q-mb-sm" style="color: ${titleColor};">
        ${vac.icao}${vac.isHomeField ? ' (Référence)' : ''}
      </div>
      <div class="q-mb-xs"><strong>Nom:</strong> ${vac.name}</div>
      <div class="q-mb-xs"><strong>Coordonnées:</strong> ${vac.latitude.toFixed(4)}°N, ${vac.longitude.toFixed(4)}°E</div>
      <div class="q-mb-xs"><strong>Élévation:</strong> ${vac.elevation_ft} ft</div>
      ${!vac.isHomeField ? `<div class="q-mb-xs"><strong>Distance:</strong> ${vac.distanceNm.toFixed(1)} NM</div>` : ''}
      <div class="q-mb-sm"><strong>Mise à jour:</strong> ${formatDateOnly(vac.createDate)}<br/><span class="text-caption text-grey-7">${formatTimeAgo(vac.createDate)}</span></div>
      <div class="q-mt-sm">
        <a href="${vac.url}" target="_blank" rel="noopener noreferrer" class="text-negative text-weight-bold" style="text-decoration: none;">
          📄 Voir carte VAC
        </a>
      </div>
    </div>
  `
}

function applyMapLock() {
  if (!map) return

  if (isMapLocked.value) {
    map.dragging.disable()
    map.scrollWheelZoom.disable()
    map.doubleClickZoom.disable()
    map.boxZoom.disable()
    map.keyboard.disable()
    map.touchZoom.disable()
    if (map.tap) map.tap.disable()
    if (map.zoomControl) map.zoomControl.disable()
  } else {
    map.dragging.enable()
    map.scrollWheelZoom.enable()
    map.doubleClickZoom.enable()
    map.boxZoom.enable()
    map.keyboard.enable()
    map.touchZoom.enable()
    if (map.tap) map.tap.enable()
    if (map.zoomControl) map.zoomControl.enable()
  }
}

function toggleMapLock() {
  isMapLocked.value = !isMapLocked.value
  applyMapLock()
}

// ============================================
// Lifecycle
// ============================================

let resizeObserver = null

watch(
  () => vacsSortedByProximity.value,
  (list) => {
    if (!list || list.length === 0) {
      return
    }

    nextTick(() => {
      if (map) {
        map.remove()
        map = null
      }
      initMap()
    })
  },
)

onMounted(() => {
  // Observer les changements de taille du conteneur pour recalculer la carte
  const container = document.getElementById('vac-map')
  if (container && typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => {
      if (map) map.invalidateSize()
    })
    resizeObserver.observe(container)
  }

  // Si les données sont déjà disponibles au montage, initialiser la carte
  if (vacsSortedByProximity.value && vacsSortedByProximity.value.length > 0 && !map) {
    nextTick(() => initMap())
  }
})

onBeforeUnmount(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
  if (map) {
    map.remove()
    map = null
  }
})

useVisibilityRefresh(() => vacStore.loadVac())
</script>

<style scoped>
/* S'assurer que la carte Leaflet s'affiche correctement */
#vac-map {
  border-radius: 4px;
}

.map-wrapper {
  position: relative;
}

.map-lock-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.78);
  color: #1976d2;
  font-weight: 600;
  pointer-events: none;
  border-radius: 4px;
}
</style>
