<template>
  <q-page class="q-pa-md">
    <div class="q-mt-lg q-mb-xl text-center">
      <div class="text-h3 text-white text-weight-bold">Notifications</div>
      <div class="text-subtitle2 text-white q-mt-xs flex items-center justify-center">
        Recevez des alertes en temps réel pour les événements importants (NOTAM, AZBA).
      </div>
    </div>

    <div class="q-mb-md">
      <!-- État: Non installé -->
      <q-card v-if="notificationSupport === 'not-installed'" class="q-mb-md">
        <q-card-section class="bg-info text-white">
          <div class="text-h6">
            <q-icon name="info" class="q-mr-sm" />
            Installation requise
          </div>
        </q-card-section>
        <q-card-section>
          <p>
            Pour recevoir des notifications push, vous devez d'abord installer l'application
            {{ CLUB_CONFIG.app.name }} sur votre écran d'accueil.
          </p>

          <div class="q-mt-md">
            <div class="text-weight-bold q-mb-sm">Sur iOS (iPhone/iPad) :</div>
            <ol class="q-pl-md">
              <li>Ouvrez Safari et accédez à {{ CLUB_CONFIG.app.name }}</li>
              <li>
                Appuyez sur le bouton
                <q-icon name="ios_share" size="20px" />
                Partager
              </li>
              <li>Sélectionnez "Sur l'écran d'accueil"</li>
              <li>Confirmez l'ajout</li>
            </ol>
          </div>

          <div class="q-mt-md">
            <div class="text-weight-bold q-mb-sm">Sur Android :</div>
            <ol class="q-pl-md">
              <li>Ouvrez Chrome et accédez à {{ CLUB_CONFIG.app.name }}</li>
              <li>Appuyez sur le menu ⋮ (trois points)</li>
              <li>Sélectionnez "Installer l'application"</li>
              <li>Confirmez l'installation</li>
            </ol>
          </div>

          <q-banner class="bg-grey-3 q-mt-md" rounded>
            <template v-slot:avatar>
              <q-icon name="lightbulb" color="primary" />
            </template>
            Une fois installée, revenez sur cette page pour activer les notifications.
          </q-banner>
        </q-card-section>
      </q-card>

      <!-- État: Incompatible -->
      <q-card v-else-if="notificationSupport === 'incompatible'" class="q-mb-md">
        <q-card-section class="bg-grey-7 text-white">
          <div class="text-h6">
            <q-icon name="error_outline" class="q-mr-sm" />
            Notifications non supportées
          </div>
        </q-card-section>
        <q-card-section>
          <p>
            Votre navigateur ne supporte pas les notifications push. Essayez d'utiliser un
            navigateur moderne comme Chrome, Firefox, Safari ou Edge.
          </p>
        </q-card-section>
      </q-card>

      <!-- État: Bloqué -->
      <q-card v-else-if="permissionStatus === 'denied'" class="q-mb-md">
        <q-card-section class="bg-negative text-white">
          <div class="text-h6">
            <q-icon name="notifications_off" class="q-mr-sm" />
            Notifications bloquées
          </div>
        </q-card-section>
        <q-card-section>
          <p>
            Vous avez précédemment bloqué les notifications pour {{ CLUB_CONFIG.app.name }}. Pour
            les réactiver,
            vous devez modifier les paramètres de votre navigateur ou système.
          </p>

          <div class="q-mt-md">
            <div class="text-weight-bold q-mb-sm">Sur iOS :</div>
            <ol class="q-pl-md">
              <li>Ouvrez l'app Réglages</li>
              <li>Allez dans Notifications</li>
              <li>Trouvez « {{ CLUB_CONFIG.app.name }} » dans la liste</li>
              <li>Activez "Autoriser les notifications"</li>
            </ol>
          </div>

          <div class="q-mt-md">
            <div class="text-weight-bold q-mb-sm">Sur Android :</div>
            <ol class="q-pl-md">
              <li>Appuyez longuement sur l'icône de l'app</li>
              <li>Sélectionnez "Infos sur l'application"</li>
              <li>Allez dans Notifications</li>
              <li>Activez les notifications</li>
            </ol>
          </div>

          <div class="q-mt-md">
            <div class="text-weight-bold q-mb-sm">Sur navigateur (Chrome/Firefox) :</div>
            <ol class="q-pl-md">
              <li>Cliquez sur l'icône de cadenas 🔒 dans la barre d'adresse</li>
              <li>Trouvez "Notifications" dans les paramètres du site</li>
              <li>Changez de "Bloquer" à "Autoriser"</li>
              <li>Rechargez la page</li>
            </ol>
          </div>

          <q-btn
            color="primary"
            label="Vérifier à nouveau"
            class="q-mt-md"
            @click="checkPermissions"
          />
        </q-card-section>
      </q-card>

      <!-- État: Prêt ou Default -->
      <template v-else>
        <!-- Statut actuel -->
        <q-card class="q-mb-md">
          <q-card-section>
            <div class="row items-center">
              <div class="col">
                <div class="text-h6">Statut des notifications</div>
              </div>
              <div class="col-auto">
                <q-chip
                  :color="permissionStatus === 'granted' ? 'positive' : 'warning'"
                  text-color="white"
                  :icon="permissionStatus === 'granted' ? 'check_circle' : 'warning'"
                >
                  {{ permissionStatus === 'granted' ? 'Activées' : 'Non configurées' }}
                </q-chip>
              </div>
            </div>
          </q-card-section>

          <q-separator />

          <q-card-section v-if="permissionStatus !== 'granted'">
            <p class="q-mb-md">
              Autorisez les notifications pour recevoir des alertes en temps réel sur votre
              appareil.
            </p>
            <q-btn
              color="primary"
              icon="notifications_active"
              label="Activer les notifications"
              @click="requestNotificationPermission"
              :loading="isRequesting"
            />
          </q-card-section>

          <q-card-section v-else>
            <div class="text-positive q-mb-sm">
              <q-icon name="check_circle" class="q-mr-xs" />
              Les notifications sont activées !
            </div>
            <p class="text-caption text-grey-7">
              Vous recevrez des alertes pour les topics auxquels vous êtes abonné.
            </p>

            <q-btn
              outline
              color="primary"
              icon="notification_important"
              label="Envoyer une notification de test"
              class="q-mt-sm"
              @click="sendTest"
            />
          </q-card-section>
        </q-card>

        <!-- Gestion des topics -->
        <q-card v-if="permissionStatus === 'granted'">
          <q-card-section>
            <div class="text-h6 q-mb-md">Abonnements</div>
            <p class="text-caption text-grey-7 q-mb-md">
              Choisissez les types d'événements pour lesquels vous souhaitez recevoir des
              notifications.
            </p>

            <q-list>
              <q-item
                v-for="topic in availableTopics"
                :key="topic.id"
                tag="label"
                clickable
                v-ripple
              >
                <q-item-section avatar>
                  <q-checkbox
                    :model-value="isSubscribedToTopic(topic.id)"
                    @update:model-value="toggleTopic(topic.id)"
                    color="primary"
                  />
                </q-item-section>
                <q-item-section>
                  <q-item-label>{{ topic.label }}</q-item-label>
                  <q-item-label caption>{{ topic.description }}</q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </q-card-section>
        </q-card>
      </template>

      <!-- Informations complémentaires -->
      <q-card class="q-mt-md bg-grey-2">
        <q-card-section>
          <div class="text-subtitle2 q-mb-sm">
            <q-icon name="help_outline" class="q-mr-xs" />
            À propos des notifications
          </div>
          <ul class="q-pl-md text-caption">
            <li>Les notifications sont envoyées uniquement pour les événements importants</li>
            <li>Vous pouvez vous désabonner à tout moment</li>
            <li>Les notifications fonctionnent même quand l'application est fermée</li>
            <li>Cliquer sur une notification vous redirige vers la page concernée</li>
          </ul>
        </q-card-section>
      </q-card>
    </div>
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useNotificationStore } from '../stores/notificationStore'
import { logger } from '../utils/logger'
import { CLUB_CONFIG } from '../config/club.config'

