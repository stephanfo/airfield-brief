<template>
  <div>
    <!-- Service Worker -->
    <q-card flat bordered class="q-mb-md">
      <q-card-section>
        <div class="text-h6 text-weight-bold text-primary flex items-center">
          <q-icon name="settings_suggest" class="q-mr-sm" />
          Service Worker
        </div>
      </q-card-section>
      <q-list>
        <q-item>
          <q-item-section avatar>
            <q-icon
              :name="swStatus.supported ? 'check_circle' : 'cancel'"
              :color="swStatus.supported ? 'positive' : 'negative'"
            />
          </q-item-section>
          <q-item-section>
            <q-item-label>Support Service Worker</q-item-label>
            <q-item-label caption>
              {{ swStatus.supported ? 'Supporté' : 'Non supporté' }}
            </q-item-label>
          </q-item-section>
        </q-item>

        <q-item v-if="swStatus.supported">
          <q-item-section avatar>
            <q-icon
              :name="swStatus.registered ? 'check_circle' : 'warning'"
              :color="swStatus.registered ? 'positive' : 'warning'"
            />
          </q-item-section>
          <q-item-section>
            <q-item-label>État</q-item-label>
            <q-item-label caption>
              {{ swStatus.registered ? 'Enregistré et actif' : 'Non enregistré' }}
            </q-item-label>
          </q-item-section>
        </q-item>

        <q-item v-if="swStatus.scope">
          <q-item-section avatar>
            <q-icon name="folder" color="primary" />
          </q-item-section>
          <q-item-section>
            <q-item-label>Scope</q-item-label>
            <q-item-label caption class="text-wrap">
              {{ swStatus.scope }}
            </q-item-label>
          </q-item-section>
        </q-item>

        <q-item v-if="swStatus.active">
          <q-item-section avatar>
            <q-icon name="link" color="primary" />
          </q-item-section>
          <q-item-section>
            <q-item-label>Script actif</q-item-label>
            <q-item-label caption class="text-wrap">
              {{ swStatus.active.scriptURL }}
              <q-chip
                size="sm"
                dense
                :color="swStatus.active.state === 'activated' ? 'positive' : 'warning'"
                text-color="white"
                class="q-ml-xs"
              >
                {{ swStatus.active.state }}
              </q-chip>
            </q-item-label>
          </q-item-section>
        </q-item>

        <q-item v-if="swStatus.waiting">
          <q-item-section avatar>
            <q-icon name="update" color="warning" />
          </q-item-section>
          <q-item-section>
            <q-item-label>Mise à jour disponible</q-item-label>
            <q-item-label caption> Une nouvelle version est en attente </q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-btn outline size="sm" color="primary" label="Activer" @click="handleSkipWaiting" />
          </q-item-section>
        </q-item>
      </q-list>
      <q-separator />
      <q-card-actions>
        <q-btn
          outline
          size="sm"
          color="primary"
          icon="refresh"
          label="Vérifier les mises à jour"
          @click="handleCheckUpdates"
        />
        <q-btn
          v-if="swStatus.supported && !swStatus.registered"
          outline
          size="sm"
          color="warning"
          icon="app_registration"
          label="Réenregistrer SW"
          @click="handleReregisterSW"
        />
      </q-card-actions>
    </q-card>

    <!-- Caches Service Worker -->
    <q-card flat bordered class="q-mb-md">
      <q-card-section>
        <div class="text-h6 text-weight-bold text-primary flex items-center">
          <q-icon name="folder_special" class="q-mr-sm" />
          Caches Service Worker
        </div>
      </q-card-section>
      <q-list v-if="swCaches.length > 0">
        <q-item v-for="cache in swCaches" :key="cache.name">
          <q-item-section avatar>
            <q-icon name="inventory_2" color="accent" />
          </q-item-section>
          <q-item-section>
            <q-item-label>{{ cache.name }}</q-item-label>
            <q-item-label caption>
              {{ cache.entries }} entrée{{ cache.entries > 1 ? 's' : '' }} • {{ cache.sizeMB }} MB
            </q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-btn
              outline
              round
              icon="delete"
              color="negative"
              size="sm"
              :aria-label="`Vider le cache ${cache.name}`"
              @click="handleClearSWCache(cache.name)"
            >
              <q-tooltip>Vider ce cache</q-tooltip>
            </q-btn>
          </q-item-section>
        </q-item>
      </q-list>
      <q-card-section v-else>
        <div class="text-center text-grey-5">Aucun cache disponible</div>
      </q-card-section>
      <q-separator v-if="swCaches.length > 0" />
      <q-card-actions v-if="swCaches.length > 0">
        <q-btn
          outline
          size="sm"
          color="negative"
          icon="delete_forever"
          label="Vider tous les caches SW"
          @click="handleClearAllSWCaches"
        />
      </q-card-actions>
    </q-card>
  </div>
