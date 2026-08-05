<template>
  <q-card class="logs-console">
    <q-card-section>
      <div class="text-h6 flex items-center">
        <q-icon name="terminal" class="q-mr-sm" />
        Console de Logs
      </div>

      <div class="row justify-center q-mt-md q-gutter-md">
        <!-- Groupe APP/SW -->
        <q-btn-group outline>
          <q-btn
            :outline="!showApp"
            :unelevated="showApp"
            :color="showApp ? 'primary' : 'grey'"
            label="App"
            @click="showApp = !showApp"
          >
            <q-badge v-if="appLogsCount > 0" color="white" text-color="primary" floating>
              {{ appLogsCount }}
            </q-badge>
          </q-btn>

          <q-btn
            :outline="!showSW"
            :unelevated="showSW"
            :color="showSW ? 'accent' : 'grey'"
            label="SW"
            @click="showSW = !showSW"
            :disable="!swLoggingEnabled"
          >
            <q-badge v-if="swLogsCount > 0" color="white" text-color="accent" floating>
              {{ swLogsCount }}
            </q-badge>
          </q-btn>
        </q-btn-group>

        <!-- Groupe 3 niveaux de log -->
        <q-btn-group outline>
          <q-btn
            :outline="!showLog"
            :unelevated="showLog"
            :color="showLog ? 'positive' : 'grey'"
            icon="info"
            @click="showLog = !showLog"
          >
            <q-tooltip>Logs</q-tooltip>
            <q-badge v-if="logCount > 0" color="white" text-color="positive" floating>
              {{ logCount }}
            </q-badge>
          </q-btn>

          <q-btn
            :outline="!showWarn"
            :unelevated="showWarn"
            :color="showWarn ? 'warning' : 'grey'"
            icon="warning"
            @click="showWarn = !showWarn"
          >
            <q-tooltip>Warnings</q-tooltip>
            <q-badge v-if="warnCount > 0" color="dark" text-color="warning" floating>
              {{ warnCount }}
            </q-badge>
          </q-btn>

          <q-btn
            :outline="!showError"
            :unelevated="showError"
            :color="showError ? 'negative' : 'grey'"
            icon="error"
            @click="showError = !showError"
          >
            <q-tooltip>Erreurs</q-tooltip>
            <q-badge v-if="errorCount > 0" color="white" text-color="negative" floating>
              {{ errorCount }}
            </q-badge>
          </q-btn>
        </q-btn-group>

        <!-- Groupe Copy/Delete -->
        <q-btn-group outline>
          <q-btn icon="content_copy" color="primary" @click="handleCopyLogs">
            <q-tooltip>Copier les logs</q-tooltip>
          </q-btn>

          <q-btn icon="delete" color="negative" @click="handleClearLogs">
            <q-tooltip>Vider les logs</q-tooltip>
          </q-btn>
        </q-btn-group>
      </div>
    </q-card-section>

    <q-separator />

    <q-card-section class="logs-container bg-white" style="height: 600px; padding: 0">
      <q-virtual-scroll
        :items="filteredLogs"
        virtual-scroll-item-size="30"
        style="height: 100%"
        class="q-pa-sm"
      >
        <template v-slot="{ item }">
          <div :class="getLogClass(item)" class="log-entry q-py-xs q-px-sm">
            <span class="log-timestamp">
              {{ formatTimestamp(item.timestamp) }}
            </span>
            <span :class="getSourceClass(item.source)" class="log-source q-mx-sm">
              [{{ item.source.toUpperCase() }}]
            </span>
            <span :class="getTypeClass(item.type)" class="log-type">
              [{{ item.type.toUpperCase() }}]
            </span>
            <span class="log-message q-ml-sm" :class="getMessageClass(item.type)">
              {{ item.message }}
            </span>
          </div>
        </template>
      </q-virtual-scroll>

      <div v-if="filteredLogs.length === 0" class="text-center q-pa-md text-grey-7">
        <q-icon name="info" size="md" class="q-mb-sm" />
        <div>Aucun log à afficher</div>
        <div v-if="!swLoggingEnabled && !showApp" class="text-caption q-mt-sm">
          Activez le logging du Service Worker dans les paramètres ci-dessus
        </div>
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useLogsStore } from '../../stores/logsStore'
import { storeToRefs } from 'pinia'
import { Notify } from 'quasar'

// ========== STORE ==========
const logsStore = useLogsStore()
const { logs, swLoggingEnabled, appLogs, swLogs, errorCount, warnCount } = storeToRefs(logsStore)

// ========== STATE ==========
const showApp = ref(true)
const showSW = ref(true)
const showLog = ref(true)
const showWarn = ref(true)
const showError = ref(true)

// ========== COMPUTED ==========
const filteredLogs = computed(() => {
  return logs.value.filter((log) => {
    // Filtre par source
    const sourceMatch =
      (showApp.value && log.source === 'app') || (showSW.value && log.source === 'sw')

    // Filtre par type
    const typeMatch =
      (showLog.value && log.type === 'log') ||
      (showWarn.value && log.type === 'warn') ||
      (showError.value && log.type === 'error')

    return sourceMatch && typeMatch
  })
})

const appLogsCount = computed(() => appLogs.value.length)
const swLogsCount = computed(() => swLogs.value.length)
const logCount = computed(() => logs.value.filter((log) => log.type === 'log').length)

// ========== METHODS ==========
const formatTimestamp = (timestamp) => {
  return new Date(timestamp).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3,
  })
}

const getLogClass = (log) => {
  return {
    'log-log': log.type === 'log',
    'log-warn': log.type === 'warn',
    'log-error': log.type === 'error',
  }
}

const getSourceClass = (source) => {
  return source === 'app' ? 'text-primary' : 'text-accent'
}

const getTypeClass = (type) => {
  return {
    'text-positive': type === 'log',
    'text-warning': type === 'warn',
    'text-negative': type === 'error',
  }
}

const getMessageClass = () => {
  return {}
}

const handleCopyLogs = async () => {
  const success = await logsStore.copyLogsToClipboard()
  if (success) {
    Notify.create({
      type: 'positive',
      message: `${logs.value.length} logs copiés dans le presse-papier`,
      position: 'top',
      timeout: 2000,
    })
  } else {
    Notify.create({
      type: 'negative',
      message: 'Erreur lors de la copie des logs',
      position: 'top',
      timeout: 2000,
    })
  }
}

const handleClearLogs = () => {
  logsStore.clearLogs()
  Notify.create({
    type: 'info',
    message: 'Logs vidés',
    position: 'top',
    timeout: 1500,
  })
}
</script>

<style scoped lang="scss">
.logs-container {
  overflow: hidden;
  font-family: 'Courier New', monospace;
  font-size: 12px;
}

.log-entry {
  border-left: 3px solid transparent;
  transition: background-color 0.2s;
  color: #000;

  &:hover {
    background-color: rgba(0, 0, 0, 0.03);
  }

  &.log-log {
    border-left-color: var(--q-positive);
  }

  &.log-warn {
    border-left-color: var(--q-warning);
    background-color: rgba(255, 193, 7, 0.08);
  }

  &.log-error {
    border-left-color: var(--q-negative);
    background-color: rgba(244, 67, 54, 0.08);
  }
}

.log-timestamp {
  min-width: 100px;
  display: inline-block;
  color: #666;
}

.log-source {
  font-weight: bold;
  min-width: 50px;
  display: inline-block;
}

.log-type {
  font-weight: bold;
  min-width: 60px;
  display: inline-block;
}

.log-message {
  word-break: break-all;
  color: #000;
}
</style>
