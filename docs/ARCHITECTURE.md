# Architecture Technique - Portail LFFI

## 📋 Table des Matières

1. [Vue d'ensemble](#vue-densemble)
2. [Stack Technique](#stack-technique)
3. [Architecture](#architecture)
4. [Gestion d'État (Pinia)](#gestion-détat-pinia)
5. [Système de Cache](#système-de-cache)
6. [Composables](#composables)
7. [Structure des Données](#structure-des-données)
8. [Performance](#performance)
9. [Développement](#développement)

---

## Vue d'ensemble

Application web progressive (PWA) pour l'aérodrome d'Ancenis (LFFI) fournissant :

- 📢 NOTAMs en temps réel (AD + FIR)
- 🌤️ Météo aéronautique (METAR/TAF)
- 🗺️ Cartes TEMSI et WINTEM
- ⚠️ Statuts des zones AZBA

**Objectif** : Centraliser les informations aéronautiques critiques avec une UX optimale (mobile-first, offline-ready, temps réel).

---

## Stack Technique

### Core

- **Vue 3.5** - Composition API avec `<script setup>`
- **Quasar 2.16** - Framework UI Material Design
- **Pinia 3.x** - Gestion d'état (store centralisé)
- **Vue Router 4** - Navigation SPA

### Build & Dev

- **Vite** - Build tool (via @quasar/app-vite)
- **ESLint 9** - Linting JavaScript/Vue
- **Prettier 3** - Formatage de code

### Maps & Visualisation

- **Leaflet 1.9** - Cartes interactives
- **@vue-leaflet/vue-leaflet 0.10** - Intégration Vue 3

### PWA

- **Workbox 7.4** - Service Worker et stratégies de cache
- **register-service-worker** - Enregistrement SW

### Node & Packages

Versions exactes : voir `engines` dans `package.json` (source de vérité).

---

## Architecture

### Organisation des Dossiers

```
src/
├── boot/                  # Plugins Quasar (pinia)
├── components/            # Composants Vue
│   ├── charts/           # Affichage des cartes (ChartsList.vue)
│   ├── common/           # Composants partagés (UpdateStatusIndicator, WebcamCard)
│   ├── diagnostics/      # Diagnostic (LogsConsole.vue)
│   └── weather/          # Composants météo (MetarSection, TafSection, RunwayDisplay…)
├── composables/           # Logique réutilisable (voir `ls src/composables`)
│   ├── useCache.js       # ⭐ Système de cache TTL
│   ├── useDataFetcher.js # ⭐ Fetch avec cache & dédup
│   ├── useHiddenNotams.js / useSeenNotams.js # État NOTAM en localStorage
│   ├── useLocalStorageSet.js # Set persisté en localStorage
│   ├── useNetworkStatus.js   # Détection online/offline
│   ├── useVfrThresholds.js   # Seuils VFR (défauts + surcharge localStorage)
│   └── useVisibilityRefresh.js
├── config/                # Configuration centralisée
│   └── app.config.js     # Endpoints, intervalles, etc.
├── layouts/               # Layouts de page
├── pages/                 # Pages/Routes
│   ├── StatusPage.vue     # Page de diagnostic système
│   ├── NotificationSettings.vue # Gestion des notifications push
│   ├── CustomizationPage.vue    # Personnalisation menu
│   └── ...                # IndexPage, WeatherPage, NotamPage, AzbaPage, etc.
├── router/                # Configuration routing
├── services/              # Services métier
│   └── metarTranslations.js # ~900 lignes de traductions Q-codes
├── stores/                # ⭐ Stores Pinia
│   ├── azbaStore.js
│   ├── createChartStore.js  # Factory pour stores TEMSI/WINTEM
│   ├── customizationStore.js # Personnalisation UI
│   ├── logsStore.js         # Stockage logs pour StatusPage
│   ├── notamStore.js
│   ├── notificationStore.js # Gestion des notifications push FCM
│   ├── stationAtmosphereStore.js  # Données atmosphériques station
│   ├── stationWindCurrentStore.js # Vent actuel station
│   ├── stationWindHistoryStore.js # Historique vent + rose des vents
│   ├── stationStore.js      # Coordinateur station (actions globales)
│   ├── temsiStore.js
│   ├── vacStore.js
│   ├── weatherStore.js
│   └── wintemStore.js
└── utils/                 # Utilitaires (helpers métier sans état)
    ├── dateHelpers.js
    ├── logger.js          # Logging conditionnel (dev: tous, prod: error only)
    ├── notamHelpers.js    # Filtrage NOTAMs (validité, trafic, FL, catégories)
    ├── stationHelpers.js  # Calculs météo (point de rosée, QNH, rose des vents)
    └── vfrCriticality.js  # Colorisation des paramètres météo selon seuils VFR
```

> La liste exacte des stores/pages/composables/utils se vérifie par `ls src/<dossier>` — elle évolue et n'est donc pas figée ici. Ce document décrit les **contrats durables** ; pour les patterns d'usage côté agent, voir [ai/AGENT_GUIDE.md](./ai/AGENT_GUIDE.md).

### Pattern Architectural

**Flux de données unidirectionnel** :

```
API → Store (Pinia) → Composants Vue → UI
         ↓
      Cache (TTL)
```

1. **Stores** : Source unique de vérité (single source of truth)
2. **Cache** : Optimisation réseau avec TTL
3. **Composants** : Réactifs via `storeToRefs()`

---

## Gestion d'État (Pinia)

### Stores Disponibles

> ⚠️ Les signatures exactes (state exposé, actions) sont **source de vérité dans le code** — lire le `return { … }` du store concerné. Ci-dessous : responsabilités et forme générale, pas une API figée.

**Convention commune** : chaque store de données s'appuie sur `useDataFetcher` et expose au minimum `rawData`, `generatedAt`, `loading`, `error`, `isRefreshing`, `lastFetchedAt`, `nextRefreshAt`, une action de chargement (`loadXxx`), `forceRefresh` et `invalidate`. Les stores ajoutent ensuite leurs computed métier.

#### 1. `useNotamStore()`

**Responsabilités** : charger les NOTAMs (AD + FIR) avec cache et exposer les données brutes structurées (`rawData`, `notamList`).

> Le **filtrage** (validité / trafic / niveaux de vol / catégories) vit dans `src/utils/notamHelpers.js` et la page `NotamPage.vue`, **pas** dans le store. La gestion **vus/masqués** vit dans les composables `useSeenNotams` / `useHiddenNotams` (localStorage), pas dans le store. C'est le domaine le plus complexe : voir la section « Domaines à connaître » de [ai/AGENT_GUIDE.md](./ai/AGENT_GUIDE.md).

#### 2. `useWeatherStore()` - Données météo

Charge `weather.json` et expose les données brutes via `rawData` (+ `generatedAt`). Le décodage METAR/TAF en français s'appuie sur `src/services/metarTranslations.js`, consommé par les composants météo (`src/components/weather/`). La sélection d'un aérodrome / METAR / TAF se fait par computed côté composant à partir de `rawData`.

#### 3. `useAzbaStore()` - Zones aériennes

```javascript
const azbaStore = useAzbaStore()
const { zones, priorityZones, activeZonesCount } = storeToRefs(azbaStore)

await azbaStore.loadAzba()
const r149e = azbaStore.getZone('R149E')
```

#### 4. `useTemsiStore()` & `useWintemStore()` - Cartes

```javascript
const temsiStore = useTemsiStore()
const { temsiList } = storeToRefs(temsiStore)

await temsiStore.loadTemsi()
await temsiStore.forceRefresh() // Ignore cache
```

#### 5. `useStationStore()` - Station météo locale

**Fichier** : `src/stores/stationStore.js`

La station locale repose sur 3 stores spécialisés, avec `useStationStore()` comme coordinateur minimal pour les actions globales.

| Store                              | Source JSON         | Rafraîchissement | Seuil obsolescence |
| ---------------------------------- | ------------------- | ---------------- | ------------------ |
| `useStationWindHistoryStore()`     | `wind_history.json` | 5 min            | 90 min             |
| `useStationAtmosphereStore()`      | `atmosphere.json`   | 5 min            | 90 min             |
| `useStationWindCurrentStore()`     | `wind_current.json` | 2 min            | 20 min             |
| `useStationStore()` (coordinateur) | Orchestration       | n/a              | n/a                |

```javascript
const windHistoryStore = useStationWindHistoryStore()
const atmosphereStore = useStationAtmosphereStore()
const windCurrentStore = useStationWindCurrentStore()

const { windHistory24h, windRose } = storeToRefs(windHistoryStore)
const { atmosphereHistory, latestAtmosphere } = storeToRefs(atmosphereStore)
const { windCurrent } = storeToRefs(windCurrentStore)

// Le coordinateur reste utile pour les actions globales
const stationStore = useStationStore()

// Actions
await stationStore.loadStation() // Charge les 3 sources en parallèle
await stationStore.forceRefresh() // Force le rechargement
stationStore.invalidate() // Invalide le cache
```

**Stores spécialisés** :

- `useStationWindHistoryStore()` : expose `windHistory24h`, `windRose`, `generatedAt`, `loading/error/isRefreshing`, actions `loadWindHistory/forceRefresh`
- `useStationAtmosphereStore()` : expose `atmosphereHistory`, `latestAtmosphere`, `generatedAt`, actions `loadAtmosphere/forceRefresh`
- `useStationWindCurrentStore()` : expose `windCurrent`, `generatedAt`, actions `loadWindCurrent/forceRefresh`

**Rôle du coordinateur `useStationStore()`** :

- Orchestrer les chargements globaux (`loadStation`, `forceRefresh`, `invalidate`)
- Déléguer l'état métier aux stores spécialisés
- Garder un point d'entrée unique pour les appels globaux (ex: refresh réseau dans le layout)

#### 6. `useCustomizationStore()` - Personnalisation UI

**Fichier** : `src/stores/customizationStore.js`

Gère la personnalisation de l'interface utilisateur, notamment le menu de navigation mobile.

```javascript
const customizationStore = useCustomizationStore()
const { visibleMenuItems, isBottomMenuVisible, showLabels, orderedMenuItems } =
  storeToRefs(customizationStore)

// Gestion de la visibilité des items
customizationStore.setItemVisibility('temsi', true) // Affiche TEMSI dans le menu
customizationStore.showAll() // Affiche tous les items
customizationStore.hideAll() // Masque tous les items
customizationStore.reset() // Réinitialise aux valeurs par défaut

// Réorganisation (drag & drop)
customizationStore.reorderItems(0, 3) // Déplace l'item de l'index 0 vers 3

// Affichage du texte sous les icônes
customizationStore.setShowLabels(true) // Affiche le texte
customizationStore.setShowLabels(false) // Masque le texte
```

**Items disponibles** :

- Pages : Accueil, Météo IA, Station Locale, Éphémérides, TEMSI, WINTEM, AZBA, NOTAM, VAC, Préparation
- Sous-onglets de Préparation (raccourcis vers `/preparation?tab=…`) : Centrage, Carburant, Perfos, Check-list, Urgence & secours, Tarif
- Liens externes : Aerogest, Météo Aviation, SIA AZBA, SOFIA Briefing, REX FFA

**Hiérarchie (sous-menus)** :

Un item peut porter un `parentId` (ex. les onglets de Préparation → parent `preparation`). Ces sous-items :

- pointent vers la page parente avec une query `?tab=` ; `PreparationPage` pilote l'onglet actif depuis la query (URL partageable, `router.replace` pour ne pas empiler l'historique) ;
- sont **regroupés sous leur parent** par `normalizeGroups()` après tout drag & drop et au chargement (migration). `reorderItems`, `reset` et le chargement appellent `normalizeGroups` ; un enfant déplacé ailleurs « retombe » sous son parent ;
- s'affichent indentés (filet à gauche) dans `CustomizationPage` ; en barre basse ils comptent comme des items normaux. La barre répartit les items à parts égales tant qu'ils tiennent (largeur ≥ 56px, jamais écrasés) et passe en défilement horizontal au-delà (cf. `MainLayout`, `.footer-item { flex: 1 0 56px }`).

**Migration de config** : `loadConfig()` retire les ids obsolètes et insère les nouveaux items (absents d'une config sauvegardée avant leur introduction) à leur place dans l'ordre source, puis persiste immédiatement.

**Source unique** : le drawer de `MainLayout` dérive ses entrées (`navItems`, `externalLinks`) de `availableMenuItems` — pas de liste codée en dur en doublon.

**Stockage** :

- `localStorage.menuCustomization` : configuration (visibilité, ordre)
- `localStorage.menuShowLabels` : affichage texte (boolean)

**Configuration par défaut** :

- Visibles : Accueil, Météo IA, Station Locale, AZBA, NOTAM, VAC
- Masqués : TEMSI, WINTEM, tous les liens externes
- Texte : masqué

**Comportement** :

- Si aucun item sélectionné → barre de navigation masquée
- Accès permanent via menu latéral (drawer)
- Sauvegarde automatique en temps réel

#### 7. Seuils VFR (`useVfrThresholds`)

La colorisation des paramètres météo (visibilité, plafond, vent, rafales, vent traversier) repose sur des seuils VFR. Ce n'est **pas** un store Pinia mais un composable + un util :

- `useVfrThresholds()` (composable) : expose `thresholds` (réactif), `saveThresholds(...)`, `resetToDefaults()`. Les défauts viennent de `VFR_THRESHOLDS_DEFAULTS` dans `app.config.js` ; la surcharge utilisateur est persistée en `localStorage` et réglable via la page de seuils VFR.
- `src/utils/vfrCriticality.js` : fonctions pures consommant `thresholds` pour décider couleur/label (`getVfrLevel`, `getVfrBgClass`, `getVfrTextColor`, `getOverallVfrStatus`, parsing visibilité/plafond).

#### 8. Domaine Avion / Préparation vol (`useAircraftStore`, `useWeightBalanceStore`, `usePerformanceStore`)

Alimente la page `/preparation` (masse & centrage, carburant, performances, tarif, check-lists). **Particularité** (cf. **ADR-024**) : la source de vérité est un fichier **`.aircraft` (XML SkyDemon)** par avion dans `public/data/aircrafts/`, **parsé côté client** (`src/utils/aircraftXml.js`, `DOMParser`). L'index **`aircrafts.json`** (endpoint `aircrafts`) référence ces fichiers et complète le manquant (tables de perfos POH, densité carburant).

- `useAircraftStore()` : charge l'index via `useDataFetcher`, **fetch + parse les `.aircraft`**, fusionne le complément, expose `aircraftList` + la sélection courante (`selectedAircraft`, persistée localStorage). Seul store qui `fetch()` autre chose que du JSON (dérogation assumée, documentée).
- `useWeightBalanceStore()` : lit l'avion sélectionné ; chargement réactif (préférence UI), points d'enveloppe **plein / vide / carburant sélectionné**, bilan carburant (`computeFuelPlan`). Calculs purs dans `weightBalanceHelpers.js` / `fuelHelpers.js`.
- `usePerformanceStore()` : interpolation des abaques POH (`performanceHelpers.js`) ; T°/QNH pré-remplis depuis le METAR (`weatherStore`), masse reprise du centrage.
- Tarif (`pricingHelpers.js`) et check-lists sont des composants légers lisant directement `aircraftStore`.

---

## Système de Cache

### Composable `useCache()`

**Fichier** : `src/composables/useCache.js`

**Fonctionnalités** :

- ✅ Cache en mémoire (Map)
- ✅ TTL configurables par entrée
- ✅ Nettoyage auto toutes les 5 min
- ✅ Invalidation par clé ou pattern (regex)
- ✅ Statistiques en temps réel

**Structure d'une entrée** :

```javascript
{
  data: any,           // Données cachées
  timestamp: number,   // Date de mise en cache (ms)
  ttl: number,         // Durée de vie (ms)
  promise: Promise     // Requête en cours (déduplication)
}
```

**API** :

```javascript
import { useCache } from '@/composables/useCache'

const cache = useCache()

// Stockage
cache.set('weather-lffi', data, 5 * 60 * 1000) // 5 min TTL

// Récupération
const cached = cache.get('weather-lffi') // null si expiré

// Invalidation
cache.invalidate('weather-lffi')
cache.invalidatePattern('weather-.*')
cache.clear() // Vide tout

// Stats
console.log(cache.getStats())
// { total: 5, valid: 4, expired: 1, pending: 0, size: 45000 }
```

### `useDataFetcher()` Amélioré

**Fichier** : `src/composables/useDataFetcher.js`

**Options** :

```javascript
useDataFetcher(endpoint, {
  ttl: 5 * 60 * 1000, // Durée de vie (défaut: 5 min)
  cacheBust: false, // Force rechargement
  staleWhileRevalidate: true, // Cache stale + revalide
  deduplicate: true, // Déduplication requêtes
})
```

**Mécanismes** :

1. **Cache Hit** → Retour immédiat
2. **Stale-While-Revalidate** :
   ```
   Retourne cache (stale) → Revalide en background → Cache MAJ
   ```
3. **Déduplication** :
   ```
   Requête 1 en cours → Requête 2 attend Requête 1
   ```
4. **Cache Miss** → Fetch réseau → Cache

**Exemple** :

```javascript
const { data, loading, error, fetchData, invalidate } = useDataFetcher('./data/weather.json', {
  ttl: 5 * 60 * 1000,
  staleWhileRevalidate: true,
})

await fetchData() // 1ère fois : réseau
await fetchData() // 2ème fois : cache (si < 5 min)
```

---

## Composables

### `useVisibilityRefresh(callback)`

**But** : Rafraîchit les données quand l'utilisateur revient sur l'onglet.

**Utilisation** :

```javascript
import { useVisibilityRefresh } from '@/composables/useVisibilityRefresh'

useVisibilityRefresh(() => {
  notamStore.forceRefresh()
})
```

**Fonctionnement** :

- Écoute `document.visibilityState`
- Si hidden → visible : appelle `callback`
- Cleanup automatique au unmount

### `useHiddenNotams()` & `useSeenNotams()`

**But** : Persistance localStorage des préférences utilisateur.

**API** :

```javascript
const { isHidden, hideNotam, unhideNotam, clearAllHidden, hiddenCount, pruneStale } = useHiddenNotams()
const { markAsSeen, isNew, seenCount, pruneStale: pruneStaleSeen } = useSeenNotams()

// Masquer un NOTAM
hideNotam('A1234/25', '2026-01-15T12:00:00Z') // + date expiration

// Vérifier
if (isHidden('A1234/25')) { ... }

// Nettoyage auto des expirés
cleanupExpired()

// Nettoyage des entrées obsolètes (NOTAMs plus dans le JSON)
pruneStale(setOfCurrentNotamIds)
```

**Comptage** : `hiddenCount` et `seenCount` ne comptent que les entrées **non expirées** (cohérent avec `isHidden`/`isNew`).

**Expiration** :

- NOTAM temporaire : `expiresAt` = `endValidity + 7 jours` (marge de sécurité après fin de validité)
- NOTAM permanent (`PERM`) ou sans date : **pas d'`expiresAt`** → jamais expiré automatiquement
- L'expiration est un filet de sécurité uniquement ; le vrai nettoyage est assuré par `pruneStale()`

**Nettoyage des entrées obsolètes** : `pruneStale(validIds)` supprime du localStorage les entrées dont l'ID n'existe plus dans les données NOTAM actuelles. Appelé automatiquement via un `watch` dans `NotamPage.vue` quand les données changent.

**Structure localStorage** :

```json
{
  "A1234/25": {
    "addedAt": "2026-01-08T10:00:00.000Z",
    "expiresAt": "2026-01-22T12:00:00.000Z"
  }
}
```

---

## Structure des Données

### NOTAMs

**Format API** :

```json
{
  "generatedAt": "2026-01-02T10:00:00Z",
  "notamList": {
    "listnotams": {
      "AD": [ ... ],  // NOTAMs aérodromes
      "FIR": { ... }  // NOTAMs FIR/UIR
    }
  }
}
```

**Champs clés d'un NOTAM** :

```javascript
{
  id: "A1234/25",
  category: "aerodromes_services",
  itemB: "2026-01-01T00:00:00Z",  // Début validité
  itemC: "2026-01-15T23:59:59Z",  // Fin validité
  itemE: "RWY 03/21 CLSD",        // Texte libre
  qLine: {
    code: "QMRLC",
    traffic: "IV",  // I=IFR, V=VFR, IV=both
    purpose: "BO",  // B=Briefing, O=Operations
    lower: 0,       // FL lower
    upper: 999      // FL upper
  },
  location: {
    code: "LFFI",
    name: "ANCENIS"
  }
}
```

### Météo

```javascript
{
  generatedAt: "2026-01-02T10:00:00Z",
  aerodromes: [
    {
      icaoCode: "LFFI",
      name: "Ancenis",
      metar: {
        raw: "METAR LFFI ...",
        decoded: { ... }
      },
      taf: {
        raw: "TAF LFFI ...",
        forecast: [ ... ]
      }
    }
  ]
}
```

### AZBA

```javascript
{
  generatedAt: "2026-01-02T10:00:00Z",
  windowUTC: {
    startISO: "2026-01-02T00:00:00Z",
    endISO: "2026-01-04T23:59:59Z"
  },
  zones: [
    {
      zone: "R149E",
      status: "active",  // "active" | "inactive"
      activations: [
        {
          startISO: "2026-01-02T08:00:00Z",
          endISO: "2026-01-02T12:00:00Z"
        }
      ]
    }
  ]
}
```

### Avion (Préparation vol)

Deux niveaux (cf. **ADR-024**) :

- **`public/data/aircrafts/<immat>.aircraft`** : XML SkyDemon, **source de vérité** (masse à vide & bras, `MaximumWeight`, `Envelope`, `LoadingPoints`, conso carburant, `HourlyCost`, `ChecklistBundle`). Parsé côté client par `aircraftXml.js`.
- **`public/data/aircrafts.json`** : index + complément.

```javascript
{
  generatedAt: "2026-06-06T00:00:00Z",
  fuelDensity: { AvGas100LL: 0.72 },           // kg/L par type de carburant
  defaultPerformance: {                         // abaques POH (illustratifs, à compléter)
    takeoff: { corrections: { /* vent, revêtement */ }, table: [ /* PA × T° × masse → distances */ ] },
    landing: { /* idem */ }
  },
  aircraft: [
    { registration: "F-HKRI", source: "./data/aircrafts/F-HKRI.aircraft" /* , performance? override */ }
  ]
}
```

### REX FFA

Retours d'expérience FFA récupérés via l'**API REST** `api-rex.ffa-aero.fr` (le portail
`rex.ffa-aero.fr` est une SPA React ; **pas de scraping HTML**) puis synthétisés par un LLM
(cf. **ADR-027**, FEAT-032). Produit par `Airfield-Portal-Scripts/rex-ffa/rex_ffa.php` →
`public/data/rex.json`. Endpoint `rexFfa`, store `useRexFfaStore()`, page `/rex-ffa`.

- **Deux fenêtres découplées** côté script (l'API renvoie tout en une requête ; `rex/{id}` est
  interdit 403) : on **interroge** large (`fetchMonths`, défaut 24 mois ; `--all` = tout l'historique)
  pour alimenter la base, mais on **sert** au front une fenêtre courte (`windowMonths`, défaut 12 mois)
  **reconstruite depuis SQLite** → `rex.json` reste borné et léger.
- **SQLite = mémoire longue** (jamais servie au front) : accumule tout l'historique. La table `rex`
  n'est ré-écrite que si l'`updated_at` FFA change (détection nouveaux/modifiés) ; la table `summary`
  **archive chaque synthèse mensuelle** (une ligne par période, upsert par `period`) — fail-safe LLM
  **et** historique servi au front.
- **Archives de synthèses** (FEAT-034) : `summaries[]` porte les synthèses des mois de la fenêtre
  servie, période **décroissante**, alimentant un sélecteur de mois dans l'onglet Synthèse.
  Le bornage à `windowMonths` (`rexFilterSummaries()`) est volontaire : au-delà, les citations `{id}`
  pointeraient vers des REX absents du JSON, et le fichier grossirait sans fin (~6 Ko/mois).
  `summary` (objet, mois écoulé) est **conservé** pour la compatibilité et le fail-safe.
- ⚠️ **Invariant** : la synthèse de `summary` figure **toujours** dans `summaries[]`. Le front ne lit
  que `summaries[]` — une synthèse absente du tableau serait **invisible**. Le cas se produit
  réellement au **fail-safe LLM niveau 2** (synthèse reprise du `rex.json` précédent, donc jamais
  archivée en base) quand la base contient d'autres mois : `rexAssembleOutput()` la **réinjecte** et
  retrie. Le store applique la **même réinjection** côté front, pour rester correct face à un
  `rex.json` ancien ou désynchronisé.
- **Anonymisé (RGPD)** : les REX bruts de l'API contiennent l'identité du déclarant (nom, e-mail,
  tél, licence) ; la lib (`rexToPublicSchema()`) la **retire** avant écriture. `rex.json` ne porte
  que du factuel. Seules les visibilités les plus ouvertes (`visibilityId` 4 = Plateforme, 7 = FFA)
  sont exposées.
- **Libellés déjà en clair** (fournis par l'API) : `type`, `flightRegime`, `flightPhase`, `eventKind`…
  sont du texte lisible, portés tels quels. Seuls **les risques sont numériques** (`severity` /
  `probability` = entiers **1..5**) ; la **coloration** (matrices, charte `bg-*-1`/`text-*-9`) est
  dérivée **côté front** (`src/utils/rexHelpers.js`).
- **Pertinence club** (`fromClub`) : le REX brut porte un `club_id` (club **déclarant**), distinct de
  `place` (**lieu** de l'évènement). La lib dérive un booléen `fromClub` (`club_id === config.clubId`)
  **sans exposer le `club_id` brut** de chaque REX (divulgation minimale). Le front considère un REX
  « pertinent club » s'il est **déclaré par le club (`fromClub`) OU survenu à LFFI (`place`)** — ce qui
  rattrape les REX du club survenus ailleurs (ex. panne au retour d'une navigation). Cartes : badge
  **Club** (déclaré) et/ou **LFFI** (lieu), distincts. `fromClub` vaut `null` si `clubId` n'est pas
  configuré → le front retombe sur le seul critère `place`.
- La **synthèse** cite les REX par leur ID entre `{}` ; le front les rend en liens vers la carte du REX.
  Les REX `fromClub` sont **priorisés** dans le prompt (en tête de synthèse).

Le schéma d'un REX correspond exactement à la sortie de `rexToPublicSchema()` (lib) :

```jsonc
{
  "generatedAt": "2026-07-02T21:00:00Z", // convention projet : UTC ISO 8601
  "source": "FFA REX (api-rex.ffa-aero.fr)",
  "window": {
    // borne du contenu servi au front
    "months": 12,
    "startISO": "2025-07-01T00:00:00Z",
    "endISO": "2026-07-31T23:59:59Z",
  },
  "summary": {
    // synthèse LLM du dernier mois (conservée pour compat + fail-safe)
    "period": "2026-06",
    "model": "mammouth/...", // modèle LLM utilisé
    "generatedAt": "2026-07-02T21:00:00Z",
    "text": "…synthèse avec renvois {2349}…", // IDs entre {} → liens front
    "citedRexIds": ["2349", "2360"],
  },
  "summaries": [
    // archives : synthèses des mois de la fenêtre, période DÉCROISSANTE (sélecteur front).
    // Même schéma que `summary` ; summaries[0] === summary (mois écoulé).
    { "period": "2026-06", "model": "…", "generatedAt": "…", "text": "…", "citedRexIds": [] },
    { "period": "2026-05", "model": "…", "generatedAt": "…", "text": "…", "citedRexIds": [] },
  ],
  "rex": [
    // liste (front trie en date décroissante)
    {
      "id": "2349",
      "title": "PENETRATION ESPACE AERODROME CONTROLE SANS CLEARANCE",
      "description": "…",
      "type": "Anomalie", // "Anomalie" | "Bonne pratique"
      "subject": "Dans / Autour d’un avion", // objet (report-subject, libellé clair)
      "eventDate": "2026-02-03",
      "flightPhase": "Approche", // libellé clair (réf. flight-phase)
      "place": "LFBR", // code OACI du lieu
      "placeDetail": "ENTREE EN SEMI DIRECT",
      "flightKind": "Local", // nature : Navigation | Local | Tour de piste | …
      "flightType": "Solo", // Solo | Instruction | Solo supervisé | Contrôle (FI/FE)
      "flightRegime": "VFR Jour", // VFR Jour | VFR Nuit | IFR Jour | IFR Nuit
      "aircraftType": "ROBIN - DR-400 2+2",
      "aircraftReg": "F-GSTY",
      "eventType": "ATM: Événement relatif à…", // code OACI + libellé (SCF/ATM/NAV/MAC/…)
      "eventKind": "Incident", // Incident | Incident grave | Accident | Observation | Evènements hors vol | Autre
      "eventSummary": "…",
      "beaInvestigation": false,
      "causes": [
        // anonymisé (pas de porteur)
        { "type": "Cause Principale", "title": "DEFAUT DE NAVIGATION", "description": "…" },
      ],
      "actions": [
        // anonymisé (carrier_name retiré)
        { "description": "BRIEFING DÉTAILLÉ POUR INTÉGRATION SEMI DIRECTE", "status": "Fait" },
      ],
      "safetyEducation": "…", // enseignement
      "initialRisk": { "severity": 3, "probability": 4 }, // entiers 1..5 (ou null)
      "residualRisk": { "severity": 2, "probability": 3 },
      "visibilityId": 7, // 4 = Plateforme, 7 = FFA (seules exposées)
      "publicationDate": "2026-03-23T09:18:47.734Z",
      "fromClub": true, // déclaré par notre club (club_id === config.clubId) ; null si clubId non configuré
    },
  ],
}
```

> **Note** : `sourceUrl` n'est pas porté — l'API ne fournit pas d'URL publique par REX ; le lien
> « voir sur le portail » se construit côté front à partir de l'`id` si besoin.

> **Backfill de schéma (`--rebuild`)** : l'upsert SQLite saute les REX dont l'`updated_at` FFA n'a pas
> changé — un **nouveau champ** du schéma public (ex. `fromClub`) ne serait donc jamais rétro-appliqué
> aux REX déjà en base. Lancer `php rex_ffa.php --rebuild` **une fois** après un tel changement force la
> réécriture de tous les payloads (le run trace « N reconstruits ») ; le cron mensuel normal reprend
> ensuite. Autres flags CLI : `--all` (amorçage : tout l'historique), `--force-llm` (régénère la
> synthèse du mois même si déjà archivée).

---

## Performance

### Optimisations Implémentées

✅ **Cache avec TTL** (5 min) → Réduit appels API  
✅ **Déduplication** → Évite requêtes simultanées identiques  
✅ **Stale-While-Revalidate** → UX instantanée  
✅ **Lazy Loading** → Chargement à la demande  
✅ **Cleanup auto** → Nettoyage cache expiré (5 min)

### Optimisations à Implémenter

⏳ **Virtual Scrolling** → Listes > 50 items (NOTAMs)  
⏳ **Code Splitting** → Par route  
⏳ **Image Optimization** → Lazy load webcam/cartes  
⏳ **Bundle Analysis** → Réduire taille JS  
⏳ **Memoization** → Computed properties coûteux

### Métriques Cibles

| Métrique               | Cible   |
| ---------------------- | ------- |
| First Contentful Paint | < 1.5s  |
| Time to Interactive    | < 3s    |
| Bundle Size (gzip)     | < 300KB |
| Cache Hit Ratio        | > 70%   |

---

## Développement

### Installation

```bash
npm install
```

### Dev Server

```bash
npm run dev
# → http://localhost:9000
```

### Build Production

```bash
npm run build
# → dist/spa/
```

### Linting

```bash
npm run lint        # Check
npm run format      # Auto-fix avec Prettier
```

### Structure d'un Store Type

```javascript
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useDataFetcher } from '../composables/useDataFetcher'
import { getEndpointConfig } from '../config/app.config'

const myConfig = getEndpointConfig('myEndpoint')

export const useMyStore = defineStore('myStore', () => {
  // useDataFetcher fournit data/loading/error/isRefreshing — ne pas redéclarer
  // ses propres refs ni de try/catch manuel. Convention : renommer `data` en
  // `rawData` dès l'extraction (comme weatherStore/notamStore).
  const {
    data: rawData,
    fetchData,
    refetch,
    loading,
    error,
    isRefreshing,
    invalidate,
  } = useDataFetcher(myConfig.url, {
    ttl: myConfig.refreshInterval,
    staleWhileRevalidate: true,
    deduplicate: true,
  })

  // Computed métier dérivés des données brutes
  const processedData = computed(() => rawData.value?.someField ?? [])

  // Actions = fines enveloppes autour du fetcher
  const loadData = () => fetchData()
  const forceRefresh = () => refetch()

  return {
    rawData,
    processedData,
    loading,
    error,
    isRefreshing,
    loadData,
    forceRefresh,
    invalidate,
  }
})
```

### Bonnes Pratiques

1. **Stores** : 1 store = 1 domaine métier
2. **Composables** : Logique réutilisable sans état
3. **Components** : Affichage uniquement (pas de logique métier)
4. **Props** : Primitives ou objets simples
5. **Events** : Nommage clair (`@update:value`, `@delete`)
6. **Computed** : Pas d'effets de bord
7. **Watch** : Éviter sauf pour sync externe

### Debugging Cache

```javascript
// Dans la console navigateur
import { useCache } from '@/composables/useCache'
const cache = useCache()

// Stats
console.log(cache.getStats())

// Vider
cache.clear()

// Invalider un pattern
cache.invalidatePattern('notam.*')
```

---

## Notifications Push

### Architecture

L'application utilise **Firebase Cloud Messaging (FCM)** pour les notifications push via PWA.

**Flux** :

1. Backend N8N → FCM → Service Worker → Notification
2. Clic notification → Deep linking vers page spécifique

### Configuration

Variables d'environnement requises dans `.env` :

```bash
FIREBASE_API_KEY=your_api_key
FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=your_sender_id
FIREBASE_APP_ID=your_app_id
FIREBASE_VAPID_KEY=your_vapid_public_key
```

### Service Worker (custom-service-worker.js)

Gère 3 événements :

1. **`push`** : Réception notification depuis FCM
2. **`notificationclick`** : Deep linking vers URL spécifiée
3. **`message`** : Communication avec l'app

Format payload attendu du backend :

```json
{
  "notification": {
    "title": "Alerte AZBA - R149E",
    "body": "La zone R149E est active dans 30 minutes"
  },
  "data": {
    "on_click_url": "/azba",
    "tag": "azba-zone"
  }
}
```

### Store (notificationStore.js)

Gère :

- **Permissions** : granted / denied / default
- **Détection PWA** : installée vs navigateur
- **Topics** : notam-ad, notam-fir, azba-zone
- **Souscriptions** : stockées dans localStorage

### UI States

La page `/notifications` gère 3 états :

1. **Non installé** : Instructions installation PWA (iOS/Android)
2. **Prêt** : Bouton activation + gestion topics
3. **Bloqué** : Instructions réactivation permissions

### Icône Cloche (Header)

Code couleur selon statut :

- 🟢 **Vert** : Notifications activées (granted)
- 🟠 **Orange** : Non configurées (default)
- 🔴 **Rouge** : Bloquées (denied)
- ⚪ **Gris** : Non supporté ou non installé

---

## Logging

### `logger.js`

**Fichier** : `src/utils/logger.js`

Utilitaire de logging conditionnel : tous les niveaux affichés en développement, seul `logger.error()` affiché en production.

```javascript
import { logger } from '@/utils/logger'

logger.log('Info') // Dev uniquement
logger.warn('Attention') // Dev uniquement
logger.error('Critique') // Toujours affiché
logger.debug('Debug') // Dev uniquement
```

> **Convention** : Utiliser `logger` dans `src/`, `console` direct dans `src-pwa/` (contexte isolé Service Worker). Voir [LOGGING_STRATEGY.md](./LOGGING_STRATEGY.md) pour les détails.

### `logsStore`

**Fichier** : `src/stores/logsStore.js`

Store Pinia qui collecte les logs applicatifs pour les afficher dans la StatusPage (composant `LogsConsole.vue`).

---

## Page de Diagnostic (`/status`)

**Fichier** : `src/pages/StatusPage.vue`

Page centralisée affichant l'état complet du système :

- Informations générales (version, environnement, navigateur)
- État du réseau (online/offline)
- Service Worker (enregistré, scope, état)
- Notifications (permission, token FCM, topics)
- Configuration Firebase
- **Navigateur localStorage** (visualisation, suppression, détail des Sets NOTAM avec état actif/expiré)
- Console de logs applicatifs

Accessible via le menu → "Diagnostic".

### Composant `LocalStorageBrowser`

**Fichier** : `src/components/diagnostics/LocalStorageBrowser.vue`

Permet d'inspecter toutes les clés localStorage :

- Recherche/filtre par nom de clé
- Affichage JSON formaté ou texte brut
- Vue spéciale pour les Sets de NOTAMs (hidden/seen) avec tableau actif/expiré
- Actions : copier valeur, supprimer clé
- Tri : clés de l'application (préfixe défini par `club.config.js`) en premier

---

## Architecture des Données

### Sources

Les données sont des fichiers JSON statiques générés par des workflows **N8N** (outil d'automation) depuis les sources officielles (SIA, Météo France Aviation, capteurs locaux).

```
N8N → fetch sources officielles → génère JSON → héberge dans public/data/
                                                         ↓
                                          PWA fetch → cache TTL → affichage
```

**Fichiers générés** (la colonne « Fréquence » = cadence de génération N8N, côté serveur ; les TTL de cache **client** sont indépendants et déclarés dans `app.config.js` via `refreshInterval`) :

| Fichier             | Fréquence    | Description                                           |
| ------------------- | ------------ | ----------------------------------------------------- |
| `weather.json`      | 60 min       | Météo aéronautique (METAR/TAF)                        |
| `notam.json`        | 60 min       | NOTAMs AD + FIR                                       |
| `azba.json`         | 60 min       | Statuts zones AZBA                                    |
| `temsi.json`        | 60 min       | Cartes TEMSI                                          |
| `wintem.json`       | 60 min       | Cartes WINTEM                                         |
| `vac.json`          | 24h (9h UTC) | Cartes VAC                                            |
| `wind_history.json` | 60 min       | Station locale : historique vent 24h + rose des vents |
| `atmosphere.json`   | 60 min       | Station locale : température, humidité, pression      |
| `wind_current.json` | 10 min       | Station locale : conditions actuelles du vent         |

### `createChartStore`

**Fichier** : `src/stores/createChartStore.js`

Factory function pour créer les stores TEMSI et WINTEM qui partagent la même logique (chargement d'une liste de cartes avec cache et refresh).

---

## Ressources

- [Vue 3 Docs](https://vuejs.org/)
- [Quasar v2](https://quasar.dev/)
- [Pinia](https://pinia.vuejs.org/)
- [Leaflet](https://leafletjs.com/)

---

**Dernière mise à jour** : 28 mai 2026  
**Maintainer** : Stephanfo
