# AGENT_GUIDE — LFFI Brief

Guide technique unique pour agents IA travaillant sur ce dépôt. Décrit les **contrats durables** et les **patterns** ; les listes exactes (stores, pages, lignes) se vérifient dans le code (`ls src/stores`, `grep`), pas ici — elles changent, ce guide non.

Pour le **pourquoi** : [DECISIONS.md](../DECISIONS.md) (ADR). Pour les **schémas JSON et l'API détaillée** : [ARCHITECTURE.md](../ARCHITECTURE.md). Pour le **besoin métier** : [PRD.md](../PRD.md). Pour ce qui est **prévu ou hors périmètre** : [ROADMAP.md](../ROADMAP.md).

---

## Le projet en 30 secondes

PWA de briefing pré-vol VFR pour l'aérodrome d'Ancenis (LFFI) : météo (METAR/TAF), NOTAMs, zones AZBA, cartes TEMSI/WINTEM/VAC, station météo locale, webcam.

```
Vue 3 (Composition API, <script setup>) + Quasar 2 (UI) + Pinia 3 (stores)
        ↓ store
useDataFetcher  →  useCache (TTL + dédup + stale-while-revalidate)
        ↓ fetch
public/data/*.json   ← générés hors app par un workflow N8N (pas de backend applicatif)
```

Notifications push via Firebase Cloud Messaging (Cloud Function dans `../Airfield-Portal-Firebase/`).
Tout est en **français** : strings UI, commentaires, messages de commit.

---

## Règles enforced

### TOUJOURS

