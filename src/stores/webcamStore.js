import { defineStore } from 'pinia'
import { computed } from 'vue'
import { useDataFetcher } from '../composables/useDataFetcher'
import { WEBCAM_CONFIG } from '../config/app.config'

/**
 * Store webcam timelapse : liste des images de la dernière heure servie par
 * `images.php` (app Cam Aéroclub, voir Cam/doc/TECHNIQUE.md §4).
 *
 * Particularités vs les autres stores :
 * - Endpoint **cross-origin** (CORS ajouté côté Cam) et non un JSON statique local.
 * - Les `url` du JSON sont **relatives** à la page Cam → préfixées par `baseUrl`.
 * - La fraîcheur est calculée à partir de l'horloge **serveur** (`now`/`last_ts`)
 *   et non de l'horloge locale : la liste embarque son propre `now`, donc le
 *   décalage d'horloge client n'intervient pas (cf. warning « image périmée »).
 */
export const useWebcamStore = defineStore('webcam', () => {
  const {
    data: rawData,
    fetchData,
    refetch,
    invalidate,
    loading,
    error,
    isRefreshing,
    lastFetchedAt,
  } = useDataFetcher(WEBCAM_CONFIG.imagesUrl, {
    ttl: WEBCAM_CONFIG.imagesRefreshInterval,
    staleWhileRevalidate: true,
    deduplicate: true,
    errorLabel: 'webcam',
  })

  /**
   * Images de la dernière heure, anciennes → récentes, avec `url` absolue.
   * @type {import('vue').ComputedRef<Array<{url: string, ts: number, time: string}>>}
   */
  const images = computed(() =>
    (rawData.value?.images || []).map((img) => ({
      ...img,
      url: img.url?.startsWith('http') ? img.url : `${WEBCAM_CONFIG.baseUrl}${img.url}`,
    })),
  )

  /** Epoch (s) de la dernière image disponible, selon le serveur. */
  const lastTs = computed(() => rawData.value?.last_ts ?? null)

  /**
   * Horodatage ISO de la dernière image, dérivé de `last_ts` (epoch serveur).
   * Alimente les composants partagés de fraîcheur (UpdateStatusIndicator /
   * StaleDataBanner) comme les autres pages datées de l'app. Le seuil de
   * péremption « caméra hors ligne » est `WEBCAM_CONFIG.staleThreshold` (5 min).
   */
  const lastImageAt = computed(() =>
    lastTs.value == null ? null : new Date(lastTs.value * 1000).toISOString(),
  )

  const loadImages = () => fetchData()
  const forceRefresh = () => refetch()

  return {
    rawData,
    images,
    lastTs,
    lastImageAt,
    loading,
    error,
    isRefreshing,
    lastFetchedAt,
    loadImages,
    forceRefresh,
    invalidate,
  }
})