const store = useNotificationStore()
const isRequesting = ref(false)

const notificationSupport = computed(() => store.notificationSupport)
const permissionStatus = computed(() => store.permissionStatus)
const availableTopics = computed(() => store.availableTopics)

onMounted(() => {
  store.initialize()
})

async function requestNotificationPermission() {
  isRequesting.value = true
  try {
    logger.log('🔄 Demande de permission de notification depuis la page Paramètres')
    await store.requestPermission()
    logger.log('✅ Permission de notification traitée')
  } catch (error) {
    logger.error('❌ Erreur lors de la demande de permission:', error)
    logger.error('Type:', error.name)
    logger.error('Message:', error.message)
  } finally {
    isRequesting.value = false
  }
}

function checkPermissions() {
  logger.log('🔄 Vérification des permissions...')
  store.initialize()
  logger.log('✅ Vérification terminée')
}

function isSubscribedToTopic(topicId) {
  return store.isSubscribedToTopic(topicId)
}

async function toggleTopic(topicId) {
  logger.log(`🔄 Toggle topic: ${topicId}`)
  try {
    if (isSubscribedToTopic(topicId)) {
      await store.unsubscribeFromTopic(topicId)
    } else {
      await store.subscribeToTopic(topicId)
    }
  } catch (error) {
    logger.error('❌ Erreur lors du toggle du topic:', error)
  }
}

function sendTest() {
  logger.log("🔔 Envoi d'une notification de test")
  try {
    store.sendTestNotification()
    logger.log('✅ Notification de test envoyée')
  } catch (error) {
    logger.error("❌ Erreur lors de l'envoi de la notification de test:", error)
  }
}
</script>

<style scoped>
ol {
  line-height: 1.8;
}
</style>
