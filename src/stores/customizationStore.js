import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { isFeatureEnabled } from '../config/features'
import { logger } from '../utils/logger'
import { STORAGE_KEYS } from '../config/storageKeys'

/**
 * Store pour gérer la personnalisation de l'interface utilisateur
 * Stockage local uniquement (localStorage)
 */
export const useCustomizationStore = defineStore('customization', () => {
  // Définition des items disponibles dans le menu bas (ordre par défaut).
  // `feature` rattache un item à un module optionnel (ADR-030) : désactivé dans
  // `club.config.js`, l'item n'apparaît ni dans le menu ni dans la page de
  // personnalisation. Les liens externes (Aerogest, REX FFA…) restent utiles
  // même sans le module interne correspondant : ils ne sont pas tagués.
  const allMenuItems = [
    { id: 'home', label: 'Accueil', icon: 'home', route: '/', defaultVisible: true },
    { id: 'weather', label: 'Météo IA', icon: 'cloud', route: '/weather', defaultVisible: true },
    {
      id: 'station',
      label: 'Station Locale',
      icon: 'sensors',
      route: '/station',
      defaultVisible: false,
      feature: 'station',
    },
    {
      id: 'stress-thermique',
      label: 'Stress Thermique',
      icon: 'device_thermostat',
      route: '/stress-thermique',
      defaultVisible: false,
      feature: 'thermal',
    },
    {
      id: 'ephemerides',
      label: 'Éphémérides',
      icon: 'wb_twilight',
      route: '/ephemerides',
      defaultVisible: false,
    },
    {
      id: 'webcam',
      label: 'Webcam',
      icon: 'videocam',
      route: '/webcam',
      defaultVisible: false,
      feature: 'webcam',
    },
    { id: 'temsi', label: 'TEMSI', icon: 'map', route: '/temsi', defaultVisible: false },
    { id: 'wintem', label: 'WINTEM', icon: 'air', route: '/wintem', defaultVisible: false },
    { id: 'azba', label: 'AZBA', icon: 'dangerous', route: '/azba', defaultVisible: true },
    { id: 'notam', label: 'NOTAM', icon: 'description', route: '/notam', defaultVisible: true },
    { id: 'vac', label: 'VAC', icon: 'flight_land', route: '/vac', defaultVisible: true },
    {
      id: 'preparation',
      label: 'Préparation',
      icon: 'flight_takeoff',
      route: '/preparation',
      defaultVisible: false,
      feature: 'aircraft',
    },
    // Raccourcis directs vers les onglets de la page Préparation vol.
    {
      id: 'preparation-centrage',
      label: 'Centrage',
      icon: 'balance',
      route: '/preparation?tab=centrage',
      defaultVisible: false,
      parentId: 'preparation',
      feature: 'aircraft',
    },
    {
      id: 'preparation-carburant',
      label: 'Carburant',
      icon: 'local_gas_station',
      route: '/preparation?tab=carburant',
      defaultVisible: false,
      parentId: 'preparation',
      feature: 'aircraft',
    },
    {
      id: 'preparation-perf',
      label: 'Perfos',
      icon: 'speed',
      route: '/preparation?tab=perf',
      defaultVisible: false,
      parentId: 'preparation',
      feature: 'aircraft',
    },
    {
      id: 'preparation-checklist',
      label: 'Check-list',
      icon: 'checklist',
      route: '/preparation?tab=checklist',
      defaultVisible: false,
      parentId: 'preparation',
      feature: 'aircraft',
    },
    {
      id: 'preparation-urgence',
      label: 'Urgence & secours',
      icon: 'warning',
      route: '/preparation?tab=urgence',
      defaultVisible: false,
      parentId: 'preparation',
      feature: 'aircraft',
    },
    {
      id: 'preparation-tarif',
      label: 'Tarif',
      icon: 'euro',
      route: '/preparation?tab=tarif',
      defaultVisible: false,
      parentId: 'preparation',
      feature: 'aircraft',
    },
    {
      id: 'rex-ffa-club',
      label: 'REX Sécurité',
      icon: 'health_and_safety',
      route: '/rex-ffa',
      defaultVisible: false,
      feature: 'rex',
    },
    {
      id: 'aerogest',
      label: 'Aerogest',
      icon: 'open_in_new',
      href: 'https://online.aerogest.fr/',
      defaultVisible: false,
      isExternal: true,
    },
    {
      id: 'meteo-aviation',
      label: 'Météo Aviation',
      icon: 'open_in_new',
      href: 'https://aviation.meteo.fr/',
      defaultVisible: false,
      isExternal: true,
    },
    {
      id: 'sia-azba',
      label: 'SIA AZBA',
      icon: 'open_in_new',
      href: 'https://www.sia.aviation-civile.gouv.fr/schedules',
      defaultVisible: false,
      isExternal: true,
    },
    {
      id: 'sofia',
      label: 'SOFIA Briefing',
      icon: 'open_in_new',
      href: 'https://sofia-briefing.aviation-civile.gouv.fr/sofia/pages/homepage.html',
      defaultVisible: false,
      isExternal: true,
    },
    {
      id: 'rex-ffa',
      label: 'REX FFA',
      icon: 'open_in_new',
      href: 'https://rex.ffa-aero.fr/',
      defaultVisible: false,
      isExternal: true,
    },
  ]

  // Seuls les items dont le module est actif sont exposés au reste de l'app.
  const availableMenuItems = allMenuItems.filter((item) => isFeatureEnabled(item.feature))

  // Config par défaut (tout item à sa visibilité par défaut)
  const defaultConfig = () =>
    availableMenuItems.map((item) => ({
      id: item.id,
      visible: item.defaultVisible,
    }))

  // Charger la config depuis localStorage ou utiliser les valeurs par défaut
  const loadConfig = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.MENU_CUSTOMIZATION)
      if (stored) {
        const parsed = JSON.parse(stored)
        // Vérifier que la structure est valide
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Migration : retirer les ids obsolètes, puis insérer les nouveaux
          // items (ex. Préparation et ses onglets) absents d'une config
          // sauvegardée avant leur introduction — à leur place dans l'ordre
          // source, juste après leur prédécesseur (VAC → Préparation → onglets).
          const merged = parsed.filter((c) => availableMenuItems.some((i) => i.id === c.id))
          availableMenuItems.forEach((item, index) => {
            if (merged.some((c) => c.id === item.id)) return
            // Chercher le prédécesseur connu le plus proche déjà dans merged.
            let insertAt = merged.length
            for (let i = index - 1; i >= 0; i--) {
              const pos = merged.findIndex((c) => c.id === availableMenuItems[i].id)
              if (pos !== -1) {
                insertAt = pos + 1
                break
              }
            }
            merged.splice(insertAt, 0, { id: item.id, visible: item.defaultVisible })
          })
          // Garantir le regroupement des sous-items sous leur parent.
          return normalizeGroups(merged)
        }
      }
    } catch (e) {
      logger.warn('Impossible de charger la configuration du menu:', e)
    }
    // Retourner la config par défaut
    return defaultConfig()
  }

  // État: configuration des items (visibilité)
  const menuConfig = ref(loadConfig())

  // État: afficher les labels sous les icônes
  const showLabels = ref(
    (() => {
      try {
        const stored = localStorage.getItem(STORAGE_KEYS.MENU_SHOW_LABELS)
        if (stored !== null) {
          return stored === 'true'
        }
      } catch (e) {
        logger.warn('Impossible de charger la préférence showLabels:', e)
      }
      return false // Par défaut: labels masqués
    })(),
  )

  // Sauvegarder automatiquement dans localStorage
  const saveConfig = () => {
    try {
      localStorage.setItem(STORAGE_KEYS.MENU_CUSTOMIZATION, JSON.stringify(menuConfig.value))
      localStorage.setItem(STORAGE_KEYS.MENU_SHOW_LABELS, showLabels.value.toString())
    } catch (e) {
      logger.warn('Impossible de sauvegarder la configuration du menu:', e)
    }
  }

  // Persister immédiatement la config (potentiellement migrée) au démarrage.
  saveConfig()

  // Computed: liste des items visibles dans le menu bas (dans l'ordre de menuConfig)
  const visibleMenuItems = computed(() => {
    // Construire la liste dans l'ordre de menuConfig
    const orderedItems = []
    for (const config of menuConfig.value) {
      if (config.visible) {
        const item = availableMenuItems.find((i) => i.id === config.id)
        if (item) {
          orderedItems.push(item)
        }
      }
    }
    return orderedItems
  })

  // Computed: liste ordonnée de tous les items (pour la personnalisation)
  const orderedMenuItems = computed(() => {
    const orderedItems = []
    for (const config of menuConfig.value) {
      const item = availableMenuItems.find((i) => i.id === config.id)
      if (item) {
        orderedItems.push({ ...item, visible: config.visible })
      }
    }
    return orderedItems
  })

  // Computed: le menu bas doit-il être affiché ?
  const isBottomMenuVisible = computed(() => visibleMenuItems.value.length > 0)

  /**
   * Change la visibilité d'un item
   * @param {string} itemId - ID de l'item
   * @param {boolean} visible - Nouvelle visibilité
   */
  function setItemVisibility(itemId, visible) {
    const config = menuConfig.value.find((c) => c.id === itemId)
    if (config) {
      config.visible = visible
    } else {
      menuConfig.value.push({ id: itemId, visible })
    }
    saveConfig()
  }

  /**
   * Affiche tous les items (préserve l'ordre courant)
   */
  function showAll() {
    menuConfig.value = menuConfig.value.map((c) => ({ ...c, visible: true }))
    saveConfig()
  }

  /**
   * Masque tous les items (préserve l'ordre courant)
   */
  function hideAll() {
    menuConfig.value = menuConfig.value.map((c) => ({ ...c, visible: false }))
    saveConfig()
  }

  /**
   * Réinitialise aux valeurs par défaut
   */
  function reset() {
    menuConfig.value = normalizeGroups(defaultConfig())
    saveConfig()
  }

  /**
   * Vérifie si un item est visible
   * @param {string} itemId - ID de l'item
   * @returns {boolean}
   */
  function isItemVisible(itemId) {
    const config = menuConfig.value.find((c) => c.id === itemId)
    if (config) {
      return config.visible
    }
    const item = availableMenuItems.find((i) => i.id === itemId)
    return item ? item.defaultVisible : false
  }

  /**
   * Lookup id → item source (pour connaître parentId).
   */
  function itemById(id) {
    return availableMenuItems.find((i) => i.id === id)
  }

  /**
   * Regroupe les sous-items juste sous leur parent.
   * Préserve l'ordre des parents et l'ordre relatif des enfants ; tout enfant
   * déplacé ailleurs « retombe » sous son parent. Garantit que les onglets de
   * Préparation restent collés sous Préparation après n'importe quel drag.
   * @param {Array} config - liste {id, visible}
   * @returns {Array} nouvelle liste regroupée
   */
  function normalizeGroups(config) {
    // Enfants par parent, dans l'ordre où ils apparaissent dans config.
    const childrenByParent = new Map()
    for (const c of config) {
      const parentId = itemById(c.id)?.parentId
      if (parentId) {
        if (!childrenByParent.has(parentId)) childrenByParent.set(parentId, [])
        childrenByParent.get(parentId).push(c)
      }
    }
    // Reconstruire : chaque parent suivi de ses enfants ; les enfants seuls
    // (parent absent de la liste) sont ignorés ici puis ré-ajoutés en fin.
    const placed = new Set()
    const result = []
    for (const c of config) {
      if (itemById(c.id)?.parentId) continue // enfant : placé via son parent
      result.push(c)
      placed.add(c.id)
      const kids = childrenByParent.get(c.id)
      if (kids) {
        for (const kid of kids) {
          result.push(kid)
          placed.add(kid.id)
        }
      }
    }
    // Filet de sécurité : enfants orphelins (parent absent) conservés en fin.
    for (const c of config) {
      if (!placed.has(c.id)) result.push(c)
    }
    return result
  }

  /**
   * Réorganise les items (drag & drop)
   * @param {number} oldIndex - Index de départ
   * @param {number} newIndex - Index d'arrivée
   */
  function reorderItems(oldIndex, newIndex) {
    const item = menuConfig.value.splice(oldIndex, 1)[0]
    menuConfig.value.splice(newIndex, 0, item)
    menuConfig.value = normalizeGroups(menuConfig.value)
    saveConfig()
  }

  /**
   * Active/désactive l'affichage des labels
   * @param {boolean} value - Nouvelle valeur
   */
  function setShowLabels(value) {
    showLabels.value = value
    saveConfig()
  }

  return {
    // État
    availableMenuItems,
    menuConfig,
    showLabels,

    // Computed
    visibleMenuItems,
    orderedMenuItems,
    isBottomMenuVisible,

    // Actions
    setItemVisibility,
    showAll,
    hideAll,
    reset,
    isItemVisible,
    reorderItems,
    setShowLabels,
  }
})
