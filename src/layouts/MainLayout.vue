<template>
  <q-layout view="hHh Lpr lFf">
    <q-header elevated class="bg-accent text-dark">
      <q-toolbar>
        <q-btn flat dense round icon="menu" aria-label="Menu" @click="toggleLeftDrawer" />

        <q-toolbar-title>
          <router-link to="/" class="text-dark" style="text-decoration: none">
            {{ CLUB_CONFIG.app.name }}
          </router-link>
        </q-toolbar-title>

        <q-chip
          v-if="goNoGoStatus"
          clickable
          :color="isWeatherStale ? 'grey-7' : goNoGoMeta(goNoGoStatus.status).color"
          text-color="white"
          :icon="isWeatherStale ? 'update_disabled' : goNoGoMeta(goNoGoStatus.status).icon"
          :label="isWeatherStale ? '—' : goNoGoMeta(goNoGoStatus.status).label"
          class="q-mr-xs text-weight-bold"
          :aria-label="
            isWeatherStale
              ? 'Statut Go/No-Go VFR indisponible : données périmées'
              : `Statut Go/No-Go VFR : ${goNoGoMeta(goNoGoStatus.status).label}`
          "
        >
          <q-tooltip v-if="isWeatherStale">
            Données météo périmées — bilan Go/No-Go non fiable
          </q-tooltip>

          <q-menu>
            <q-list dense style="min-width: 220px">
              <q-item v-for="c in goNoGoStatus.criteria" :key="c.key">
                <q-item-section avatar>
                  <q-icon :name="criterionIcon(c.key)" size="sm" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>{{ c.label }}</q-item-label>
                  <q-item-label caption>{{ c.formatted }}</q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-badge
                    :color="criterionLevelColor(c.level)"
                    :label="criterionLevelLabel(c.level)"
                    rounded
                  />
                </q-item-section>
              </q-item>

              <q-separator />

              <q-item clickable v-close-popup @click="$router.push('/weather')">
                <q-item-section avatar>
                  <q-icon name="open_in_new" size="sm" />
                </q-item-section>
                <q-item-section>Voir le détail complet</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </q-chip>

        <q-btn
          v-if="isFeatureEnabled('notifications')"
          flat
          dense
          round
          :icon="bellStatus.icon"
          :color="bellStatus.color"
          aria-label="Notifications"
          @click="$router.push('/notifications')"
        >
          <q-tooltip>{{ bellStatus.tooltip }}</q-tooltip>
        </q-btn>
      </q-toolbar>
    </q-header>

    <q-drawer v-model="leftDrawerOpen" show-if-above bordered>
      <q-list>
        <q-item v-for="item in navItems" :key="item.to" clickable v-ripple :to="item.to">
          <q-item-section avatar>
            <q-icon :name="item.icon" />
          </q-item-section>
          <q-item-section>{{ item.label }}</q-item-section>
        </q-item>
      </q-list>

      <q-separator class="q-my-md" />

      <div class="text-subtitle2 text-weight-bold q-px-md q-mb-sm">Liens Utiles</div>
      <q-list>
        <q-item
          v-for="link in externalLinks"
          :key="link.href"
          clickable
          v-ripple
          :href="link.href"
          target="_blank"
          rel="noopener noreferrer"
        >
          <q-item-section avatar>
            <q-icon name="open_in_new" />
          </q-item-section>
          <q-item-section>{{ link.label }}</q-item-section>
        </q-item>
      </q-list>

      <q-separator class="q-my-md" />

      <div class="text-subtitle2 text-weight-bold q-px-md q-mb-sm">Paramètres</div>
      <q-list>
        <q-item clickable v-ripple to="/customization">
          <q-item-section avatar>
            <q-icon name="tune" />
          </q-item-section>
          <q-item-section> Personnalisation </q-item-section>
        </q-item>
        <q-item clickable v-ripple to="/vfr-settings">
          <q-item-section avatar>
            <q-icon name="speed" />
          </q-item-section>
          <q-item-section> Seuils VFR </q-item-section>
        </q-item>
        <q-item v-if="isFeatureEnabled('notifications')" clickable v-ripple to="/notifications">
          <q-item-section avatar>
            <q-icon :name="bellStatus.icon" :color="bellStatus.color" />
          </q-item-section>
          <q-item-section> Notifications </q-item-section>
        </q-item>
        <q-item clickable v-ripple to="/status">
          <q-item-section avatar>
            <q-icon name="info" />
          </q-item-section>
          <q-item-section> Info système </q-item-section>
        </q-item>
      </q-list>

      <q-separator class="q-my-xs" />

      <div class="q-pa-md">
        <div class="text-caption text-grey-7 text-center">Version: {{ buildDate }}</div>
      </div>
    </q-drawer>

    <q-page-container>
      <q-banner
        v-if="isOffline"
        dense
        class="bg-warning text-dark q-pa-xs q-mx-md q-mt-md offline-banner"
        role="status"
      >
        <div class="row items-center no-wrap">
          <q-icon name="wifi_off" size="20px" class="q-mr-sm" aria-label="Pas de réseau" />
          <UpdateStatusIndicator
            label="Mode hors ligne"
            :timestamp="lastOfflineAt"
            :is-refreshing="false"
            value-text="Données en cache"
            text-class="text-subtitle2 text-dark q-mt-none flex items-center"
          />
        </div>
      </q-banner>

      <router-view />
    </q-page-container>

    <q-footer
      v-if="!$q.screen.gt.sm && isBottomMenuVisible"
      class="bg-accent text-dark mobile-footer"
      elevated
    >
      <q-toolbar class="no-padding">
        <div class="row no-wrap footer-items" style="width: 100%">
          <div
            v-for="item in visibleMenuItems"
            :key="item.id"
            class="footer-item flex justify-center"
          >
            <q-btn
              v-if="item.isExternal"
              flat
              :round="!showLabels"
              :dense="!showLabels"
              :href="item.href"
              target="_blank"
              rel="noopener noreferrer"
              :aria-label="item.label"
              class="text-dark menu-btn"
              :class="{ 'with-label': showLabels }"
            >
              <div class="column items-center">
                <q-icon :name="item.icon" color="dark" />
                <div v-if="showLabels" class="text-caption q-mt-xs">{{ item.label }}</div>
              </div>
            </q-btn>
            <q-btn
              v-else
              flat
              :round="!showLabels"
              :dense="!showLabels"
              :to="item.route"
              :aria-label="item.label"
              class="text-dark menu-btn"
              :class="{ 'with-label': showLabels }"
            >
              <div class="column items-center">
                <q-icon :name="item.icon" :color="activeColor(item.route)" />
                <div v-if="showLabels" class="text-caption q-mt-xs">{{ item.label }}</div>
              </div>
            </q-btn>
          </div>
        </div>
      </q-toolbar>
    </q-footer>
  </q-layout>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import UpdateStatusIndicator from '../components/common/UpdateStatusIndicator.vue'
