/**
 * Store Pinia pour la gestion des cartes WINTEM
 * Utilise la factory createChartStore pour éviter la duplication avec temsiStore
 */

import { createChartStore } from './createChartStore'

export const useWintemStore = createChartStore(
  'wintem',
  'wintem',
  'wintemList',
  {
    list: 'wintemList',
    load: 'loadWintem',
  },
  'WINTEM',
)
