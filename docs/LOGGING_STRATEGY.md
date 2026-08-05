# Stratégie de logging - Airfield Portal

## Vue d'ensemble

Ce document décrit la stratégie de logging mise en place pour garantir un code cohérent, sécurisé et maintenable.

## Règles de base

### 1. Code source Vue/JS (`src/**`)

**Utiliser exclusivement `logger.js`** au lieu de `console` direct.

```javascript
import { logger } from '../utils/logger'

// ✅ BON
logger.log('Données chargées:', data)
logger.warn('Attention:', message)
logger.error('Erreur critique:', error) // Toujours affiché en prod
logger.debug('Debug info:', details)

// ❌ MAUVAIS
console.log('Données chargées:', data)
console.warn('Attention:', message)
```

**Comportement :**

- **Développement** : Tous les logs sont affichés
- **Production** : Seul `logger.error()` est affiché
- **Avantage** : Pas d'exposition de données sensibles (tokens, payloads API)

### 2. Service Workers PWA (`src-pwa/**`)

**`console` direct est autorisé** car ces fichiers s'exécutent dans un contexte isolé où `logger.js` n'est pas accessible.

```javascript
// src-pwa/custom-service-worker.js
// ✅ BON - console direct car contexte service worker
self.addEventListener('push', (event) => {
  console.log('Push notification reçue:', event)
  // ...
})

// src-pwa/register-service-worker.js
// ✅ BON - console direct pour callbacks service worker
ready() {
  console.log('Service worker is active.')
}
```

**Fichiers concernés :**

- `src-pwa/custom-service-worker.js`
- `src-pwa/register-service-worker.js`

**Justification :**

- Les service workers s'exécutent en arrière-plan, isolés du code principal
- Ces logs sont utiles pour déboguer les notifications et la mise en cache
- Pas d'accès à `process.env` ou modules ES6 de manière fiable

### 3. Configuration ESLint

La règle `no-console` est **complètement désactivée** :

```javascript
// eslint.config.js
rules: {
  'no-console': 'off', // Désactivation complète - logger.js gère la production
}
```

**Pourquoi :**

- La configuration flat ESLint 9 ne permet pas d'exceptions fiables par fichier
- `logger.js` utilise `console` en interne (nécessaire)
- Les service workers PWA ont besoin de `console` direct
- La protection en production est assurée par `logger.js` au runtime

## Inventaire des usages

### ✅ Code source (utilise `logger.js`)

- `src/stores/customizationStore.js` → `logger.log()`
- `src/stores/notificationStore.js` → `logger.log()`, `logger.error()`
- `src/pages/NotificationSettings.vue` → `logger.error()`
- Tous les futurs fichiers dans `src/` doivent utiliser `logger`

### ✅ Service Workers (utilise `console` direct)

- `src-pwa/custom-service-worker.js` → `console.log/warn/error()`
- `src-pwa/register-service-worker.js` → `console.log/error()`

### ✅ Utilitaires (implémentation)

- `src/utils/logger.js` → Utilise `console` en interne avec garde `isDev`

### ⚠️ Documentation (exemples seulement)

- `docs/ARCHITECTURE.md`, `docs/` → Exemples de code uniquement

## Guide de migration

Si vous trouvez un `console.log` oublié dans `src/` :

```javascript
// Avant
console.log('Message')
console.warn('Attention')
console.error('Erreur')

// Après
import { logger } from '../utils/logger'

logger.log('Message')
logger.warn('Attention')
logger.error('Erreur')
```

## Tests de validation

### En développement

```bash
NODE_ENV=development npm run dev
# Tous les logger.log/warn/debug doivent s'afficher
```

### En production

```bash
NODE_ENV=production npm run build
# Seuls les logger.error doivent apparaître dans les logs
```

### Vérification ESLint

```bash
npm run lint
# Aucune erreur no-console ne doit apparaître
```

## Diagnostic PWA et Notifications

Le logging est particulièrement détaillé pour le sous-système PWA/notifications, car ces composants s'exécutent en arrière-plan et sont difficiles à déboguer.

### Fichiers avec logging amélioré

| Fichier                              | Contexte  | Détails loggés                                                              |
| ------------------------------------ | --------- | --------------------------------------------------------------------------- |
| `src/stores/notificationStore.js`    | `logger`  | Chaque étape : init, permissions, SW, token FCM, topics, erreurs avec stack |
| `src-pwa/register-service-worker.js` | `console` | Callbacks : ready, registered, cached, updatefound, updated, offline, error |
| `src-pwa/custom-service-worker.js`   | `console` | Push, notificationclick, message, précaching, routes de cache               |
| `src/pages/NotificationSettings.vue` | `logger`  | Actions utilisateur, erreurs avec try/catch                                 |

### Conventions de logging

- **Emojis** pour faciliter le scan visuel : `🔄` (en cours), `✅` (succès), `❌` (erreur), `⚠️` (warning), `ℹ️` (info)
- **Tokens/clés sensibles** toujours tronqués dans les logs
- **Messages Notify.create** avec `caption` pour donner du contexte à l'utilisateur
- **Configuration Firebase** loggée avec masquage des clés

### Page de diagnostic (`/status`)

La StatusPage intègre une section "Service Worker & Notifications" affichant :

- Support et état d'enregistrement du Service Worker
- Permission de notification (granted/denied/default)
- Token FCM (avec bouton de copie)
- Configuration Firebase
- Topics abonnés
- Console de logs du SW

---

## Dépendances

- **`src/utils/logger.js`** : Utilitaire de logging conditionnel
- **`eslint.config.js`** : Règle `no-console: off` pour éviter les faux positifs
- **`process.env.NODE_ENV`** : Variable d'environnement pour le mode dev/prod

## Maintenance future

1. **Nouveaux fichiers** : Utiliser systématiquement `logger` dans `src/`
2. **Service workers** : Garder `console` direct car contexte isolé
3. **ESLint** : Ne pas réactiver `no-console` sans tester les exceptions
4. **Code review** : Vérifier l'absence de `console` direct dans les PR pour `src/`

---

**Date de création :** 7 février 2026
**Dernière mise à jour :** 23 février 2026
**Statut :** ✅ Implémenté et validé
