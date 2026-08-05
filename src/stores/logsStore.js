import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { logger } from '../utils/logger'
import { copyToClipboard } from 'quasar'

const MAX_LOGS_PER_SOURCE = 100

// Handler actif sur navigator.serviceWorker — module-level pour garantir
// un seul listener même si le store est recréé (tests, HMR).
let activeSWMessageHandler = null

/**
 * Sérialise un argument de façon sûre (gère les références circulaires et les erreurs)
 * @param {any} arg - Valeur à sérialiser
 * @returns {string}
 */
function safeStringify(arg) {
  if (typeof arg !== 'object' || arg === null) return String(arg)
  if (arg instanceof Error) return `${arg.name}: ${arg.message}`
  try {
    return JSON.stringify(arg)
  } catch {
    return '[Object non sérialisable]'
  }
}

export const useLogsStore = defineStore('logsStore', () => {
  // ========== STATE ==========
  const logs = ref([])
  const swLoggingEnabled = ref(false)

  // Intercepter les console.log/warn/error de l'application
  const originalLogger = {
    log: logger.log,
    warn: logger.warn,
    error: logger.error,
  }

  // ========== PRIVATE METHODS ==========
  const trimLogsBySource = (source) => {
    const sourceLogs = logs.value.filter((log) => log.source === source)
    if (sourceLogs.length > MAX_LOGS_PER_SOURCE) {
      const excessCount = sourceLogs.length - MAX_LOGS_PER_SOURCE
      // Supprimer les plus anciens de cette source
      const oldestIds = sourceLogs.slice(0, excessCount).map((log) => log.id)

      logs.value = logs.value.filter((log) => !oldestIds.includes(log.id))
    }
  }

  // ========== ACTIONS ==========
  const addLog = (entry) => {
    const logEntry = {
      id: Date.now() + Math.random(), // ID unique
      timestamp: entry.timestamp || Date.now(),
      type: entry.type || 'log', // 'log' | 'warn' | 'error'
      message: entry.message || '',
      source: entry.source || 'app', // 'app' | 'sw'
      args: entry.args || [],
    }

    logs.value.push(logEntry)
    trimLogsBySource(logEntry.source)
  }

  const clearLogs = () => {
    logs.value = []
  }

  const copyLogsToClipboard = async () => {
    const formatted = logs.value
      .map((log) => {
        const timestamp = new Date(log.timestamp).toLocaleTimeString('fr-FR')
        const source = log.source.toUpperCase()
        const type = log.type.toUpperCase()
        return `[${timestamp}] [${source}] [${type}] ${log.message}`
      })
      .join('\n')

    try {
      await copyToClipboard(formatted)
      return true
    } catch (error) {
      logger.error('Erreur copie logs:', error)
      return false
    }
  }

  const enableSWLogging = () => {
    swLoggingEnabled.value = true
    // Notifier le Service Worker
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'ENABLE_LOGGING',
      })
    }
  }

  const disableSWLogging = () => {
    swLoggingEnabled.value = false
    // Notifier le Service Worker
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'DISABLE_LOGGING',
      })
    }
    // Supprimer les logs SW existants
    logs.value = logs.value.filter((log) => log.source !== 'sw')
  }

  const toggleSWLogging = () => {
    if (swLoggingEnabled.value) {
      disableSWLogging()
    } else {
      enableSWLogging()
    }
  }

  // ========== COMPUTED ==========
  const appLogs = computed(() => logs.value.filter((log) => log.source === 'app'))
  const swLogs = computed(() => logs.value.filter((log) => log.source === 'sw'))
  const errorCount = computed(() => logs.value.filter((log) => log.type === 'error').length)
  const warnCount = computed(() => logs.value.filter((log) => log.type === 'warn').length)

  // ========== INTERCEPTION CONSOLE ==========
  const startInterception = () => {
    // Wrapper pour console.log
    logger.log = (...args) => {
      originalLogger.log(...args)
      addLog({
        type: 'log',
        message: args.map(safeStringify).join(' '),
        source: 'app',
        args,
      })
    }

    // Wrapper pour console.warn
    logger.warn = (...args) => {
      originalLogger.warn(...args)
      addLog({
        type: 'warn',
        message: args.map(safeStringify).join(' '),
        source: 'app',
        args,
      })
    }

    // Wrapper pour console.error
    logger.error = (...args) => {
      originalLogger.error(...args)
      addLog({
        type: 'error',
        message: args.map(safeStringify).join(' '),
        source: 'app',
        args,
      })
    }
  }

  const stopInterception = () => {
    logger.log = originalLogger.log
    logger.warn = originalLogger.warn
    logger.error = originalLogger.error
  }

  // ========== MESSAGE LISTENER (pour logs SW) ==========
  const handleSWMessage = (event) => {
    const { type, payload } = event.data || {}

    if (type === 'SW_LOG' && swLoggingEnabled.value) {
      addLog({
        type: payload.type || 'log',
        message: payload.message || '',
        source: 'sw',
        timestamp: payload.timestamp,
        args: payload.args || [],
      })
    }
  }

  // Écouter les messages du Service Worker (idempotent : remplace le
  // listener d'une éventuelle instance précédente du store)
  if ('serviceWorker' in navigator) {
    if (activeSWMessageHandler) {
      navigator.serviceWorker.removeEventListener('message', activeSWMessageHandler)
    }
    activeSWMessageHandler = handleSWMessage
    navigator.serviceWorker.addEventListener('message', handleSWMessage)
  }

  return {
    // State
    logs,
    swLoggingEnabled,

    // Computed
    appLogs,
    swLogs,
    errorCount,
    warnCount,

    // Actions
    addLog,
    clearLogs,
    copyLogsToClipboard,
    enableSWLogging,
    disableSWLogging,
    toggleSWLogging,
    startInterception,
    stopInterception,
  }
})