import { CLUB_CONFIG } from '../config/club.config'
import { isFeatureEnabled } from '../config/features'
import { useNetworkStatus } from '../composables/useNetworkStatus'
import { useWeatherStore } from '../stores/weatherStore'
import { useNotamStore } from '../stores/notamStore'
import { useAzbaStore } from '../stores/azbaStore'
import { useTemsiStore } from '../stores/temsiStore'
import { useWintemStore } from '../stores/wintemStore'
import { useVacStore } from '../stores/vacStore'
import { useRexFfaStore } from '../stores/rexFfaStore'
import { useStationStore } from '../stores/stationStore'
import { useAircraftStore } from '../stores/aircraftStore'
import { useNotificationStore } from '../stores/notificationStore'
import { useCustomizationStore } from '../stores/customizationStore'
import { useHiddenNotams } from '../composables/useHiddenNotams'
import { useSeenNotams } from '../composables/useSeenNotams'
import {
  goNoGoMeta,
  criterionIcon,
  criterionLevelColor,
  criterionLevelLabel,
} from '../utils/goNoGoHelpers'

const $q = useQuasar()
const route = useRoute()
const leftDrawerOpen = ref(false)
const { isOnline, lastOfflineAt } = useNetworkStatus()
const isOffline = computed(() => !isOnline.value)
const weatherStore = useWeatherStore()
const { goNoGoStatus, isWeatherStale } = storeToRefs(weatherStore)
const notamStore = useNotamStore()
const azbaStore = useAzbaStore()
const temsiStore = useTemsiStore()
const wintemStore = useWintemStore()
const vacStore = useVacStore()
const rexFfaStore = useRexFfaStore()
const stationStore = useStationStore()
const aircraftStore = useAircraftStore()
const notificationStore = useNotificationStore()
const customizationStore = useCustomizationStore()
const { availableMenuItems } = customizationStore
const { visibleMenuItems, isBottomMenuVisible, showLabels } = storeToRefs(customizationStore)

