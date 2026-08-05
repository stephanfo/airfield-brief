/**
 * Store Pinia pour la gestion des cartes TEMSI
 * Utilise la factory createChartStore pour éviter la duplication avec wintemStore
 */

import { createChartStore } from './createChartStore'

export const useTemsiStore = createChartStore(
  'temsi',
  'temsi',
  'temsiList',
  {
    list: 'temsiList',
    load: 'loadTemsi',
  },
  'TEMSI',
)