- `<script setup>` + Composition API. Jamais Options API ni `this`.
- `storeToRefs(store)` pour extraire le state réactif. Déstructurer le store directement **perd la réactivité**.
- Muter le state **uniquement via les actions** du store.
- `useDataFetcher` pour tout fetch de données. Jamais `fetch()` direct dans un store ou une page (sauf ADR justifiant l'exception).
- `useVisibilityRefresh()` dans chaque page pour rafraîchir au retour d'onglet.
- Composants Quasar (`q-card`, `q-btn`, `q-btn-toggle`…), pas de HTML/CSS reconstruit à la main.
- `logger` (`src/utils/logger.js`) dans `src/`. `console` direct n'est toléré que dans `src-pwa/`.
- 1 store = 1 domaine métier. Endpoints déclarés dans `src/config/app.config.js`.
- Alias `@/` = `src/`.

### JAMAIS

- Données métier dans `localStorage` — seulement des **préférences UI** (NOTAMs masqués/vus, perso du menu, seuils VFR).
- Nouvelle dépendance sans justification (ADR). JS natif d'abord.
- Désactiver ESLint sans commentaire expliquant l'exception.
- Créer un doublon utilitaire — ajouter à l'helper existant (`dateHelpers`, `notamHelpers`, `stationHelpers`, `vfrCriticality`).

---

## Flux de données et cache

`src/config/app.config.js` est le **registre unique des endpoints**. Chaque endpoint a `url`, `refreshInterval` (TTL cache client) et `staleThreshold` (seuil d'alerte visuelle « données anciennes »). On le lit via :

```javascript
import { getEndpointConfig } from '@/config/app.config'
const cfg = getEndpointConfig('weather') // lève une erreur si le nom est inconnu
// → { url, refreshInterval, staleThreshold }
```

Le même fichier porte aussi : `VFR_THRESHOLDS_DEFAULTS` (colorisation météo), `AZBA_CONFIG.priorityZones`, `WEBCAM_CONFIG` — ces deux derniers ne faisant que **composer** les valeurs du club (voir ci-dessous) avec les paramètres techniques.

---

## Identité du club et modules optionnels (ADR-030)

Le projet est réutilisable par un autre aérodrome. **Aucune valeur d'identité ne doit être écrite en dur** — ni code OACI, ni coordonnées, ni cap de piste, ni nom d'application, ni URL de club, ni clé `localStorage`.

| Fichier                                          | Rôle                                                                                                    |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| `src/config/club.config.js`                      | **Identité du fork ET caractéristiques du terrain** (piste, altitude, coordonnées, `runwayLengths` par QFU) : produit, webcam, topics de notification, zones AZBA, flags, préfixe de stockage. Module ESM **pur** (aucun import) → utilisable au build (`quasar.config.js`) comme au runtime. |
| `.env`                                           | Déploiement uniquement (`PUBLIC_PATH`, `APP_URL`, clés Firebase, `REX_SUBMIT_*`). **Pas d'identité ici.** |
| `src/config/features.js`                         | `isFeatureEnabled(name)` — modules optionnels.                                                          |
| `src/config/storageKeys.js`                      | Registre unique des clés `localStorage`, toutes préfixées par le club.                                  |

**Modules optionnels** (`webcam`, `station`, `thermal`, `rex`, `aircraft`, `notifications`) : un élément rattaché à un module porte une propriété déclarative `feature`, filtrée par `isFeatureEnabled`. C'est le cas des routes (`src/router/routes.js`), des entrées de menu (`customizationStore`) et des entrées de diagnostic (`useStoresStatus`). Hors de ces trois listes, utiliser `v-if="isFeatureEnabled('…')"`.

En ajoutant une fonctionnalité qui dépend d'un service externe (webcam, station, REX…), la rattacher à son flag — sinon un fork sans ce service se retrouve avec une page cassée ou un store en erreur permanente.

Toute nouvelle clé `localStorage` s'ajoute dans `STORAGE_KEYS` (`storageKeys.js`) ; ne jamais appeler `localStorage.setItem('nom-en-dur', …)`.

### Contrat `useDataFetcher`

```javascript
const { data, loading, error, isRefreshing, fetchData, refetch /* , … */ } = useDataFetcher(
  endpoint,
  {
    ttl, // défaut 5 min
    staleWhileRevalidate, // défaut false — affiche le cache puis revalide en arrière-plan
    deduplicate, // défaut true — fusionne les requêtes concurrentes
  },
)
```

- **stale-while-revalidate** : retourne le cache instantanément si présent, puis revalide en tâche de fond au-delà d'un seuil (≈ moitié du TTL) et met à jour silencieusement. C'est pourquoi un store distingue `loading` (premier chargement) de `isRefreshing` (rafraîchissement de fond).
- **déduplication** : les appels simultanés sur la même clé partagent une seule promesse.

### Cache (`useCache`)

```javascript
const cache = useCache()
cache.invalidate(key)
cache.invalidatePattern(/notam.*/)
cache.clear()
cache.getStats()
```

---

## Patterns

### Store de données

```javascript
import { defineStore } from 'pinia'
import { computed } from 'vue'
import { useDataFetcher } from '@/composables/useDataFetcher'
import { getEndpointConfig } from '@/config/app.config'

const cfg = getEndpointConfig('myEndpoint')

export const useMyStore = defineStore('myStore', () => {
  const { data, fetchData, refetch, loading, error, isRefreshing } = useDataFetcher(cfg.url, {
    ttl: cfg.refreshInterval,
    staleWhileRevalidate: true,
    deduplicate: true,
  })

  const items = computed(() => data.value?.someField ?? [])

  const loadData = () => fetchData()
  const forceRefresh = () => refetch()

  return { data, items, loading, error, isRefreshing, loadData, forceRefresh }
})
```

### Page

```vue
<script setup>
import { storeToRefs } from 'pinia'
import { useMyStore } from '@/stores/myStore'
import { useVisibilityRefresh } from '@/composables/useVisibilityRefresh'

defineOptions({ name: 'MyPage' })

const store = useMyStore()
const { data, isRefreshing } = storeToRefs(store)

useVisibilityRefresh(() => (data.value ? store.forceRefresh() : store.loadData()))
</script>
```

Brancher la route dans `src/router/routes.js` et l'entrée de menu dans `customizationStore` / `MainLayout` selon le cas.

### Composable

Fonction `useXxx()` qui retourne `{ state, computed, actions }`. Voir les composables existants comme modèles (`useHiddenNotams`, `useVfrThresholds`…).

---

## Domaines à connaître

### NOTAMs (le plus complexe)

- Filtrage multi-critères dans `notamStore` + `src/utils/notamHelpers.js` : validité (`all`/`current`/`future`), trafic (VFR = `qLine.traffic` ∈ {`V`,`IV`} / IFR ∈ {`I`,`IV`}), plage de niveaux de vol (slider 0–100).
- État utilisateur en `localStorage` via `useHiddenNotams` / `useSeenNotams` : clé = id NOTAM, valeur = `{ addedAt, expiresAt }`. Le compte ignore les entrées expirées.
- `pruneStale(idsValides)` supprime les entrées orphelines (NOTAMs disparus du JSON). `NotamPage` `watch` les données et l'appelle avec les ids courants.

### Station météo locale

Découpée en sous-stores spécialisés, **orchestrés** par `stationStore` :

- `stationWindCurrentStore` — vent actuel, cycle court (revalidation ~2 min).
- `stationWindHistoryStore` — historique + rose des vents.
- `stationAtmosphereStore` — série atmosphérique + dernier point.
- `stationStore` expose `loadStation` / `forceRefresh` / `invalidate` qui fanout vers les trois.

Graphiques via ECharts (`vue-echarts`). Helpers dans `src/utils/stationHelpers.js`.

### Cartes TEMSI / WINTEM

Construites depuis la factory `createChartStore` plutôt qu'à la main.

### Seuils VFR

`useVfrThresholds` lit/écrit les seuils (défauts dans `app.config.js`, surcharge utilisateur en `localStorage`), consommés par `src/utils/vfrCriticality.js` pour colorer les paramètres météo. Réglables via la page de seuils VFR.

### Traductions METAR/TAF

`src/services/metarTranslations.js` : table Q-codes → français (couverture nuageuse, phénomènes, descripteurs, visibilité, tendances).

### Avion / Préparation vol (`/preparation`)

Masse & centrage, carburant, performances, tarif, check-lists — un sélecteur d'avion global, des onglets par tâche. **Exception au contrat de flux** (cf. **ADR-024**) : la source de vérité est un **`.aircraft` (XML)** par avion dans `public/data/aircrafts/`, **parsé côté client** (`aircraftXml.js`, `DOMParser`). `aircrafts.json` n'est qu'un **index + complément** (perfos POH, densité). `aircraftStore` est donc le **seul store autorisé à `fetch()` autre chose que du JSON**. Calculs purs et testés : `weightBalanceHelpers` / `performanceHelpers` / `fuelHelpers` / `pricingHelpers`. UI : `SliderRow.vue` factorise le motif libellé+slider+valeur. **Check-lists** : `ChecklistRunner.vue` (accordéon avec auto-avance à la section suivante quand tout est coché), onglet `checklist` — préparation jusqu'aux actions après vol uniquement (phases hors `Emergency`). Les phases `Emergency` (urgence/secours) ont leur **onglet dédié** `urgence` rendu par `EmergencyProcedures.vue` (composant autonome : il dérive urgence/secours de l'avion sélectionné, deux gros blocs **urgence rouge / secours orange** → overlay plein écran). Les deux onglets partagent `useChecklistChecks` (même état coché). État coché et taille de texte partagés/persistés via `useChecklistChecks` / `useChecklistTextScale` (singletons module-level, localStorage = préférence UI). Les **perfos** se pré-remplissent depuis le contexte LFFI : météo (`weatherStore` → temp/QNH/vent), centrage (`weightBalanceStore` → masse) et **terrain** (`CLUB_CONFIG.airfield` : cap, altitude, longueur et revêtement de piste — la longueur peut être donnée **par QFU** via `runwayLengths`, lue par `runwayLengthFor()` de `airfieldHelpers`, la distance utilisée suivant le QFU actif). Le vent METAR est projeté sur l'axe de piste via `windHelpers` (composante de face, QFU into-wind) ; tout champ reste éditable (saisie ⇒ fige le pré-remplissage).

---

## Pièges fréquents

| ❌                                                   | ✅                                       |
| ---------------------------------------------------- | ---------------------------------------- |
| `const { data } = store`                             | `const { data } = storeToRefs(store)`    |
| `data.value.list = []` (mutation hors store)         | action du store                          |
| `await fetch('./data/x.json')`                       | `useDataFetcher(...)`                    |
| `localStorage.setItem('notams', …)` (données métier) | localStorage = préférences UI uniquement |
| `console.log(...)` dans `src/`                       | `logger.debug/info/error(...)`           |

---

## Vocabulaire aviation

| Terme                         | Sens                              | Dans le code                                                   |
| ----------------------------- | --------------------------------- | -------------------------------------------------------------- |
| NOTAM                         | Notice to Airmen                  | `notam.id`, `notam.itemE` (texte), `itemB`/`itemC` (début/fin) |
| METAR / TAF                   | Observation / prévision météo     | `metar.raw`, `metar.decoded` ; `taf.forecast[]`                |
| AZBA                          | Zone aérienne activable           | `zone.status`, `zone.activations[]`                            |
| FL                            | Flight Level                      | `qLine.lower` / `qLine.upper`                                  |
| QFU / QNH                     | Orientation piste / pression QNH  | `runway.qfu`, `metar.qnh`                                      |
| VFR / IFR                     | Vol à vue / aux instruments       | `qLine.traffic`                                                |
| CAVOK / FEW / SCT / BKN / OVC | États ciel/visibilité             | `clouds.cover`                                                 |
| TEMPO / BECMG                 | Changement temporaire / permanent | `taf.tempo[]` / `taf.becmg[]`                                  |

---

## Tests (Vitest — ADR-022)

`npm test` (run) / `npm run test:watch` / `npm run test:cov`. Config `vitest.config.js`
(env `happy-dom`, alias `@/`), setup `tests/setup.js`, specs dans `tests/unit/{utils,composables,stores}`.

- **Couvert** : utils purs (`windHelpers`, `stationHelpers`, `goNoGoHelpers`, `vfrCriticality`,
  `notamHelpers`, `dateHelpers`, `ephemerisHelpers`), composables data-flow (`useCache`,
  `useDataFetcher`, `useLocalStorageSet`), stores `notam` et `weather`. **Pas encore** : composants `.vue`.
- **Calculs aéro = sécurité** : toute modif de `windHelpers` / `stationHelpers` / `goNoGoHelpers` /
  `vfrCriticality` doit garder ses tests verts et en ajouter pour les nouveaux cas.
- **Conventions** : importer `describe/it/expect` explicitement depuis `vitest`. Temps →
  `vi.useFakeTimers()` + `vi.setSystemTime()`. Stores → `setActivePinia(createPinia())` + mock
  `global.fetch`. Le cache (`useCache`) est un **singleton module-level** : appeler `useCache().clear()`
  en `beforeEach`. `quasar` (`Notify`, `copyToClipboard`) est mocké globalement dans `tests/setup.js`.
- Les helpers sont conçus **purs** (`now` injecté en argument) → testables sans Vue ni DOM.

---

## Commits

`type(scope): description` en français — `feat` / `fix` / `docs` / `refactor` / `perf` / `style` / `chore`. Référencer l'ADR ou la tâche TODO concernée le cas échéant.
