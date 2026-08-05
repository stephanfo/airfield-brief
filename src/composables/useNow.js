import { onMounted, onUnmounted, ref } from 'vue'

/**
 * Horloge réactive : expose l'instant courant (epoch ms) rafraîchi périodiquement.
 * Utilisé pour les comptes à rebours (ex. temps avant la nuit aéronautique).
 *
 * @param {number} [intervalMs=30000] - Période de rafraîchissement (défaut 30 s,
 *   suffisant pour un décompte à la minute).
 * @returns {import('vue').Ref<number>} Référence réactive vers Date.now().
 */
export function useNow(intervalMs = 30000) {
  const now = ref(Date.now())
  let id = null

  onMounted(() => {
    id = setInterval(() => {
      now.value = Date.now()
    }, intervalMs)
  })

  onUnmounted(() => {
    if (id !== null) clearInterval(id)
  })

  return now
}
