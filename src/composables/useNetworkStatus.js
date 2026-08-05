import { onMounted, onUnmounted, ref } from 'vue'

/**
 * Suivi d'état réseau (online/offline) avec horodatage.
 */
export function useNetworkStatus() {
  const initialOnline = typeof navigator === 'undefined' ? true : navigator.onLine
  const isOnline = ref(initialOnline)
  const lastOfflineAt = ref(initialOnline ? null : new Date().toISOString())
  const lastOnlineAt = ref(initialOnline ? new Date().toISOString() : null)

  const handleOnline = () => {
    isOnline.value = true
    lastOnlineAt.value = new Date().toISOString()
  }

  const handleOffline = () => {
    isOnline.value = false
    lastOfflineAt.value = new Date().toISOString()
  }

  onMounted(() => {
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
  })

  onUnmounted(() => {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
  })

  return {
    isOnline,
    lastOfflineAt,
    lastOnlineAt,
  }
}