// --- Navigation du drawer dérivée de la source unique (availableMenuItems) ---
// Pages internes de premier niveau (on exclut les sous-onglets `parentId`,
// déjà accessibles depuis leur page parente).
const navItems = availableMenuItems
  .filter((item) => item.route && !item.parentId)
  .map((item) => ({ icon: item.icon, label: item.label, to: item.route }))

const externalLinks = availableMenuItems
  .filter((item) => item.isExternal)
  .map((item) => ({ label: item.label, href: item.href }))

// Initialiser le store de notifications
onMounted(() => {
  // Notifications push : module optionnel (ADR-030) — pas d'init sans Firebase configuré
  if (isFeatureEnabled('notifications')) notificationStore.initialize()

  // Cleanup automatique du localStorage pour les NOTAMs
  const { cleanupExpired: cleanupHidden } = useHiddenNotams()
  const { cleanupExpired: cleanupSeen } = useSeenNotams()

  // Cleanup immédiat au démarrage
  cleanupHidden()
  cleanupSeen()

  // Cleanup périodique toutes les 6 heures
  const cleanupInterval = setInterval(
    () => {
      cleanupHidden()
      cleanupSeen()
    },
    6 * 60 * 60 * 1000,
  ) // 6 heures

  onUnmounted(() => {
    clearInterval(cleanupInterval)
  })
})

// Statut de l'icône cloche
const bellStatus = computed(() => notificationStore.bellStatus)

// Date de build formatée
const buildDate = computed(() => {
  const date = new Date(process.env.BUILD_DATE)
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
})

const refreshAllData = async () => {
  await Promise.allSettled([
    weatherStore.forceRefresh(),
    notamStore.forceRefresh(),
    azbaStore.forceRefresh(),
    temsiStore.forceRefresh(),
    wintemStore.forceRefresh(),
    vacStore.forceRefresh(),
    ...(isFeatureEnabled('rex') ? [rexFfaStore.forceRefresh()] : []),
    ...(isFeatureEnabled('station') ? [stationStore.forceRefresh()] : []),
    ...(isFeatureEnabled('aircraft') ? [aircraftStore.forceRefresh()] : []),
  ])
}

watch(isOnline, (online) => {
  if (online) {
    refreshAllData()
  }
})

function toggleLeftDrawer() {
  leftDrawerOpen.value = !leftDrawerOpen.value
}

function activeColor(target) {
  // Les raccourcis vers un onglet portent une query (ex. /preparation?tab=perf) :
  // on compare alors chemin + onglet, sinon le chemin seul.
  const [path, query] = target.split('?')
  if (route.path !== path) return 'dark'
  if (!query) return 'primary'
  const tab = new URLSearchParams(query).get('tab')
  return route.query.tab === tab ? 'primary' : 'dark'
}
</script>

<style scoped>
.offline-banner {
  border-bottom: 1px solid #f1b355;
}

.mobile-footer {
  padding-bottom: max(env(safe-area-inset-bottom), 16px);
  padding-left: max(env(safe-area-inset-left), 16px);
  padding-right: max(env(safe-area-inset-right), 16px);
}

.mobile-footer .q-toolbar {
  padding-bottom: 8px;
}

/* Logique barre basse :
   - tant que les items tiennent, ils s'étirent à parts égales (grow: 1) ;
   - leur largeur ne descend jamais sous un seuil confortable (basis 72px,
     shrink: 0) → pas d'écrasement ;
   - au-delà, le total déborde et le conteneur défile horizontalement.
   Le contenu (bouton + libellé) est borné à la largeur de la case pour que
   tous les items restent de largeur identique, même avec les libellés. */
.footer-items {
  overflow-x: auto;
  scrollbar-width: none; /* Firefox */
}

.footer-items::-webkit-scrollbar {
  display: none; /* WebKit */
}

.footer-item {
  flex: 1 0 72px;
  min-width: 0;
}

.footer-item .menu-btn {
  width: 100%;
  min-width: 0;
}

.menu-btn.with-label {
  padding: 4px 8px;
  min-height: 48px;
}

.menu-btn .text-caption {
  font-size: 10px;
  line-height: 1.2;
  max-width: 100%;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