</template>

<script setup>
import { useQuasar } from 'quasar'
import { logger } from '../../utils/logger'

/**
 * Section diagnostic du Service Worker : état de l'enregistrement et
 * gestion des caches Workbox. L'état (swStatus/swCaches) appartient à la
 * page parente (partagé avec le chip de statut global) ; les actions qui
 * le modifient émettent un événement de rafraîchissement.
 */
defineProps({
  swStatus: {
    type: Object,
    required: true,
  },
  swCaches: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(['refresh-status', 'refresh-caches'])

const $q = useQuasar()

const handleSkipWaiting = async () => {
  try {
    const registration = await navigator.serviceWorker.ready
    if (registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' })
      $q.notify({
        type: 'positive',
        message: 'Mise à jour activée, rechargement...',
        timeout: 1500,
      })
      setTimeout(() => window.location.reload(), 1500)
    }
  } catch (error) {
    logger.error('Erreur activation SW:', error)
    $q.notify({
      type: 'negative',
      message: "Erreur lors de l'activation",
      timeout: 2000,
    })
  }
}

const handleCheckUpdates = async () => {
  try {
    const registration = await navigator.serviceWorker.getRegistration()
    if (registration) {
      await registration.update()
      emit('refresh-status')
      $q.notify({
        type: 'info',
        message: 'Vérification des mises à jour effectuée',
        timeout: 2000,
      })
    }
  } catch (error) {
    logger.error('Erreur vérification mises à jour:', error)
  }
}

const handleClearSWCache = async (cacheName) => {
  $q.dialog({
    title: 'Vider le cache',
    message: `Êtes-vous sûr de vouloir vider le cache "${cacheName}" ?`,
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    try {
      const registration = await navigator.serviceWorker.ready
      if (!registration.active) return

      const messageChannel = new MessageChannel()
      messageChannel.port1.onmessage = (event) => {
        if (event.data?.success) {
          $q.notify({
            type: 'positive',
            message: `Cache "${cacheName}" vidé`,
            timeout: 2000,
          })
          emit('refresh-caches')
        }
      }

      registration.active.postMessage({ type: 'CLEAR_CACHE', payload: { cacheName } }, [
        messageChannel.port2,
      ])
    } catch (error) {
      logger.error('Erreur suppression cache SW:', error)
      $q.notify({
        type: 'negative',
        message: 'Erreur lors de la suppression',
        timeout: 2000,
      })
    }
  })
}

const handleClearAllSWCaches = () => {
  $q.dialog({
    title: 'Vider tous les caches SW',
    message: 'Êtes-vous sûr de vouloir vider tous les caches du Service Worker ?',
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    try {
      const registration = await navigator.serviceWorker.ready
      if (!registration.active) return

      const messageChannel = new MessageChannel()
      messageChannel.port1.onmessage = (event) => {
        if (event.data?.success) {
          $q.notify({
            type: 'positive',
            message: 'Tous les caches SW vidés',
            timeout: 2000,
          })
          emit('refresh-caches')
        }
      }

      registration.active.postMessage({ type: 'CLEAR_ALL_CACHES' }, [messageChannel.port2])
    } catch (error) {
      logger.error('Erreur suppression caches SW:', error)
      $q.notify({
        type: 'negative',
        message: 'Erreur lors de la suppression',
        timeout: 2000,
      })
    }
  })
}

const handleReregisterSW = async () => {
  $q.dialog({
    title: 'Réenregistrer le Service Worker',
    message: 'Cela va désenregistrer tous les SW existants et recharger la page. Continuer ?',
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations()
        for (const registration of registrations) {
          await registration.unregister()
          logger.log('SW désenregistré:', registration.scope)
        }

        $q.notify({
          type: 'positive',
          message: 'Service Worker désenregistré, rechargement...',
          timeout: 1500,
        })

        setTimeout(() => window.location.reload(), 1500)
      }
    } catch (error) {
      logger.error('Erreur lors du réenregistrement:', error)
      $q.notify({
        type: 'negative',
        message: 'Erreur lors du réenregistrement du Service Worker',
        caption: error.message,
        icon: 'error',
        timeout: 3000,
      })
    }
  })
}
</script>
