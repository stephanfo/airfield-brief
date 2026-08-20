# Notifications Push — Firebase Cloud Messaging

Guide complet pour la configuration, le fonctionnement et le dépannage des notifications push.

> **Module optionnel.** Les notifications se désactivent entièrement via
> `features.notifications: false` dans `src/config/club.config.js` : la page, l'entrée de
> menu et la cloche disparaissent, et les clés Firebase deviennent inutiles. Ce guide ne
> concerne donc que les installations qui les activent.

---

## Table des matières

1. [Architecture](#architecture)
2. [Setup Firebase](#setup-firebase)
3. [Variables d'environnement](#variables-denvironnement)
4. [Cloud Function — Gestion des Topics](#cloud-function--gestion-des-topics)
5. [Envoi de notifications depuis N8N](#envoi-de-notifications-depuis-n8n)
6. [Topics disponibles](#topics-disponibles)
7. [Payload de notification](#payload-de-notification)
8. [Dépannage](#dépannage)
9. [Sécurité](#sécurité)
10. [Ressources](#ressources)

---

## Architecture

```
PWA (Client)                 Firebase Cloud Function            Firebase FCM
    │                                 │                              │
    ├─ Active notifications           │                              │
    ├─ Obtient token FCM ─────────────┼─────────────────────────────►│
    ├─ Stocke token localement        │                              │
    │                                 │                              │
    ├─ S'abonne à "notam-ad"        │                              │
    ├─ POST /manageTopicSubscription ─►                              │
    │                                 ├─ subscribeToTopic() ────────►│
    │                                 │◄────────────────────────────►│
    │◄──── { success: true } ─────────┤                              │
    │                                 │                              │
                                                                     │
                                 N8N Backend                         │
                                      │                              │
                                      ├─ Détecte nouveau NOTAM       │
                                      ├─ send({topic:"notam-ad"})─►│
                                      │                              │
    ◄─────────────────────────────────┼──────────────────────────────┤
              Notification reçue
```

**Composants** :

- **PWA (Frontend)** : Gère les permissions, stocke le token FCM, appelle la Cloud Function pour s'abonner/désabonner aux topics
- **Firebase Cloud Function** : Proxy sécurisé pour abonner les tokens aux topics via l'API Firebase Admin
- **N8N Backend** : Détecte les événements (nouveau NOTAM, activation AZBA…) et envoie les notifications aux topics FCM
- **Firebase FCM** : Distribue les notifications à tous les appareils abonnés

---

## Setup Firebase

### 1. Créer un Projet Firebase

1. Allez sur https://console.firebase.google.com/
2. Cliquez sur "Ajouter un projet"
3. Nommez le projet (ex: "LFFI-Brief")
4. Désactivez Google Analytics (optionnel)
5. Créez le projet

### 2. Ajouter une Application Web

1. Dans la console Firebase, cliquez sur l'icône Web `</>`
2. Nommez l'app (ex: "LFFI Brief PWA")
3. Cochez "Également configurer Firebase Hosting" (optionnel)
4. Cliquez sur "Enregistrer l'application"
5. **Copiez** les valeurs de `firebaseConfig`

### 3. Activer Cloud Messaging

1. Menu Firebase → **Build** → **Cloud Messaging**
2. Onglet **Web configuration** → section "Web Push certificates"
3. Cliquez sur **"Generate key pair"**
4. **Copiez** la clé publique VAPID générée

---

## Variables d'environnement

Copiez `.env.example` en `.env` et remplissez :

```bash
FIREBASE_API_KEY=AIzaSyC...           # firebaseConfig.apiKey
FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=123456789
FIREBASE_APP_ID=1:123456789:web:abc...
FIREBASE_VAPID_KEY=BN7x...            # Clé publique VAPID générée
```

> ⚠️ Ne jamais committer le fichier `.env` (déjà dans `.gitignore`)

---

## Cloud Function — Gestion des Topics

La Cloud Function `manageTopicSubscription` permet d'abonner/désabonner les tokens FCM aux topics directement depuis le frontend, sans passer par N8N.

### Déploiement

```bash
# Installer Firebase CLI
npm install -g firebase-tools
firebase login

# Depuis le dossier Airfield-Portal-Firebase/
cd ../Airfield-Portal-Firebase
firebase deploy --only functions
```

### Code de la Cloud Function

Fichier : `Airfield-Portal-Firebase/functions/index.js`

```javascript
exports.manageTopicSubscription = onRequest({ cors: true }, async (req, res) => {
  // POST uniquement
  // Rate limiting IP (20 req/min)
  // Validation : action (subscribe|unsubscribe), topic, token
  // Topics valides : notam-ad, notam-fir, azba-zone, vac
  // Appel Firebase Admin subscribeToTopic / unsubscribeFromTopic
})
```

**Sécurité intégrée** :

- Rate limiting : 20 requêtes/minute par IP
- Validation des topics autorisés
- `maxInstances: 2` pour limiter les coûts
- CORS configurable (à restreindre en production)

### Test

```bash
curl -X POST https://us-central1-{PROJECT_ID}.cloudfunctions.net/manageTopicSubscription \
  -H "Content-Type: application/json" \
  -d '{"action": "subscribe", "topic": "notam-ad", "token": "votre_token_fcm"}'
```

**Coûts** : Quota gratuit Firebase largement suffisant (2M invocations/mois).

---

## Envoi de notifications depuis N8N

N8N a **un seul rôle** : envoyer les notifications aux topics FCM quand des événements se produisent. Les abonnements sont gérés par la Cloud Function.

### Credentials Firebase Admin

1. Firebase Console → **Project Settings** (⚙️) → **Service accounts**
2. Cliquez sur **"Generate new private key"**
3. Dans N8N, ajoutez les variables :
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_PRIVATE_KEY`
   - `FIREBASE_CLIENT_EMAIL`

### Code N8N (Function Node)

```javascript
const admin = require('firebase-admin')

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    }),
  })
}

const message = {
  notification: {
    title: 'Nouveau NOTAM LFFI',
    body: 'Piste 07/25 fermée ce week-end',
  },
  data: {
    on_click_url: '/notam',
    tag: 'notam-new',
  },
  topic: 'notam-ad',
}

const response = await admin.messaging().send(message)
return { messageId: response }
```

---

## Topics disponibles

Les topics proposés dans l'interface sont **définis par le club** dans
`src/config/club.config.js` (`notificationTopics`, cf. ADR-030). Leurs `id` sont
**couplés à l'émetteur** — workflow N8N et Cloud Function : les renommer casse à la fois
l'envoi et les abonnements déjà en place. Un fork définit ses propres topics, alignés sur
son backend.

Topics de l'installation LFFI :

| Topic       | Événement                       | Page cible |
| ----------- | ------------------------------- | ---------- |
| `notam-ad`  | NOTAMs aérodrome Ancenis (LFFI) | `/notam`   |
| `notam-fir` | NOTAMs FIR (hors aérodrome)     | `/notam`   |
| `azba-zone` | Activation zone R149E           | `/azba`    |
| `vac`       | Nouvelles cartes VAC            | `/vac`     |

Les identifiants sont **génériques** : une instance ne dessert qu'un seul terrain, il serait
redondant d'y répéter son code OACI. Ce sont les libellés (`label`, `description`) qui nomment
l'aérodrome et la zone.

### ⚠️ Un topic vit à TROIS endroits

Ajouter, renommer ou supprimer un topic impose de modifier **les trois côtés dans le même
mouvement**. Si un seul est oublié, les notifications concernées cessent d'arriver **sans aucun
message d'erreur** — ni côté serveur, ni côté application.

| Côté | Emplacement | Rôle |
| --- | --- | --- |
| Front | `src/config/club.config.js` → `notificationTopics` | ce que l'utilisateur peut cocher |
| Cloud Function | `Airfield-Portal-Firebase/functions/index.js` → `validTopics` | whitelist des abonnements ; un topic absent est **rejeté en 400** |
| Émetteur | workflow N8N (ou script d'envoi) → champ `topic` du payload | ce qui est réellement diffusé |

Après modification : redéployer la Cloud Function
(`npm --prefix ../Airfield-Portal-Firebase/functions run deploy`) **et** réimporter le workflow
N8N. Les abonnements FCM portant sur l'ancien identifiant deviennent orphelins : les utilisateurs
doivent se réabonner depuis l'application.

> Historique : les identifiants étaient `notam-lffi` et `azba-r149e` jusqu'au 05/08/2026, où ils
> ont été rendus génériques en vue de l'ouverture du code — à un moment où le service n'avait que
> quelques testeurs.

---

## Payload de notification

Format attendu par le Service Worker de la PWA :

```json
{
  "notification": {
    "title": "Nouveau NOTAM LFFI",
    "body": "Piste 07/25 fermée ce week-end"
  },
  "data": {
    "on_click_url": "/notam",
    "tag": "notam-ad"
  },
  "topic": "notam-ad"
}
```

- `data.on_click_url` : chemin relatif commençant par `/` (deep linking au clic)
- `data.tag` : identifiant unique pour grouper les notifications

---

## Dépannage

### Les notifications ne s'affichent pas

1. **Vérifier les permissions** :
   - Chrome : `chrome://settings/content/notifications`
   - Firefox : `about:preferences#privacy`
2. **Vérifier que la PWA est installée** (icône cloche verte ou orange, pas grise)
3. **Console navigateur** : `Notification.permission` doit valoir `"granted"`

### Erreur "Service Worker registration failed"

- Vérifiez HTTPS (ou localhost)
- Videz le cache du navigateur
- Désinstallez et réinstallez la PWA

### Les notifications arrivent mais pas de redirection

- Vérifiez que `on_click_url` commence par `/` (ex: `/notam`, pas `notam`)
- Consultez les logs du Service Worker dans DevTools → Application → Service Workers

### Page de diagnostic

La page `/status` affiche l'état complet : Service Worker, token FCM, topics abonnés, configuration Firebase. Utilisez-la pour diagnostiquer les problèmes.

---

## Sécurité

- ✅ Pas de clé serveur exposée côté client (Cloud Function = proxy)
- ✅ Validation des topics autorisés dans la Cloud Function
- ✅ Rate limiting IP (20 req/min)
- ✅ CORS configurable
- ✅ Variables sensibles dans `.env` (jamais committées)
- ✅ Tokens FCM tronqués dans les logs

**Pour renforcer** :

- Restreindre CORS au domaine de production
- Envisager `onCall` avec authentification Firebase
- Monitorer les invocations dans Firebase Console

---

## Ressources

- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [Firebase Cloud Functions](https://firebase.google.com/docs/functions)
- [Firebase Admin SDK - Topic Management](https://firebase.google.com/docs/cloud-messaging/admin/manage-topic-subscriptions)

---

**Dernière mise à jour** : 23 février 2026
