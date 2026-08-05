import { computed, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useRoute, useRouter } from 'vue-router'

/**
 * Composable pour piloter l'onglet actif d'une page à onglets via la query `?tab=`.
 *
 * Permet des raccourcis directs (ex. /preparation?tab=perf, /rex-ffa?tab=soumission)
 * et garde l'URL partageable sans empiler l'historique (router.replace).
 *
 * - Query → onglet : navigation depuis un raccourci du menu ou une redirection.
 *   Une query absente ou invalide ramène sur l'onglet par défaut (ainsi, cliquer
 *   l'entrée de menu vers la route nue alors que la page est déjà affichée
 *   revient bien à l'onglet par défaut au lieu de paraître sans effet).
 * - Onglet → query : chaque changement d'onglet met l'URL à jour.
 *
 * @param {Array<{name: string}>} tabs - Déclaration des onglets (au moins `name`)
 * @param {string} defaultTab - Onglet actif quand `?tab=` est absent ou invalide
 * @param {object} [options]
 * @param {number} [options.labelsMinWidth=600] - Largeur d'écran (px) en dessous
 *   de laquelle on masque les libellés (icônes seules + tooltip). Le défaut
 *   correspond au seuil `gt.xs` de Quasar ; une page avec peu d'onglets courts
 *   peut l'abaisser pour garder les libellés plus longtemps.
 * @returns {{ tab: import('vue').Ref<string>, showLabels: import('vue').ComputedRef<boolean> }}
 */
export function useTabQuerySync(tabs, defaultTab, { labelsMinWidth = 600 } = {}) {
  const $q = useQuasar()
  const route = useRoute()
  const router = useRouter()

  const validTabs = tabs.map((t) => t.name)

  // Icônes seules (libellés en tooltip) sous le seuil, pour gagner de la place
  // quand les onglets se recouvriraient.
  const showLabels = computed(() => $q.screen.width >= labelsMinWidth)

  const tab = ref(validTabs.includes(route.query.tab) ? route.query.tab : defaultTab)

  // Chemin de la page : les watchers de route se déclenchent aussi pendant la
  // navigation VERS une autre page (query.tab devient undefined avant le
  // démontage) — sans ce garde, le fallback ré-écrirait `?tab=` sur la
  // route de destination.
  const basePath = route.path

  // Query → onglet (navigation depuis un raccourci du menu / une redirection).
  watch(
    () => route.query.tab,
    (val) => {
      if (route.path !== basePath) return
      const target = validTabs.includes(val) ? val : defaultTab
      if (target !== tab.value) {
        tab.value = target
      }
    },
  )

  // Onglet → query (garde l'URL partageable, sans empiler l'historique).
  watch(tab, (val) => {
    if (route.query.tab !== val) {
      router.replace({ query: { ...route.query, tab: val } })
    }
  })

  return { tab, showLabels }
}
