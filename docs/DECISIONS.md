# Architecture Decision Records (ADR)

## Décisions de Conception - LFFI Brief

---

## Format des ADR

Chaque décision suit le format :

- **Contexte** : Pourquoi cette décision ?
- **Décision** : Qu'avons-nous choisi ?
- **Conséquences** : Impact technique et métier
- **Alternatives** : Ce qui a été rejeté et pourquoi
- **Statut** : Acceptée / Rejetée / Obsolète

---

## ADR-001 : Choix de Quasar plutôt que Vue "nu"

**Date** : Décembre 2025  
**Statut** : ✅ Acceptée

### Contexte

Besoin d'une UI Material Design cohérente, mobile-first, avec composants riches (drawer, cards, dialogs...) sans développer from scratch.

### Décision

Utiliser **Quasar Framework 2.x** (Vue 3 + composants + build tools intégrés).

### Conséquences positives

✅ Composants UI prêts à l'emploi (QCard, QBtn, QDrawer...)  
✅ Responsive grid natif  
✅ PWA build-in (mode SSR/SPA/PWA en une commande)  
✅ Icônes Material Design incluses  
✅ Dark mode natif (pas utilisé pour l'instant)  
✅ Configuration centralisée (quasar.config.js)

### Conséquences négatives

❌ Bundle size légèrement plus lourd que Vue pur  
❌ Dépendance forte au framework (migration complexe)  
❌ Courbe apprentissage (syntaxe Quasar + Vue)

### Alternatives rejetées

- **Vuetify** : Moins optimisé mobile, communauté plus petite
- **Element Plus** : Trop orienté desktop/admin
- **Vue pur + TailwindCSS** : Trop de composants à développer from scratch

---

## ADR-002 : Pinia plutôt que Vuex

**Date** : Janvier 2026  
**Statut** : ✅ Acceptée

### Contexte

Besoin de gestion d'état centralisée pour partager données météo/NOTAMs/AZBA entre pages. Vuex est l'ancien standard Vue 2, Pinia est le nouveau recommandé Vue 3.

### Décision

Utiliser **Pinia 3.x** (store officiel Vue 3).

### Conséquences positives

✅ Syntaxe plus simple que Vuex (pas de mutations)  
✅ TypeScript-first (meilleur IntelliSense)  
✅ Composition API native (`setup()`)  
✅ DevTools Vue 3 intégrées  
✅ Hot Module Replacement (HMR)  
✅ Stores modulaires par défaut (pas de namespace)

### Conséquences négatives

❌ Migration documentée si besoin de passer à Vuex (peu probable)

### Alternatives rejetées

- **Vuex 4** : Syntaxe verbeux, pas recommandé Vue 3
- **Context API (provide/inject)** : Pas de DevTools, difficile à scaler
- **Composables seuls** : État non persistant entre routes

---

## ADR-003 : Cache en mémoire plutôt que IndexedDB

**Date** : Janvier 2026  
**Statut** : ✅ Acceptée

### Contexte

Optimiser les appels réseau (données météo/NOTAM toutes les heures). Choisir entre cache mémoire (Map) ou persistant (IndexedDB/localStorage).

### Décision

Implémenter **cache en mémoire** (JavaScript Map) avec TTL.

### Conséquences positives

✅ Simplicité : pas de sérialisation/désérialisation  
✅ Performance : accès instantané (pas d'I/O disque)  
✅ Pas de limite quota (IndexedDB limité à ~50MB)  
✅ Cleanup automatique facile (setInterval)

### Conséquences négatives

❌ Cache perdu au rechargement de page  
❌ Pas de persistance entre sessions  
→ **Acceptable** car Service Worker gère le cache offline persistant

### Alternatives rejetées

- **IndexedDB** : Trop complexe pour données éphémères (TTL 1h)
- **localStorage** : Limite 5-10MB, synchrone (bloque UI), sérialisation coûteuse
- **sessionStorage** : Idem localStorage + perdu à fermeture tab

### Complémentarité

Cache mémoire (TTL 1h) + Service Worker (cache offline) = Meilleur des deux mondes.

---

## ADR-004 : Déduplication des requêtes

**Date** : Janvier 2026  
**Statut** : ✅ Acceptée

### Contexte

En mode stale-while-revalidate, plusieurs composants peuvent déclencher `loadWeather()` simultanément → requêtes dupliquées.

### Décision

Implémenter **déduplication** via Map de Promises dans `useCache`.

### Conséquences positives

✅ Évite N appels simultanés identiques  
✅ Réduit charge serveur  
✅ Améliore UX (pas de flood réseau)  
✅ Transparence : composants ignorent la dédup

### Conséquences négatives

❌ Complexité légèrement accrue dans `useDataFetcher`  
❌ Debugging : une erreur impacte tous les appelants

### Implémentation

```javascript
// Si requête en cours, retourne la Promise existante
if (cache.hasPendingRequest(key)) {
  return cache.getPendingRequest(key)
}
// Sinon, enregistre la nouvelle Promise
cache.setPendingRequest(key, fetchPromise, ttl)
```

---

## ADR-005 : Stale-While-Revalidate activé par défaut

**Date** : Janvier 2026  
**Statut** : ✅ Acceptée

### Contexte

Choisir stratégie cache : cache-first vs network-first vs stale-while-revalidate.

### Décision

Activer **stale-while-revalidate** par défaut dans tous les stores.

### Stratégie

1. Retourne données en cache immédiatement (si valides)
2. Rafraîchit en arrière-plan sans bloquer UI
3. Met à jour silencieusement quand fetch termine

### Conséquences positives

✅ UX instantanée (pas de spinner si cache valide)  
✅ Données fraîches en arrière-plan  
✅ Résilience : continue à fonctionner si réseau lent  
✅ Idéal pour données quasi-temps-réel (météo/NOTAM)

### Conséquences négatives

❌ Peut afficher données légèrement obsolètes (< TTL)  
→ **Acceptable** : indicateur "Mise à jour..." visible pendant refresh

### Alternatives rejetées

- **cache-first** : Données trop anciennes possibles
- **network-first** : UX bloquante (spinner à chaque navigation)
- **network-only** : Pas de bénéfice du cache

---

## ADR-006 : localStorage pour préférences utilisateur uniquement

**Date** : Décembre 2025  
**Statut** : ✅ Acceptée

### Contexte

Besoin de persister préférences utilisateur (NOTAMs masqués, NOTAMs vus).

### Décision

Utiliser **localStorage** pour préférences UI, **jamais pour données métier**.

### Données persistées

- `hiddenNotams` : { id: expirationDate }
- `seenNotams` : { id: expirationDate }

### Conséquences positives

✅ Persistance simple (API synchrone)  
✅ Limite 5-10MB largement suffisante  
✅ Pas de setup complexe  
✅ Support tous navigateurs modernes

### Conséquences négatives

❌ Synchrone (bloque thread principal)  
→ **Acceptable** : volumes faibles (~100 NOTAMs max)  
❌ Pas de sync multi-devices  
→ **Acceptable** : préférences locales par appareil

### Règles strictes

🚫 **JAMAIS** stocker données météo/NOTAM/AZBA dans localStorage  
✅ **UNIQUEMENT** préférences UI (masquage, vus, favoris...)

---

## ADR-007 : Structure JSON pré-générée (pas d'API backend)

**Date** : Décembre 2025  
**Statut** : ✅ Acceptée

### Contexte

Simplifier architecture et éviter coûts backend/base de données.

### Décision

Servir données via **fichiers JSON statiques** pré-générés.

### Architecture actuelle

```
N8N (workflow automation) → Génère JSON toutes les 60 min
                          ↓
Frontend (Vue/Quasar) → Static JSON files
                       (./data/*.json)
```

**Processus confirmé** : N8N (outil d'automatisation workflow) génère les JSON toutes les 60 minutes en récupérant les données des sources officielles (SIA, Météo France, etc.).

### Conséquences positives

✅ Simplicité déploiement (static hosting : GitHub Pages, Netlify...)  
✅ Coût zéro (pas de serveur)  
✅ Performance (CDN, cache HTTP)  
✅ Scalabilité infinie (static files)  
✅ Pas de CORS issues

### Conséquences négatives

❌ Pas de données "vraiment" temps réel (dépend génération JSON)  
❌ Pas d'API pour filtrage côté serveur  
❌ Fichiers potentiellement lourds (tous les NOTAMs France ?)

### Alternatives rejetées

- **API REST backend** : Coûts serveur, complexité, maintenance
- **Firebase/Supabase** : Dépendance tierce, coûts potentiels
- **GraphQL** : Over-engineering pour ce use case

### Processus de génération (N8N)

**Outil** : N8N (n8n.io) - Workflow automation open source  
**Fréquence** : Toutes les 60 minutes  
**Sources** : SIA, Météo France Aviation, et autres sources officielles  
**Déploiement** : Processus backend indépendant du frontend

---

## ADR-008 : Pas de TypeScript

**Date** : Décembre 2025  
**Statut** : ✅ Acceptée

### Contexte

Choisir entre JavaScript et TypeScript pour le codebase.

### Décision

Rester en **JavaScript pur** (pas de migration TypeScript).

### Conséquences positives

✅ Setup plus simple (pas de tsconfig.json)  
✅ Itération rapide (pas de compilation)  
✅ Courbe apprentissage réduite (pilotes = devs occasionnels ?)  
✅ Compatible ESLint/Prettier sans config TS

### Conséquences négatives

❌ Pas de type safety (erreurs runtime possibles)  
❌ IntelliSense limité (JSDoc non utilisé)  
❌ Refactoring plus risqué

### Mitigations

- ESLint strict (vue/recommended)
- Tests manuels rigoureux
- JSDoc sur fonctions critiques (recommandé mais pas appliqué)

### Évolution future

Si codebase dépasse 10k lignes ou équipe grandit → Reconsidérer TypeScript.

---

## ADR-009 : Mode hash plutôt que history (Vue Router)

**Date** : Décembre 2025  
**Statut** : 🔄 **Amendée le 05/08/2026 — passage en mode `history`** (voir « Amendement » en fin d'ADR)

### Contexte

Choisir mode routing pour Vue Router : `hash` (#/weather) vs `history` (/weather).

### Décision

Utiliser **mode hash** (`vueRouterMode: 'hash'`).

### Configuration

```javascript
// quasar.config.js
build: {
  vueRouterMode: 'hash',
  publicPath: '/lffi/'
}
```

### Conséquences positives

✅ Fonctionne sur static hosting sans config serveur  
✅ Pas de 404 sur refresh (hash ignoré par serveur)  
✅ Compatible GitHub Pages / Netlify out-of-the-box

### Conséquences négatives

❌ URLs moins "propres" (/#/weather au lieu de /weather)  
❌ Pas de SSR possible (mode hash only CSR)  
❌ Analytics : hash non envoyé par défaut (config nécessaire)

### Alternatives rejetées

- **mode history** : Nécessite config serveur (fallback index.html)  
  → Complexité déploiement pour gain esthétique faible

### Amendement du 05/08/2026 : passage en mode `history`

**Décision** : `vueRouterMode: 'history'`.

**Ce qui a changé depuis décembre 2025** :

- Le passage en production à la racine d'un domaine dédié (`brief.aeroclub-ancenis.fr`, hébergement
  Apache/OVH) s'accompagne de toute façon d'une configuration serveur : ajouter un fallback SPA
  n'est plus un surcoût, juste une ligne de plus dans un `.htaccess` déjà nécessaire.
- L'ouverture open source rend les URLs partageables un vrai sujet : les liens directs vers un REX
  (FEAT-032) circulent par copier-coller, et `/#/rex-ffa?rexId=3076` est à la fois moins lisible et
  moins bien traité par les aperçus de lien.
- Le motif « pas de 404 sur refresh » disparaît dès lors que le fallback est en place.

**Conséquences** :

- ✅ URLs propres et partageables ; analytics et aperçus de lien fonctionnent sans configuration.
- ⚠️ **Un fallback SPA devient obligatoire** : sans lui, tout accès direct à une URL profonde
  (ou tout rafraîchissement ailleurs qu'à la racine) renvoie un 404 serveur. Le `.htaccess` est
  fourni dans `deploy/` et documenté dans `docs/DEPLOYMENT.md`. **Un fork déployé sur un
  hébergement sans réécriture d'URL doit repasser cette valeur à `'hash'`** — c'est le seul
  changement nécessaire, le code ne dépend nulle part du hash.
- Le lien direct vers un REX (`RexCard.copyLink`) résolvait déjà l'URL contre `window.location.href`
  plutôt que de concaténer le hash : il fonctionne dans les deux modes, sans modification.

---

## ADR-010 : Leaflet plutôt que Google Maps

**Date** : Décembre 2025  
**Statut** : ✅ Acceptée (hypothèse)

### Contexte

Afficher zones AZBA sur carte interactive (supposé, non confirmé dans code scanné).

### Décision

Utiliser **Leaflet.js** + @vue-leaflet/vue-leaflet.

### Conséquences positives

✅ Open source (gratuit, pas de clé API)  
✅ Léger (~40KB vs ~100KB Google Maps)  
✅ Intégration Vue 3 native (@vue-leaflet)  
✅ Tiles OpenStreetMap gratuites  
✅ Plugins riches (zones, markers, popups...)

### Conséquences négatives

❌ Moins de features que Google Maps (traffic, Street View...)  
→ **Non nécessaire** pour affichage zones AZBA

### Alternatives rejetées

- **Google Maps API** : Coûts (API key, quotas), dépendance Google
- **Mapbox** : Coûts si dépassement quotas
- **OpenLayers** : Plus complexe, overkill pour ce use case

---

## ADR-011 : Traduction METAR/TAF en français

**Date** : Décembre 2025  
**Statut** : ✅ Acceptée

### Contexte

METAR/TAF utilisent Q-codes OACI (FEW, SCT, BKN, OVC...) incompréhensibles pour pilotes débutants.

### Décision

Implémenter **traductions françaises complètes** dans `metarTranslations.js` (~900 lignes).

### Exemples

- `FEW020` → "Quelques nuages à 2000 pieds"
- `TEMPO` → "Temporairement"
- `BECMG` → "Devenant"
- `CAVOK` → "Ciel clair et visibilité > 10 km"

### Conséquences positives

✅ Accessibilité pilotes PPL débutants  
✅ Briefing plus rapide (pas de décodage mental)  
✅ Différenciant vs sites concurrents

### Conséquences négatives

❌ Maintenance : ~900 lignes à tenir à jour  
❌ Risque traductions incorrectes (erreur humaine)

### Évolution

Considérer librairie externe si disponible (metar-parser, aviation-weather-parser ?).

---

## ADR-012 : Service Worker avec Workbox

**Date** : Décembre 2025  
**Statut** : ✅ Acceptée

### Contexte

PWA nécessite Service Worker pour mode offline et installation.

### Décision

Utiliser **Workbox 7.x** (Google) via Quasar PWA mode.

### Stratégies de cache

- **Precaching** : Assets statiques (JS, CSS, HTML)
- **Network-first** : Données JSON (data/\*.json)
- **Cache-first** : Images, fonts, icônes

### Conséquences positives

✅ Mode offline fonctionnel  
✅ Installation PWA (Add to Home Screen)  
✅ Performance (assets en cache)  
✅ Configuration déclarative (workbox-config.js)

### Conséquences négatives

❌ Complexité debugging (cache layers multiples)  
❌ Invalidation cache parfois nécessaire (clear storage)

### Configuration

Voir `src-pwa/custom-service-worker.js` pour stratégies custom.

---

## ADR-013 : Pas d'authentification utilisateur

**Date** : Décembre 2025  
**Statut** : ✅ Acceptée

### Contexte

Toutes les données sont publiques (NOTAM, météo SIA, AZBA...).

### Décision

**Aucune authentification** implémentée (pas de login/signup).

### Conséquences positives

✅ Simplicité maximale (pas de backend users)  
✅ Pas de RGPD complexe (pas de données perso)  
✅ UX fluide (accès direct sans friction)

### Conséquences négatives

❌ Pas de sync préférences multi-devices  
❌ Pas de fonctionnalités collaboratives (partage briefing)  
❌ Pas de profil personnalisé (favoris aérodromes...)

### Évolution future

Si besoin sync multi-devices → Considérer Firebase Auth ou similaire.

---

## ADR-014 : Pas de tests automatisés (pour l'instant)

**Date** : Décembre 2025  
**Statut** : ⚠️ Acceptée temporairement

### Contexte

Projet en développement rapide, équipe réduite (1 personne ?).

### Décision actuelle

**Pas de tests unitaires/e2e** pour l'instant.

### Conséquences négatives

❌ Risque régression sur refactoring  
❌ Confiance limitée sur modifications  
❌ Documentation implicite manquante (tests = spec)

### Plan futur recommandé

- **Phase 1** : Tests unitaires critiques (filters, helpers)
- **Phase 2** : Tests composants (METAR decoder, NOTAM filters)
- **Phase 3** : Tests e2e (Cypress/Playwright)

### Stack suggérée

- **Vitest** (compatible Vite, rapide)
- **@vue/test-utils** (tests composants Vue)
- **Playwright** (e2e cross-browser)

---

## ADR-015 : ESLint 9 avec Flat Config

**Date** : Janvier 2026  
**Statut** : ✅ Acceptée

### Contexte

ESLint 9 introduit nouveau format config (flat config vs eslintrc).

### Décision

Utiliser **ESLint 9 avec flat config** (`eslint.config.js`).

### Configuration

```javascript
// eslint.config.js
import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import prettier from '@vue/eslint-config-prettier'

export default [js.configs.recommended, ...pluginVue.configs['flat/recommended'], prettier]
```

### Conséquences positives

✅ Format moderne (future-proof)  
✅ Meilleure composition (arrays vs extends)  
✅ Type-safe config (import natif)

### Conséquences négatives

❌ Breaking change vs ESLint 8  
❌ Plugins doivent supporter flat config

---

## ADR-016 : TTL et seuil d'obsolescence configurables par endpoint

**Date** : 23/02/2026  
**Statut** : ✅ Acceptée

### Contexte

Tous les endpoints partageaient un unique `API_CONFIG.refreshInterval` (5 min) pour le TTL cache client, et un seuil visuel d'obsolescence hardcodé à 2h dans `getUpdateClass()`. Or, les données VAC sont générées 1×/jour (9h UTC) tandis que la météo/NOTAMs/AZBA sont horaires. Le seuil de 2h rendait la page VAC perpétuellement « orange ». De plus, des pages futures pourraient avoir des cycles de 10 min.

### Décision

Chaque endpoint dans `API_CONFIG.endpoints` est désormais un objet `{ url, refreshInterval, staleThreshold }` :

- `refreshInterval` : TTL cache client (combien de temps `useDataFetcher` considère les données fraîches avant re-fetch)
- `staleThreshold` : seuil en ms au-delà duquel `UpdateStatusIndicator` affiche un fond d'avertissement orange

Un helper `getEndpointConfig(name)` centralise la résolution avec fallback sur les valeurs par défaut.

### Conséquences positives

✅ Chaque domaine de données a son propre cycle de fraîcheur adapté  
✅ Ajout d'un nouvel endpoint avec cycle custom = 3 lignes dans `app.config.js`  
✅ `getUpdateClass()` et `UpdateStatusIndicator` acceptent un seuil paramétrable (rétrocompatible)  
✅ Infrastructure existante (`useDataFetcher`, `useCache`) inchangée — seule la config est enrichie

### Conséquences négatives

❌ Les pages doivent passer explicitement `:stale-threshold` à `UpdateStatusIndicator`  
❌ `API_CONFIG.refreshInterval` (global) conservé pour rétrocompatibilité mais marqué `@deprecated`

### Alternatives rejetées

- **Seuil proportionnel automatique** (1.5× le cycle) : risque d'espacement trop grand ou trop court selon les cas, préférence pour des valeurs explicites et prévisibles
- **Maps séparées** (`refreshIntervals: {}`, `staleThresholds: {}`) : structure plus dispersée, un objet par endpoint est plus cohérent et auto-documenté

### Implémentation

```javascript
// app.config.js
endpoints: {
  vac: { url: './data/vac.json', refreshInterval: 3600000, staleThreshold: 93600000 },
  weather: { url: './data/weather.json', refreshInterval: 300000, staleThreshold: 5400000 },
}

// Store
import { getEndpointConfig } from '../config/app.config'
const config = getEndpointConfig('weather')
useDataFetcher(config.url, { ttl: config.refreshInterval, ... })

// Page
<UpdateStatusIndicator :stale-threshold="getEndpointConfig('weather').staleThreshold" />
```

---

## 📝 Template pour Nouvelles Décisions

```markdown
## ADR-XXX : Titre de la décision

**Date** : JJ/MM/AAAA  
**Statut** : 🟡 Proposée / ✅ Acceptée / ❌ Rejetée / ⚠️ Obsolète

### Contexte

Pourquoi cette décision est nécessaire ?

### Décision

Qu'avons-nous choisi ?

### Conséquences positives

✅ Avantages

### Conséquences négatives

❌ Inconvénients

### Alternatives rejetées

- Option A : raison rejet
- Option B : raison rejet

### Implémentation

Code/config si pertinent
```

---

## ADR-018 : Seuils VFR configurables par l'utilisateur

**Date** : 23 février 2026
**Statut** : ✅ Acceptée

### Contexte

Les paramètres météo (visibilité, plafond, vent, rafales) affichés sur la page Météo n'avaient aucune indication visuelle de criticité pour le vol VFR. Les seuils de vent traversier dans le `RunwayDisplay` étaient hardcodés (10/15 kts). Un pilote VFR doit pouvoir identifier rapidement si les conditions sont favorables, marginales ou défavorables.

### Décision

- **Seuils VFR par défaut** (standards OACI) définis dans `app.config.js` (`VFR_THRESHOLDS_DEFAULTS`)
- **Composable `useVfrThresholds`** : singleton réactif partagé, persisté dans `localStorage` (`STORAGE_KEYS.VFR_THRESHOLDS`, cf. ADR-030)
- **Utilitaire `vfrCriticality.js`** : fonctions pures (`getVfrLevel`, `getVfrBgClass`, `getVfrLabel`, `parseCeiling`, `formatVisibilityText`, `formatCeilingText`) utilisées par les composants
- **Page de réglages** `/vfr-settings` (`VfrSettingsPage.vue`) accessible depuis le drawer "Paramètres"
- **Colorisation** : fond `bg-green-1` / `bg-orange-1` / `bg-red-1` sur les cartes vent, visibilité, plafond (Conditions Estimées + Prévisions 6h), et fond coloré par `fltCat` sur les blocs aérodromes
- **Accessibilité** : labels textuels (VFR/Marginal/Défavorable) en complément des couleurs

### Conséquences positives

✅ Information VFR critique visible au premier coup d'œil
✅ Seuils personnalisables par chaque utilisateur (localStorage)
✅ Centralisation : les seuils crosswind du RunwayDisplay et la colorisation météo partagent la même config
✅ Ajout d'un label textuel en plus de la couleur (accessibilité daltoniens)

### Conséquences négatives

❌ Un objet de plus dans localStorage (impact négligeable)
❌ Les aérodromes utilisent le `fltCat` backend (non affecté par les seuils utilisateur)

### Alternatives rejetées

- **Seuils dans le code uniquement** : rejeté car l'utilisateur veut pouvoir ajuster via l'UI
- **Store Pinia dédié** : rejeté car les seuils sont des préférences UI simples (pas de logique métier complexe), un composable + localStorage est plus léger et cohérent avec les patterns existants (`useHiddenNotams`, `useSeenNotams`)
- **`STORAGE_KEYS.USER_PREFERENCES` générique** : rejeté au profit d'une clé dédiée et explicite `VFR_THRESHOLDS`

### Implémentation

- `src/config/app.config.js` → `VFR_THRESHOLDS_DEFAULTS`
- `src/config/constants.js` → `STORAGE_KEYS.VFR_THRESHOLDS`
- `src/composables/useVfrThresholds.js`
- `src/utils/vfrCriticality.js`
- `src/pages/VfrSettingsPage.vue` (route `/vfr-settings`)
- Composants modifiés : `WeatherCurrentConditions`, `WeatherForecast`, `AerodromesList`, `RunwayDisplay`
- `src/services/metarTranslations.js` → exports centralisés `translateFlightCategory`, `getFlightCategoryColor`, `getFlightCategoryBgClass`

---

## ADR-019 : ECharts comme bibliothèque de visualisation graphique

**Date** : 26/02/2026
**Statut** : ✅ Acceptée

### Contexte

L'application a besoin de visualisations graphiques pour la page Weather Station (station météo locale LFFI) : rose des vents polaire, séries temporelles vent/température/pression. Aucune bibliothèque de graphique n'était installée.

### Décision

Installer **Apache ECharts** (`echarts` + `vue-echarts`) comme bibliothèque de visualisation :

- `echarts` : moteur de rendu graphique (~300KB gzip), support natif des coordonnées polaires, séries temporelles multi-axes, thèmes
- `vue-echarts` : wrapper Vue 3 officiel fournissant `<v-chart>` avec réactivité, auto-resize et lazy-loading des modules

### Conséquences positives

✅ Support natif des charts polaires (rose des vents) sans hack
✅ Séries temporelles multi-axes (température + humidité sur un même graphe)
✅ Thèmes dark/light, tooltips interactifs, responsive out-of-the-box
✅ Wrapper Vue officiel avec `autoresize` et réactivité des options
✅ Bibliothèque mature et activement maintenue (projet Apache)

### Conséquences négatives

❌ Taille du bundle : ~300KB gzip (mitigé par tree-shaking des modules non utilisés)
❌ Nouvelle dépendance majeure à maintenir

### Alternatives rejetées

- **Chart.js** (~60KB) : pas de vrai chart polaire natif, le radar chart ne convient pas pour une rose des vents avec directions arbitraires
- **ApexCharts** (~130KB) : polar area chart limité, pas de meilleur rapport taille/fonctionnalités pour ce cas d'usage
- **D3.js** (~90KB) : trop bas niveau, nécessiterait beaucoup de code custom pour chaque visualisation
- **SVG/Canvas natif** : effort d'implémentation disproportionné, pas d'interactivité (tooltip, zoom)

### Implémentation

- `package.json` → dépendances `echarts` + `vue-echarts`
- Composants : `WindRose.vue`, `WindHistory.vue`, `TempHumidityChart.vue`, `PressureChart.vue`
- Import par composant (tree-shaking) : `use([CanvasRenderer, PolarComponent, LineChart, ...])`

---

## ADR-020 : Découpage de la station locale en 3 stores spécialisés + 1 coordinateur

**Date** : 28/03/2026
**Statut** : ✅ Acceptée

### Contexte

`stationStore` centralisait 3 sources JSON différentes (`wind_history.json`, `atmosphere.json`, `wind_current.json`) via 3 fetchers internes.
Cette approche fonctionnait, mais rendait le store trop volumineux (surface d'API large), moins testable et incohérente avec la règle d'architecture : **1 store = 1 domaine métier**.

### Décision

Découper en 3 stores spécialisés :

- `useStationWindHistoryStore()`
- `useStationAtmosphereStore()`
- `useStationWindCurrentStore()`

Conserver `useStationStore()` comme **store coordinateur** pour :

- orchestrer les actions globales (`loadStation`, `forceRefresh`, `invalidate`)
- fournir un point d'entrée global aux couches transverses (ex: layout)

### Conséquences positives

✅ Architecture alignée avec le principe SRP (single responsibility)
✅ Stores plus lisibles, plus faciles à maintenir et tester
✅ TTL et stratégie de rafraîchissement indépendants par sous-domaine station
✅ Migration progressive sans régression, puis simplification finale du coordinateur

### Conséquences négatives

❌ Plus de fichiers stores à maintenir
❌ Plus de stores explicites à connaître dans les pages de diagnostic et station

### Alternatives rejetées

- **Conserver le super-store unique** : rejeté pour dette technique et incohérence de pattern
- **Exposer durablement un coordinateur riche (état + alias + orchestration)** : rejeté, car cela réintroduit une API large et une responsabilité mixte

### Implémentation

- Nouveaux fichiers :
  - `src/stores/stationWindHistoryStore.js`
  - `src/stores/stationAtmosphereStore.js`
  - `src/stores/stationWindCurrentStore.js`
- `src/stores/stationStore.js` refactoré en coordinateur minimal (actions globales uniquement)
- Documentation synchronisée : `ARCHITECTURE.md`, `ai/AGENT_GUIDE.md`

---

## ADR-021 : Éphémérides pré-calculées par N8N (IMCCE) servies en JSON statique

**Date** : 31/05/2026
**Statut** : ✅ Acceptée — ⚠️ borne du jour aéronautique **remplacée par ADR-023**
(coucher +30 / lever −30, règle FR). La source IMCCE et l'archi N8N/JSON restent valides.

### Contexte

FEAT-024 demande le lever/coucher du soleil et la fin du jour aéronautique pour LFFI.
Le TODO initial évoquait un calcul côté front via la bibliothèque SunCalc. Or
l'architecture (ADR-007 : pas de backend, données pré-générées par N8N et servies en
JSON statique) et le mode hors-ligne (FEAT-027) imposent que toute donnée transite par
un fichier statique. Calculer en front ajouterait une dépendance npm et un chemin de
données divergent du reste de l'app. Par ailleurs, l'autorité de référence en France
pour les heures aéronautiques est l'IMCCE (Institut de Mécanique Céleste et de Calcul
des Éphémérides).

### Décision

Les éphémérides sont calculées par le workflow N8N via l'API IMCCE Miriade RTS
(`-body=11`, `-twilight=1` pour les crépuscules civils, `-nbd=30` pour 30 jours en un
seul appel), normalisées et écrites dans `public/data/ephemeris.json` (1×/jour, sous
forme d'un tableau `days[]` de 30 jours). Le front lit ce JSON via `useDataFetcher`
(endpoint `ephemeris`), exactement comme tous les autres feeds. La **fin du jour
aéronautique** est définie comme le **crépuscule civil IMCCE** (`dusk-civil`), pas une
approximation forfaitaire « coucher +30 min » ; le **début du jour aéronautique** est le
crépuscule civil du matin (`dawn-civil`). Aucun calcul astronomique ni dépendance npm
côté front : le helper `ephemerisHelpers.js` ne fait que du formatage (heure locale FR +
UTC), des diffs temporels et la sélection du jour à afficher.

Affichage : une carte résumé (jour courant, avec comptes à rebours temps réel vers le
coucher / la fin du jour aéro, puis vers le début du jour aéro suivant la nuit) sur
l'Accueil (compact, tuiles) et la page Météo, plus une **page dédiée `/ephemerides`**
permettant de naviguer sur les 30 jours (slider + flèches) avec heures et durées du jour.
Les comptes à rebours temps réel ne concernent que le jour courant.

### Conséquences positives

- ✅ Cohérence totale avec ADR-007 : un seul mécanisme de données (JSON statique).
- ✅ Fonctionne hors-ligne (cache localStorage de `useDataFetcher`), cf. FEAT-027.
- ✅ Source faisant autorité (IMCCE), crépuscule civil réel plutôt qu'approximation.
- ✅ Zéro dépendance npm ajoutée ; bundle inchangé.
- ✅ Front purement présentation : helper pur testable, pas de logique astronomique.

### Conséquences négatives

- ❌ Le feature dépend d'un job N8N à mettre en place (front inerte sans le fichier ;
  il affiche « Éphémérides indisponibles » sans erreur bloquante en attendant).
- ❌ Granularité journalière : pas de recalcul intra-journée (acceptable, les heures
  solaires d'un jour donné sont fixes).

### Alternatives rejetées

- **Calcul front via SunCalc** : dépendance npm + chemin de données hors ADR-007,
  divergent du reste de l'app.
- **Appel API IMCCE live depuis le front** : pas de backend, risque CORS, casse le
  hors-ligne — contraire à ADR-007.
- **Enrichir `airfield.json`** : fichier quasi-statique vs donnée quotidienne ; brouille
  la sémantique de fraîcheur et couple deux cycles N8N distincts.

### Implémentation

- `src/config/app.config.js` : endpoint `ephemeris` (refresh 1h / stale 26h).
- `src/utils/ephemerisHelpers.js` (format `days[]`, `findTodayIndex`, sélection de jour),
  `src/composables/useNow.js`, `src/stores/ephemerisStore.js`,
  `src/components/common/SunTimes.vue` (carte résumé + variante compacte à tuiles).
- `src/pages/EphemerisPage.vue` (page dédiée `/ephemerides`, navigation jour par jour
  slider + flèches sur toute la fenêtre `days[]`) ; route dans `src/router/routes.js` ;
  entrée menu dans `src/layouts/MainLayout.vue` et `src/stores/customizationStore.js`.
- `src/components/ephemeris/EphemerisEvolutionChart.vue` : graphique ECharts d'évolution
  sur toute la fenêtre `days[]`. Axe Y gauche = heure locale 0–24 h (courbes lever/coucher
  - bornes aéro ; bandes empilées nuit / crépuscule aéro / jour ; markLine du jour
    sélectionné) ; axe Y droit = durée du jour aéronautique en h (tracée sur son propre
    axe car une durée n'est pas une heure de la journée). Réutilise
    `addMinutes`/`AERO_NIGHT_OFFSET_MIN`/`formatLocalUTC`/`formatDuration`. Affiché par
    `EphemerisPage.vue` dès que `days.length > 1`.
- Intégrations : `WeatherPage.vue` (carte complète) et `IndexPage.vue` (variante compacte).
- Dépendance externe : workflow N8N produisant `public/data/ephemeris.json` (tableau
  `days[]`, IMCCE RTS `-nbd=N -twilight=1` ; N actuellement ~90 jours). Le front
  s'adapte à la longueur reçue, aucune valeur de N codée en dur.

### Contrat JSON `public/data/ephemeris.json`

```json
{
  "generatedAt": "2026-05-31T03:00:00Z",
  "observer": { "lat": 47.408, "lon": -1.177, "icao": "LFFI" },
  "source": "IMCCE Miriade RTS",
  "days": [
    {
      "date": "2026-05-31",
      "civilDawn": "2026-05-31T03:51:00Z",
      "sunrise": "2026-05-31T04:27:00Z",
      "sunset": "2026-05-31T19:43:00Z",
      "civilDusk": "2026-05-31T20:19:00Z"
    }
  ]
}
```

Toutes les heures en ISO 8601 UTC. `days[]` ordonné par date croissante (N entrées,
N ≈ 90 actuellement ; le front s'adapte à la longueur).
Le front sélectionne le jour courant par `date` ; le compte à rebours nocturne vise le
`civilDawn` du jour suivant dans le tableau. Le helper reste rétro-compatible avec un
ancien format mono-jour `{ today, tomorrow }` (utile en transition).

---

## ADR-022 : Tests unitaires Vitest (setup manuel, sans app-extension Quasar)

**Date** : 06/06/2026
**Statut** : ✅ Acceptée

### Contexte

Le projet n'avait aucun runner de test (`npm test` était un no-op). Plusieurs domaines
portent pourtant une logique pure sécurité-critique pour le VFR : calculs de composantes
de vent / vent traversier (`windHelpers`), QNH et point de rosée (`stationHelpers`),
décision Go/No-Go (`goNoGoHelpers`), criticité VFR (`vfrCriticality`), parsing NOTAM et
éphémérides. Une régression silencieuse y est invisible (pas de backend, pas de typage).
TECH-001 (priorité 🔴) demandait des tests unitaires sur utils, composables et stores.

### Décision

Adopter **Vitest** (natif Vite, partage la résolution `@/`) avec un **setup manuel**
plutôt que l'app-extension `@quasar/testing-unit-vitest`.

- `vitest.config.js` : `@`→`src`, environnement `happy-dom`, `setupFiles`, couverture v8.
- `tests/setup.js` : mock du paquet `quasar` (`Notify`, `copyToClipboard`), reset
  `localStorage` entre tests.
- Dépendances : `vitest`, `@vue/test-utils`, `@pinia/testing`, `happy-dom`,
  `@vitest/coverage-v8`.
- Scripts : `test` (run), `test:watch`, `test:cov`.
- Arborescence `tests/unit/{utils,composables,stores}`.

### Conséquences positives

- ✅ Filet de sécurité sur les calculs aéro et la couche data-flow (cache, SWR, dedup).
- ✅ Moins de dépendances et de boilerplate que l'app-extension ; contrôle total du mock
  Quasar (les utils n'ont pas besoin de tout Quasar).
- ✅ 143 tests couvrant 7 utils + 3 composables + 2 stores ; les fichiers visés sont
  couverts à 75–98 %.
- ✅ Résout partiellement ADR-014 (« Tests auto »).

### Conséquences négatives

- ❌ Setup à maintenir à la main (vs convention clé-en-main de l'extension Quasar).
- ❌ Les composants `.vue` ne sont pas encore testés (hors périmètre TECH-001 ; viendra
  avec les tests d'intégration `@vue/test-utils`).

### Alternatives rejetées

- **App-extension `@quasar/testing-unit-vitest`** : ajoute des dépendances et du
  boilerplate d'extension pour un bénéfice marginal sur un setup que l'on maîtrise.
- **Jest** : moins bien intégré à Vite/ESM, configuration plus lourde.
- **Rester sans tests** : inacceptable vu la criticité des calculs VFR.

### Implémentation

- `vitest.config.js`, `tests/setup.js`, scripts `package.json`.
- Specs : `tests/unit/utils/{windHelpers,stationHelpers,goNoGoHelpers,vfrCriticality,notamHelpers,dateHelpers,ephemerisHelpers}.spec.js`,
  `tests/unit/composables/{useCache,useDataFetcher,useLocalStorageSet}.spec.js`,
  `tests/unit/stores/{notamStore,weatherStore}.spec.js`.
- CI : `.github/workflows/ci.yml` (lint + `npm test`, Node 22 full-ICU, `TZ=UTC`) sur push/PR `main`.
- Lint étendu à `tests/**` + `vitest.config.js` (globals Vitest dans `eslint.config.js`).
- Docs synchronisées : `CLAUDE.md`, `ai/AGENT_GUIDE.md`.

---

## ADR-023 : Borne du jour aéronautique = coucher +30 / lever −30 (règle FR), pas le crépuscule civil

**Date** : 06/06/2026
**Statut** : ✅ Acceptée — **remplace partiellement ADR-021** (définition de la borne uniquement ; la source IMCCE et l'architecture N8N/JSON statique restent inchangées)

### Contexte

ADR-021 fixait la fin/début du jour aéronautique sur le **crépuscule civil** IMCCE
(`dusk-civil` / `dawn-civil`, soleil à 6° sous l'horizon). Vérification réglementaire :
SERA (règlement UE 923/2012) définit la nuit par défaut via les crépuscules civils,
**mais autorise explicitement l'autorité nationale à prescrire une autre période entre
coucher et lever**. La France a usé de cette dérogation : la **nuit aéronautique court de
30 min après le coucher du soleil à 30 min avant le lever** (valeur nationale DGAC,
enseignée en PPL). À LFFI en été, le crépuscule civil tombe à ≈ ±40 min du coucher/lever :
l'écart avec la règle FR atteint ~10 min — significatif pour une borne VFR de jour.

### Décision

La borne du jour aéronautique est dérivée de `sunrise`/`sunset` (toujours fournis par
IMCCE) avec l'offset réglementaire FR : `aeroDawn = sunrise − 30 min`,
`aeroDusk = sunset + 30 min` (constante `AERO_NIGHT_OFFSET_MIN = 30`). Calcul **100 %
front, fonction pure** dans `ephemerisHelpers.js` (`addMinutes`) : aucun changement du
workflow N8N ni du contrat `ephemeris.json`. IMCCE reste la source faisant autorité pour
le lever/coucher ; on n'applique qu'un offset réglementaire par-dessus. Les crépuscules
civils (`civilDawn`/`civilDusk`) restent présents dans le JSON mais **ne sont plus la
borne aéro** et ne sont plus affichés.

### Conséquences positives

- ✅ Conforme à la réglementation FR (dérogation SERA), contrairement à ADR-021.
- ✅ Zéro changement N8N : l'offset est trivial, dérivé de données déjà servies.
- ✅ Reste « basé IMCCE » (lever/coucher exacts) + fonctions pures testables.

### Conséquences négatives

- ❌ Champs `civilDawn`/`civilDusk` du JSON désormais inutilisés (conservés, inertes).
- ❌ Inverse un choix antérieur acté avec l'instructeur (cf. ADR-021) ; tranché côté
  utilisateur en faveur de la règle réglementaire FR.

### Alternatives rejetées

- **Garder le crépuscule civil** (ADR-021) : non conforme à la dérogation FR.
- **Faire produire `aeroDawn`/`aeroDusk` par N8N** : touche un workflow externe pour un
  offset arithmétique calculable côté front — surcoût injustifié.

### Implémentation

- `src/utils/ephemerisHelpers.js` : `AERO_NIGHT_OFFSET_MIN`, `addMinutes`, bornes aéro
  dans `parseEphemeris`/`getDaylightState`/`getNextEvent`/`getDayMetrics` (état
  `civil-twilight` renommé `twilight`).
- `src/components/common/SunTimes.vue`, `src/pages/EphemerisPage.vue` : pointent sur
  `aeroDawn`/`aeroDusk`.
- Tests : `tests/unit/utils/ephemerisHelpers.spec.js` (jeu civil ±40 prouvant l'offset ±30).

---

## ADR-024 : Fichiers `.aircraft` (XML) source de vérité, parsés côté client + `aircrafts.json` index/complément

**Date** : 06/06/2026
**Statut** : ✅ Acceptée — **déroge localement à ADR-001/flux de données** (les stores ne `fetch()` que du JSON) pour le seul domaine Avion

### Contexte

La page Préparation vol (FEAT-015/016/017/021/022/023) a besoin, par avion, de la
masse & centrage, des points de chargement, de l'enveloppe, de la conso carburant,
du tarif horaire et des check-lists. Ces données sont **déjà** maintenues par le club
dans un logiciel externe qui exporte un fichier `.aircraft` (format XML SkyDemon).
Imposer une re-saisie en JSON dupliquerait la donnée et la ferait diverger.

Le contrat de flux historique (cf. architecture) veut que les stores passent par
`useDataFetcher` → `useCache` → `fetch('*.json')` et ne manipulent **que du JSON**.

### Décision

Les fichiers `.aircraft` sont déposés tels quels dans `public/data/aircrafts/` et font
**autorité**. Un index `public/data/aircrafts.json` (servi via l'endpoint `aircrafts` du
registre `app.config.js`, comme les autres) liste chaque avion (`registration` → `source`)
et **complète** ce qui manque au XML (tables de performances décollage/atterrissage POH,
densité carburant). `aircraftStore` charge l'index via `useDataFetcher` (JSON, conforme),
puis **fetch + parse le XML côté client** (`DOMParser`, util pur `aircraftXml.js`) et fusionne
le complément. Déposer un nouveau `.aircraft` suffit : pas de build, pas d'étape N8N.

### Conséquences positives

- ✅ Source unique : la donnée avion reste celle du logiciel du club, zéro re-saisie.
- ✅ Mise à jour = déposer le fichier dans le dépôt ; aucun pipeline à toucher.
- ✅ Parsing isolé en fonction pure testée (`aircraftXml.spec.js`, contre un vrai `.aircraft`).
- ✅ L'index/complément reste du JSON classique (cache, persistance, stale-while-revalidate).

### Conséquences négatives

- ❌ Une seule entorse au « stores = JSON only » : `aircraftStore` fait un `fetch()` texte
  du XML (documenté en tête de store). Acceptée car les `.aircraft` sont statiques.
- ❌ `DOMParser` côté client (dispo navigateur + happy-dom en test) ; pas de validation de
  schéma — un `.aircraft` malformé est ignoré par avion (erreur isolée), pas bloquant.

### Alternatives rejetées

- **Convertir `.aircraft` → JSON via N8N/build** : ajoute un pipeline pour une donnée
  statique rarement modifiée et casse le « dépose le fichier, c'est pris en compte ».
- **Re-saisir en JSON** : duplication + divergence avec le logiciel du club.

### Implémentation

- `src/utils/aircraftXml.js` : `parseAircraftXml` (masse/centrage, postes, enveloppe,
  carburant, tarif, check-lists ; libellés de postes traduits FR), `parseEnvelope`, `slugify`.
- `public/data/aircrafts.json` : index + `defaultPerformance` (illustratif) + `fuelDensity`.
- `src/stores/aircraftStore.js` : index via `useDataFetcher`, XML via `fetch().text()`,
  sélection persistée (localStorage). `weightBalanceStore`/`performanceStore` en dépendent.

---

## ADR-025 : Stress thermique calculé côté front depuis la station locale (grille FFA transcrite)

**Date** : 20/06/2026
**Statut** : ✅ Acceptée

### Contexte

La Commission Prévention Sécurité FFA publie un diagramme « Risques individuels liés à la
chaleur » (2025_07_01) : une grille température de l'air × humidité relative classant le
risque de coup de chaleur du pilote en 4 zones. Document plastifié, consulté manuellement
au club. L'app dispose déjà d'une station météo locale exposant température et humidité en
temps réel (`stationAtmosphereStore`).

Contrairement aux éphémérides (ADR-021), où l'autorité de calcul est externe (IMCCE) et le
résultat nécessairement pré-calculé par N8N, la grille FFA est une **table de correspondance
fixe** : le « calcul » est une simple lecture de cellule.

### Décision

Le stress thermique est **calculé côté front**, sans nouveau flux de données. La grille FFA
est transcrite fidèlement (extraction pixel du PDF officiel + vérification contre le doc
plastifié) dans `THERMAL_STRESS_ZONES` (`app.config.js`), encodée en seuils de température
par colonne d'humidité. Un helper pur (`thermalStressHelpers.js`) mappe (température,
humidité) → zone, applique le décalage personnel (âge/pathologie, nota FFA) et fournit le
texte des recommandations. La vigilance canicule Météo-France n'est **pas** intégrée (elle
exigerait un flux backend) ; elle reste mentionnée comme élément de décision complémentaire.

### Conséquences positives

- ✅ Zéro dépendance backend : fonctionne hors-ligne, pas de job N8N à maintenir.
- ✅ Réutilise les données station déjà chargées (température + humidité).
- ✅ Logique isolée en fonction pure testée (`thermalStressHelpers.spec.js`).
- ✅ Mise à jour de la grille = éditer une constante (la référence reste le doc FFA).

### Conséquences négatives

- ❌ La grille est figée dans le code : une révision FFA impose une transcription manuelle.
- ❌ Pas de vigilance canicule officielle prise en compte (choix v1, documenté).

### Alternatives rejetées

- **Calculer un indice (Humidex / heat index) par formule** : ne reproduirait pas
  cellule-pour-cellule le doc FFA que les pilotes recoupent → écarté pour un doc sécurité.
- **Pré-calcul N8N comme les éphémérides** : inutile pour une table fixe, ajoute un pipeline
  et casse le hors-ligne.

### Implémentation

- `src/config/app.config.js` : `THERMAL_STRESS_ZONES`, `THERMAL_STRESS_SETTINGS_DEFAULTS`,
  `THERMAL_STRESS_AGE_SHIFT`.
- `src/utils/thermalStressHelpers.js` (pur, testé) ; `src/composables/useThermalStressSettings.js`.
- UI : `ThermalStressCard.vue` hébergée sur une page dédiée `/stress-thermique` (`StressThermiquePage.vue`, FEAT-031b) + `ThermalStressIndicator.vue` (Accueil, redirige vers la page dédiée). Choix d'une page dédiée plutôt qu'une carte sur la page Station : surface autonome, accessible au menu, sans alourdir la page Station.

Voir FEAT-031 pour le détail fonctionnel.

---

## ADR-026 : Scripts de données en PHP autonome (`Airfield-Portal-Scripts`), alternative à N8N

**Date** : 23/06/2026
**Statut** : ✅ Acceptée

### Contexte

Les JSON statiques de `public/data/` sont aujourd'hui générés par des workflows N8N
(`Airfield-Portal-N8N`). À côté existent déjà des scripts PHP autonomes hors-N8N pour
certaines sources (`NOTAM/sofia_notam.php`, `AZBA Indicator/php/azba.php`, `Cam/*.php`),
selon le pattern « 1 source de données = 1 script ».

La feature stress thermique (ADR-025, FEAT-031) ne couvrait que le présent (station locale).
Pour les **prévisions multi-jours**, il faut une nouvelle source : température + humidité
horaires sur les prochains jours. L'objectif est de la produire **sans N8N**, et plus
largement d'amorcer la **migration progressive des workflows N8N vers du PHP cron-able**.

### Décision

Création d'un dossier sibling générique **`Airfield-Portal-Scripts/`** (aligné sur
`Airfield-Portal-Firebase` / `Airfield-Portal-N8N`), destiné à héberger les scripts de
génération de données en PHP. Premier script : `thermal-forecast/thermal_forecast.php`, qui
appelle **Open-Meteo** (gratuit, sans clé) et écrit `thermal_forecast.json`.

Conformément à ADR-025, le JSON ne porte que des **mesures brutes** (température °C,
humidité %) ; le niveau FFA reste calculé côté front (`getThermalStressLevel`), garantissant
la cohérence entre présent (station) et futur (prévisions). Le script est cron-able (écriture
atomique `.tmp` + `rename`, ne pas écraser le JSON existant en cas d'erreur) et utilisable en
HTTP. Côté app : endpoint `thermalForecast` (`app.config.js`), `thermalForecastStore` (réutilise
`useStationFetcher`), carte `ThermalForecastCard.vue` sur la page `/stress-thermique`.

### Conséquences positives

- ✅ Pas de dépendance N8N pour cette source ; PHP cron simple, déjà maîtrisé au club.
- ✅ Pattern réutilisable : `Airfield-Portal-Scripts/` accueillera les futurs scripts ex-N8N.
- ✅ Source forecast gratuite et sans clé (Open-Meteo) ; 2 champs = exactement la grille FFA.
- ✅ Réutilise tout le pipeline front (useDataFetcher, helpers FFA) sans duplication.

### Conséquences négatives

- ❌ Deux modèles cohabitent temporairement (N8N + PHP) le temps de la migration.

### Dépôt du JSON

Cible OVH : scripts et app dans un même dossier voisin. Un **`config.php` commun** (racine
`Airfield-Portal-Scripts/`) définit `dataDir`, chemin de destination **relatif à `config.php`**
(`__DIR__`, supporte `../app/public/data`) donc indépendant du cwd du cron. Ordre de priorité
par script : argument CLI > env > `config.php` > fallback local. Le cron lance le script sans
argument ; pas de chemin répété, un seul endroit à ajuster lors du déploiement OVH.

### Alternatives rejetées

- **Garder N8N pour cette source** : va à l'encontre de l'objectif de migration et ajoute un
  workflow à maintenir pour un appel d'API trivial.
- **Calcul du niveau FFA dans le PHP** : casserait la cohérence présent/futur et dupliquerait
  la grille (déjà côté front, ADR-025).
- **Source météo avec clé (Météo-France)** : auth + quotas, surdimensionné pour le besoin.

### Implémentation

- `Airfield-Portal-Scripts/config.php` + `thermal-forecast/thermal_forecast.php` + `README.md`.
- `src/config/app.config.js` : endpoint `thermalForecast`.
- `src/stores/thermalForecastStore.js` (réutilise `useStationFetcher`).
- `src/components/weather/ThermalForecastStrip.vue` (bandeau) + `ThermalForecastCard.vue` (détail).
- `src/utils/thermalStressHelpers.js` : `currentFromForecast(days, now)` (pur, testé) — source
  « présent » dérivée du forecast.
- `src/pages/StressThermiquePage.vue` : consomme **uniquement** `thermalForecast` (la page ne
  dépend plus de `stationAtmosphere` / `atmosphere.json`).

Voir FEAT-031 pour le détail fonctionnel.

---

## ADR-027 : Intégration des REX FFA (API REST + synthèse LLM mensuelle)

**Date** : 02/07/2026 (reconnaissance du portail : décision affinée le même jour — voir encadré)
**Statut** : ✅ Acceptée

### Contexte

La **FFA** publie des retours d'expérience (REX) de sécurité — anomalies et bonnes pratiques —
sur `rex.ffa-aero.fr`. Le portail LFFI Brief n'en exploite aujourd'hui que le **lien externe**
(`customizationStore.js`, id `rex-ffa`) : aucune capitalisation, aucune contextualisation pour
le club. Or ces REX sont une source de prévention directement utile aux pilotes VFR d'Ancenis,
à condition de faire ressortir ceux qui concernent le **contexte du club** (type d'avion,
localisation, catégorie d'évènement).

Le volume grossit mois après mois, ce qui interdit d'embarquer tout l'historique dans un JSON
front. Enfin, une lecture brute d'une longue liste de REX est peu actionnable : il faut une
**synthèse**. Cette source s'inscrit dans la vocation d'`Airfield-Portal-Scripts` (ADR-026) :
script PHP autonome cron-able produisant un JSON statique consommé par le front.

> **🔍 Reconnaissance du portail (02/07/2026) — l'hypothèse initiale « scraping HTML » est abandonnée.**
> `rex.ffa-aero.fr` est une **SPA React** (create-react-app, servie par ASP.NET/Cloudflare) : le HTML
> est vide, tout le contenu vient d'une **API REST JSON** — `https://api-rex.ffa-aero.fr` (env de test
> `api-rex-test.ffa-aero.fr`). On interroge donc **l'API** (stable, typée), pas le HTML — exactement
> comme la brique AZBA interroge l'API du SIA plutôt que l'app web.
>
> - **Auth** : **deux jetons** copiés du `localStorage` du navigateur connecté (`rexffaToken` = JWT
>   applicatif, `smileToken` = couche SMILE), **valables ~1 an** (JWT `exp − iat` = 31 536 000 s).
>   Les appels envoient `Authorization: Bearer <rexffaToken>` + en-tête `smile_token: <smileToken>`.
>   **Aucun login au quotidien** → pas de MFA à gérer, **pas de rate-limit (429)** en cron.
> - **Source** : `GET search/advanced/rex?event_date_min=…&event_date_max=…` → liste plate de REX
>   (tous clubs FFA), **filtrable par dates côté serveur**, renvoyée en **une seule requête** (pas de
>   pagination) et **self-contained** (causes/actions/risques inclus). Le détail `GET rex/{id}` est
>   **interdit (403)** avec nos jetons — sans conséquence, la liste suffit. La liste porte aussi
>   `updated_at`/`created_at`/`publication_date` (→ détection des REX modifiés). Les **libellés sont
>   déjà en clair** (`rex_type`, `flight_regime`, `flight_phase.name`, `event_kind`…) ; seuls les risques
>   sont numériques (entiers 1..5).
> - **⚠️ Données personnelles** : chaque REX embarque l'identité du déclarant (`created_by`/`updated_by` :
>   nom, e-mail, téléphone, n° de licence) et `report.sender_*`. **Enjeu RGPD** : ne jamais publier un
>   REX brut ; anonymisation obligatoire (voir Décision).

### Décision

Ajout d'une source **REX FFA** selon le pattern « 1 source = 1 script = 1 JSON », en réutilisant
le découpage **lib réutilisable + script hôte fin** de la brique AZBA (`azba/azba_lib.php` +
`azba/azba.php`) :

- **`rex-ffa/rex_ffa_lib.php`** — lib **réutilisable** (destinée à resservir sur un autre projet) :
  interroge l'**API REST REX** (auth par jetons, filtre par dates), retourne les REX **bruts** ; +
  **fonctions pures** de normalisation/anonymisation. Elle ne fait que **retourner ou lever**
  (`RexFetchException` réseau/auth, `RexDataException` forme changée) ; ne connaît ni SQLite, ni LLM,
  ni `config.php`, ni le format JSON front. Transport HTTP injectable (comme `azba_lib.php`) pour
  tests offline. Points d'entrée : `rexFetch()` (brut), `rexToPublicSchema()` (mapping + **anonymisation
  PII**), `rexFilterPublishable()` (visibilité), `rexPiiLeaks()` (garde-fou RGPD testable), `rexCitedIds()`.
- **`rex-ffa/rex_ffa.php`** — script hôte **spécifique** au projet : `config.php`, persistance
  **SQLite** (historique complet, upsert idempotent clé = ID REX, + table `summary` archivant chaque
  synthèse mensuelle), appel **LLM** de synthèse, assemblage et dépôt atomique de `rex.json` dans `dataDir`.

Choix de périmètre :

- **API REST JSON** (`api-rex.ffa-aero.fr`), authentifiée par **deux jetons ~1 an** (`rexffaToken` +
  `smileToken`) dans `config.php`, jamais committés. Login/mot de passe SMILE conservés en config
  **en secours** (régénérer les jetons s'ils expirent) — pas utilisés par le cron.
- **Anonymisation RGPD imposée** : `rexToPublicSchema()` retire toute donnée personnelle (déclarant,
  e-mail, téléphone, licence, `carrier_name` d'action) ; on ne publie que du factuel. Filtrage sur
  `rex_visibility_id` : seules les visibilités les plus ouvertes (4 Plateforme, 7 FFA) sont exposées.
- **Pertinence club par le `club_id` déclarant, pas seulement le lieu** : le REX brut porte un
  `club_id` (club **déclarant**) distinct de `place` (**lieu** de l'évènement). `rexToPublicSchema()`
  reçoit un `clubId` optionnel (`config.php`) et dérive un booléen **`fromClub`** — **sans exposer le
  `club_id` brut** de chaque REX (divulgation minimale : inutile de dire quel club tiers a déclaré
  quoi). Le front rattrape ainsi les REX **déclarés par le club mais survenus ailleurs** (ex. panne au
  retour d'une nav), qu'un simple `place === 'LFFI'` manquait. `fromClub` alimente aussi la
  **priorisation LLM** (ces REX en tête de synthèse).
- **Deux fenêtres découplées** (la reconnaissance a montré que l'API renvoie toute la liste en
  **une seule requête**, sans pagination, et que `rex/{id}` est **interdit (403)** — la liste est
  donc self-contained) :
  - **Fenêtre d'interrogation** (`fetchMonths`, défaut 24) : profondeur tirée de l'API à chaque run
    pour **alimenter la base**. Une option CLI **`--all`** interroge tout l'historique (amorçage
    unique — `memory_limit` relevé à 512 Mo car l'historique complet ~1300 REX pèse ~137 Mo au décodage).
  - **Fenêtre servie** (`windowMonths`, défaut 12) : ce que porte `rex.json`, **reconstruit depuis
    SQLite** (pas depuis le fetch) → fichier borné et léger pour la PWA, indépendant de la profondeur tirée.
- **SQLite = mémoire longue** : accumule **tout l'historique** vu (bien au-delà des deux fenêtres).
  L'upsert n'écrit un REX que si son `updated_at` **FFA** a changé (colonne `ffa_updated_at`) → les REX
  inchangés sont sautés et le run trace « X nouveaux, Y mis à jour ». Migration douce du schéma si une
  base antérieure existe. **Corollaire** : un **nouveau champ** du schéma public (ex. `fromClub`) ne
  serait jamais rétro-appliqué aux REX déjà en base — d'où l'option CLI **`--rebuild`** qui force la
  réécriture de tous les payloads une fois (le run trace « Z reconstruits »), après quoi le cron normal
  reprend.
- **Synthèse LLM mensuelle** : tous les REX du mois écoulé sont envoyés à un LLM **OpenAI-compatible
  paramétrable** (Mammouth.ai par défaut : `baseUrl` + `apiKey` + `model` dans `config.php`). Le
  prompt met en avant les REX liés aux **mots-clés du club** et cite les REX par leur **ID entre
  `{}`**, transformés côté front en liens vers la carte du REX.
- **Orchestration** : cron **mensuel** autonome (CLI), comme AZBA/thermal.
- Côté front : endpoint `rexFfa` (`app.config.js`), `rexFfaStore`, page dédiée `/rex-ffa`
  (synthèse en haut + liste filtrable), **nouvelle entrée menu interne distincte** conservée à
  côté du lien externe existant vers le portail FFA.

Frontière métier (ADR-025/026) **assouplie** par la reconnaissance : l'API fournissant déjà les
libellés en clair, le JSON les porte tels quels ; seule la **coloration** (matrices de risque,
type de REX) et les regroupements restent **côté front**.

### Conséquences positives

- ✅ Capitalisation des REX FFA contextualisée club, sans quitter le portail.
- ✅ Source **API REST typée et stable** (vs HTML fragile) : contrat clair, filtre par dates natif.
- ✅ Auth par jetons ~1 an → **cron sans login, sans MFA, sans rate-limit**.
- ✅ Lib d'extraction FFA réutilisable telle quelle sur un autre projet (aucun couplage SQLite/LLM/JSON).
- ✅ **RGPD traité by design** : anonymisation isolée en fonction pure + garde-fou `rexPiiLeaks()` testé.
- ✅ JSON front borné (fenêtre servie 12 mois) malgré un historique complet en base (SQLite).
- ✅ **Interrogation et service découplés** : on tire large (24 mois, ou tout via `--all`) pour enrichir
  la base sans jamais alourdir le fichier front ; détection incrémentale nouveaux/modifiés (`ffa_updated_at`).
- ✅ **Synthèses mensuelles archivées** (table `summary`) : jamais perdues, base d'une future page
  « archives », et **fail-safe LLM à 3 niveaux** (mois exact en base → `rex.json` précédent → vide) —
  le fichier existant n'est jamais écrasé sur échec.
- ✅ LLM interchangeable (tout fournisseur OpenAI-compatible via `config.php`).
- ✅ Réutilise tout le pipeline front (useDataFetcher, filtres façon NOTAM) et scripts (fail-safe, tests).

### Conséquences négatives

- ❌ L'**API n'est pas publique/documentée** : reconstituée par reconnaissance ; contrat à re-vérifier
  (phase ONLINE) si la FFA la fait évoluer. Mitigé : les tests ONLINE détectent une dérive (`RexDataException`).
- ❌ **Jetons à renouveler** manuellement à ~1 an d'échéance (les recopier du localStorage).
- ❌ **Responsabilité RGPD** : l'API expose des PII ; toute négligence d'anonymisation fuiterait des
  données perso. Mitigé par l'anonymisation obligatoire + le test `rexPiiLeaks()`.
- ❌ Dépendance à un service LLM externe payant. **Contrainte réelle = rate-limit tokens** (100 k/fenêtre
  chez Mammouth), pas le coût (~0,005 $/run) : mitigé par un digest LLM réduit (~26 k tokens) et un seul appel/mois.
- ❌ Nouveau composant à installer côté prod (SQLite) et secrets supplémentaires à gérer.
- ❌ L'amorçage `--all` charge tout l'historique en mémoire (~137 Mo) → `memory_limit` relevé à 512 Mo ;
  réservé à une exécution ponctuelle, le cron mensuel se borne à `fetchMonths` (24).

### Alternatives rejetées

- **Scraping HTML du portail** (hypothèse initiale) : inutile et fragile — le portail est une SPA au
  HTML vide ; l'API REST JSON sous-jacente est bien plus stable et directement exploitable.
- **Se logger à chaque run du cron** : superflu (jetons ~1 an) et exposé au **rate-limit 429** constaté
  sur les logins répétés. On réutilise les jetons persistants à la place.
- **Publier les REX bruts** : fuiterait les données personnelles du déclarant — anonymisation imposée.
- **Embarquer tout l'historique dans le JSON** : fichier non borné, chargé côté front à chaque visite.
- **Pré-filtrer les REX sur mots-clés avant le LLM** : ferait manquer les REX transverses ; on préfère
  tout envoyer et laisser le LLM **hiérarchiser** selon les mots-clés.
- **Persistance SQLite dans la lib** : casserait la réutilisabilité « pure extraction FFA » de la lib ;
  l'autre projet doit pouvoir brancher son propre stockage.
- **LLM en dur / non paramétrable** : verrouille le fournisseur ; contraire au besoin (Mammouth.ai
  aujourd'hui, autre demain).

### Implémentation

- `Airfield-Portal-Scripts/rex-ffa/rex_ffa_lib.php` (lib **✅ écrite et testée**) + `rex_ffa.php`
  (script hôte **✅ écrit, testé, validé en réel** : two-window, SQLite `rex`+`summary`, LLM
  `mistral-small-2603`, fail-safe) + `tests/run.php` (**✅ 31 tests** lib) et `tests/run_script.php`
  (**✅ 83 tests** script hôte), ajoutés à `run-tests.sh`. Clés `config.php` : `rexFfa` (apiBaseUrl,
  **rexffaToken, smileToken** (jetons ~1 an), licenseId/password (secours), **windowMonths** (servi),
  **fetchMonths** (interrogé), sqlitePath, **clubId** (→ `fromClub`), clubKeywords, llm{baseUrl,apiKey,model}).
  **`config.php` est gitignoré** (secrets réels) ; gabarit versionné `config.sample.php`.
- `src/config/app.config.js` : endpoint `rexFfa`.
- `src/stores/rexFfaStore.js` (via `useDataFetcher`, calqué `vacStore.js`).
- `src/pages/RexFfaPage.vue` + `src/components/rex/{RexSummary,RexFilters,RexCard}.vue`.
- `src/utils/rexHelpers.js` : prédicats de filtre purs + coloration risque/type (testés).
- `src/router/routes.js` (route `/rex-ffa`) + `src/stores/customizationStore.js` (item menu interne).
- Schéma JSON documenté dans `ARCHITECTURE.md` (§ REX FFA).

Voir FEAT-032 pour le détail fonctionnel. Concrétise partiellement IDEA-001 (IA de synthèse).

---

## ADR-028 : Soumission de REX par les pilotes (formulaire front + service web proxy e-mail)

**Date** : 05/07/2026
**Statut** : ✅ Acceptée

### Contexte

La page `/rex-ffa` (ADR-027) est en **lecture seule** : elle capitalise les REX de la FFA mais
n'offre aucun moyen aux pilotes du club de **remonter eux-mêmes** un évènement de sécurité. Le CPS
du club souhaite une saisie **simple** (récit libre + quelques champs), le but n'étant **pas** de
produire un REX FFA formaté côté pilote, mais de collecter la **matière brute** que le CPS
reformulera (via LLM) au format REX FFA avant soumission manuelle.

Contraintes : ne pas exposer l'e-mail du CPS ; ne rien perdre de la saisie (anti-perte) ; rester
utilisable sur mobile ; se protéger du spam sans dépendance tierce ni CAPTCHA.

### Décision

- **Front** : page `/rex-soumission` (`RexSoumissionPage.vue`) accessible par un bouton en tête de
  `/rex-ffa`. Formulaire Quasar minimal (récit\*, avion\*, date\*, lieu\* + heure, phase, type de vol,
  gravité, coordonnées optionnelles, e-mail de copie optionnel). Le sélecteur d'avion **réutilise
  `aircraftStore`** (immat + type) tout en autorisant la saisie libre. Le **brouillon est
  auto-sauvegardé en `localStorage`** (`rexSubmitStore`, clé `STORAGE_KEYS.REX_DRAFT`, debounce 400 ms) et
  restauré à l'ouverture — conforme à la règle « localStorage = préférences UI » (un brouillon de
  saisie, pas une donnée métier). Le brouillon n'est **effacé qu'après un envoi confirmé (200)** ;
  toute erreur le conserve. L'endpoint POST est une constante configurable `REX_SUBMIT` (URL absolue
  vers un service externe — pas un flux `./data/*.json`).
- **Service web** : nouveau composant **inbound** `rex-submit/` dans `Airfield-Portal-Scripts`
  (`index.php` + `rex_submit_lib.php` pur + `schema.sql` + tests OFFLINE). Reçoit le POST JSON,
  valide/filtre (anti-spam), **enregistre en SQLite** (gitignored, hors dataDir, IP hachée — RGPD),
  puis **envoie un e-mail au CPS** ; si le pilote a fourni son e-mail, une **copie** lui est envoyée
  (e-mail séparé, jamais en `Cc` — l'e-mail CPS n'est pas exposé). Fail-safe : SQLite d'abord ; e-mail
  CPS **OK → 200** (le front vide le brouillon), **KO → 502** (le front garde le brouillon). La copie
  au déclarant est best-effort (un échec n'empêche pas le 200).
- **Anti-spam en couches, sans dépendance ni CAPTCHA** : honeypot (champ `website` caché) +
  time-trap (`startedAt`, délai mini) + jeton partagé optionnel + rate-limit par IP hachée (SQLite) +
  bornes de taille. Cohérent avec l'ethos self-hosted/CSP strict du projet.

### Conséquences

- **Entorse assumée à la règle « pas de Composer » d'`Airfield-Portal-Scripts`** : le service
  `rex-submit/` a un **`composer.json` local** (PHPMailer) pour un SMTP OVH robuste (TLS/AUTH/encodage).
  `vendor/` gitignored ; les scripts CLI existants restent zéro-dépendance. La logique métier reste
  **pure et testée OFFLINE** (validation, anti-spam, mapping, corps e-mail) ; seul l'I/O (SQLite, SMTP)
  vit dans `index.php`.
- Premier composant **web-facing** du dépôt Scripts (jusqu'ici 100 % CLI→JSON). Secrets (e-mail CPS,
  SMTP) uniquement en `config.php` (bloc `rexSubmit`, gitignored) ; `config.sample.php` versionné.
- Base SQLite de soumissions à portée RGPD (récit + contact éventuel) : jamais servie au front, IP
  seulement hachée. Ouvre la voie à une future page d'admin/historique (hors périmètre actuel).

---

## ADR-029 : Photos jointes aux soumissions de REX (base64 JSON + stockage disque hors docroot)

**Date** : 13/07/2026
**Statut** : ✅ Acceptée

### Contexte

La soumission de REX (ADR-028) est **texte seul**. Les pilotes veulent joindre des **photos**
(dégât matériel, situation) pour appuyer leur récit. Le pipeline étant 100 % JSON de bout en bout
(front → POST JSON → PHP → SQLite + e-mail), aucune brique d'upload n'existe.

### Décision

- **Transport = base64 dans le JSON existant** (pas de bascule multipart/`$_FILES`). Le POST reste
  `application/json` : CORS, anti-spam et lecture `php://input` inchangés. Les photos voyagent dans
  `payload.images = [{ name, dataUrl }]`.
- **Compression côté navigateur** : nouveau composable `useImageCompressor` (canvas → JPEG,
  ~2000 px, qualité ~0.8). Convertit le HEIC iOS en JPEG au passage. Borne le poids du payload.
  **Limite : 5 photos.**
- **Images NON persistées dans le brouillon** : elles vivent dans un état `images` **séparé** du
  `form` (store `rexSubmitStore`), jamais écrit en `localStorage` (le base64 de 5 photos sature le
  quota ~5 Mo). Le récit reste sauvé ; les photos sont à re-sélectionner après un rechargement —
  **l'UI l'indique explicitement** près du champ photos. Pas d'IndexedDB (surdimensionné ici).
- **Serveur = stockage disque hors docroot + pièces jointes e-mail**. La lib pure valide/décode
  (`rexSubmitValidateImages` : ≤ 5 photos, MIME JPEG/PNG/WebP, ≤ 3 Mo/photo, ≤ 10 Mo total).
  `index.php` écrit les fichiers (atomique, un sous-dossier par soumission, hors docroot via
  `rexSubmit.imagesDir`), stocke `images_count`/`images_dir` en SQLite, et **joint les photos à
  l'e-mail CPS + copie déclarant** (`PHPMailer::addAttachment`). Le **rattrapage** re-joint les
  images depuis le disque (dossier purgé → e-mail sans pièce jointe plutôt qu'échec).
- **Pas de purge automatique** des images (nettoyage manuel si besoin, comme la SQLite).

### Conséquences

- Le base64 gonfle le payload de ~33 % : `config.sample.php` documente `post_max_size ≥ 8M` /
  `memory_limit` confortable. Bornes serveur = ceinture (le front compresse déjà).
- **Bug de migration corrigé au passage** : `rexSubmitMigrateStateColumns` tentait un `ALTER TABLE`
  sur une base **neuve** (PRAGMA vide interprété comme « toutes colonnes manquantes ») → crash à la
  première installation. Correctif : ne migrer que si la table `submissions` existe déjà. Couvert
  par un test I/O dédié (base neuve + base ancienne + stockage disque) dans `rex-submit/tests/`.
- Nouvelles colonnes `images_count`/`images_dir` (schema.sql + migration idempotente). Images à
  portée RGPD : hors docroot, jamais servies au front (comme la SQLite).

---

## ADR-030 : Identité club/aérodrome en couches (`club.config.js` + `.env`)

**Date** : 05/08/2026
**Statut** : 🔄 **Amendée le 05/08/2026 — la couche `airfield.json` est supprimée** (voir « Amendement » en fin d'ADR) — cadre TECH-008 (prérequis de l'ouverture open source)

### Contexte

Le projet est ouvert en AGPL-3.0 pour être **réutilisable par d'autres aérodromes**. Or l'identité
LFFI/Ancenis est aujourd'hui **diffuse** : ~90 occurrences `lffi|ancenis` en dur sur 31 fichiers —
constantes (`RUNWAY_HEADING = 250`, `LFFI_ALTITUDE_M`, `LFFI_LAT/LON`), URLs webcam, topics FCM,
zones AZBA prioritaires, textes UI (« METAR LFFI », « autour de LFFI (25 NM) »), clés
`localStorage` `lffi-*`, nom du produit dans le manifest PWA et les meta HTML.

Ces valeurs sont consommées dans **trois mondes différents** :

1. au **build**, en Node (`quasar.config.js` : `htmlVariables`, `metaVariables`, hook
   `extendManifestJson`) — donc avant tout runtime navigateur ;
2. au **runtime**, de façon **synchrone** (repli d'`airfieldStore` avant chargement du JSON,
   calculs de composantes vent, textes de composants) ;
3. dans le **service worker** (titre par défaut des notifications), qui n'a accès ni aux stores ni
   aux imports applicatifs — seulement à `process.env` injecté via `build.env`.

Un fork doit pouvoir changer de terrain **en éditant un seul endroit**, sans chasse au littéral.

### Décision

Trois couches, chaque valeur ayant **un seul propriétaire** :

| Couche              | Fichier                     | Rôle                                                                                                               | Commité                     |
| ------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------ | --------------------------- |
| Identité du fork    | `src/config/club.config.js` | LE fichier à éditer pour forker : nom produit, terrain, webcam, topics, zones AZBA, feature flags, préfixe storage | ✅                          |
| Vérité runtime      | `public/data/airfield.json` | Donnée terrain vivante lue par `airfieldStore` (dont `runwayLengths` par QFU)                                      | ✅ (exception au gitignore) |
| Déploiement / privé | `.env` (+ `.env.example`)   | `PUBLIC_PATH`, `APP_URL`, clés Firebase, `REX_SUBMIT_*`                                                            | ❌                          |

> **Amendement du 05/08/2026 — la couche `airfield.json` est supprimée** (voir en fin d'ADR).
> L'architecture effective est à **deux** couches : `club.config.js` + `.env`.

`club.config.js` est un module **ESM pur** : aucun import, uniquement des littéraux. C'est la
condition pour être importable depuis `quasar.config.js` (Node) **et** depuis `src/` (navigateur),
et pour que ses valeurs puissent être relayées au service worker via `build.env`.

Corollaires actés en même temps :

- **Feature flags** (`features.{webcam,station,thermal,rex,aircraft,notifications}`) : un fork sans
  station InfluxDB ni webcam désactive le module — route, entrée de menu et store disparaissent,
  plutôt qu'une page en erreur permanente. Implémentation déclarative : chaque route / entrée de
  menu / entrée de diagnostic porte une propriété `feature`, filtrée par `isFeatureEnabled`
  (`src/config/features.js`). `thermal` est distinct de `station` : le stress thermique vient de
  `thermal_forecast.json` (script Open-Meteo autonome), pas de la station locale.
- **Topics FCM déplacés dans la config** et **rendus génériques** (`notam-ad`, `azba-zone` au lieu
  de `notam-lffi`, `azba-r149e`) : une instance ne dessert qu'un terrain, inutile d'y répéter son
  code OACI — le libellé, lui, nomme l'aérodrome. Ils restent **couplés à l'émetteur** (workflow
  N8N + `validTopics` de la Cloud Function) et aux abonnements FCM : tout changement suppose de
  synchroniser les trois côtés et impose un réabonnement. Renommage fait le 05/08/2026, alors que
  le service n'avait que quelques testeurs.
- **Clés `localStorage` préfixées** via `storagePrefix` (`lffi-*` → `brief-*`). Fait maintenant :
  le passage au nouveau domaine change l'origine et efface de toute façon les préférences — le
  renommage est gratuit à cet instant précis, coûteux plus tard.
- `club.config.js` porte l'altitude en **ft et en m** : les deux unités sont réellement utilisées
  (performances de décollage en ft, calcul QNH de la station en m). Une seule valeur avec conversion
  à la volée introduirait un arrondi là où les deux chiffres sont aujourd'hui exacts.
- Les coordonnées de référence deviennent celles d'`airfield.json` (47.408 / -1.177) ; `vacStore`
  utilisait un point légèrement différent (47.4072 / -1.1789, ~150 m d'écart) — sans effet sur un
  tri de cartes VAC par distance en NM.

### Conséquences

**Positives** : forker = éditer un fichier + `airfield.json` + `.env` ; l'identité devient
testable (les specs asserteront depuis `CLUB_CONFIG` au lieu de littéraux) ; les modules optionnels
cessent d'être des dépendances implicites ; le dépôt public ne contient plus de host d'infra privée.

**Négatives / limites** :

- Modèle **mono-piste** : `getActiveRunway` dérive les QFU d'un `runwayHeading` unique. Un terrain à
  deux pistes croisées demanderait une évolution du modèle (non traitée — aucun besoin réel
  aujourd'hui, et anticiper coûterait plus qu'attendre le premier fork concerné).
- Duplication assumée entre `club.config.js` et `airfield.json` sur les valeurs terrain (repli vs
  vérité runtime) : à garder cohérente à la main. C'est le prix des valeurs synchrones.
- Le pipeline de données (N8N / scripts PHP) n'est pas encore public : un fork doit fournir ses
  propres JSON au format documenté dans `ARCHITECTURE.md`.

### Alternatives rejetées

- **Étendre `airfield.json` seul** : impossible au build (manifest PWA, `htmlVariables` sont figés
  avant tout fetch) et pour les valeurs synchrones ; provoquerait en plus un « flash d'identité »
  au chargement (titre générique puis titre du club).
- **Tout dans `.env` / `define` au build** : disperse ~30 valeurs structurées (objets, tableaux de
  topics) dans des chaînes d'environnement non typées, illisibles et non commentables. TECH-008
  l'excluait déjà explicitement.
- **Un paquet npm de config** : surdimensionné pour un mono-dépôt front.

### Amendement du 05/08/2026 : suppression de la couche `airfield.json`

**Décision** : `public/data/airfield.json`, `airfieldStore` et l'endpoint `airfield` sont supprimés.
Les caractéristiques du terrain vivent **uniquement** dans `club.config.js`. Le seul champ qui n'y
figurait pas, `runwayLengths` (longueur par QFU), y est déplacé ; la fonction `runwayLengthFor()`
devient un utilitaire pur (`src/utils/airfieldHelpers.js`).

**Constat qui a motivé le changement** : sur les neuf champs d'`airfield.json`, **huit étaient une
copie exacte** de `club.config.js` — deux sources de vérité pour la même information, à maintenir
cohérentes à la main. Et le fichier n'a jamais été régénéré par le pipeline en huit mois : son
`generatedAt` laissait croire à une donnée vivante alors qu'il s'agissait de configuration statique.
La justification initiale (« pouvoir corriger une caractéristique terrain sans rebuild ») n'a jamais
servi, et un changement de piste accompagnerait de toute façon une mise à jour applicative.

**Conséquences** :

- ✅ Une seule source de vérité pour le terrain ; plus de divergence possible.
- ✅ Un store, un endpoint, une entrée de diagnostic, un cycle de fetch et une entrée de cache en
  moins — pour de la configuration qui ne change jamais.
- ✅ Plus d'exception au `.gitignore` à justifier : `public/data/` est intégralement ignoré.
- ⚠️ Modifier une caractéristique du terrain demande désormais un **rebuild**. Assumé : c'est déjà
  le cas de toute l'identité du fork (nom, ICAO, coordonnées).
- ⚠️ **Format des QFU** : les clés de `runwayLengths` doivent être des chaînes sur deux chiffres
  (`'07'`, pas `'7'`) pour correspondre à ce que produit `getActiveRunway`. Une clé mal formée
  serait silencieusement ignorée et retomberait sur la longueur nominale — cas verrouillé par
  `tests/unit/utils/airfieldHelpers.spec.js`, la longueur de piste étant sécurité-critique.

---

## 🔄 Décisions à Revisiter

| ADR     | Sujet       | Raison                                                                                                                                                                                                                     | Priorité   |
| ------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| ADR-008 | TypeScript  | Seuil initial 10k lignes atteint (~18k au 7 juin 2026) sans douleur de maintenance notable ; déclencheur relevé à **> 25k lignes OU premier bug de type en prod**. JSDoc + `jsconfig` couvrent l'essentiel pour l'instant. | 🟡 Moyenne |
| ADR-014 | Tests auto  | Largement traité par ADR-022 (CI active ; reste : tests composants `.vue`)                                                                                                                                                 | 🟢 Basse   |
| ADR-007 | API backend | Si besoin temps réel                                                                                                                                                                                                       | 🟢 Basse   |

---

**Dernière mise à jour** : 5 août 2026 (ADR-030 : identité club dans `club.config.js`)
**Mainteneur** : Stephanfo
