# Déploiement

Comment mettre l'application en production. Elle est **entièrement statique** : un hébergement mutualisé avec Apache suffit, aucun serveur applicatif n'est nécessaire.

---

## 1. Configurer le déploiement

```bash
cp .env.example .env
```

| Variable                    | Obligatoire | Rôle                                                                          |
| --------------------------- | :---------: | ----------------------------------------------------------------------------- |
| `PUBLIC_PATH`               |      ✔      | `/` à la racine d'un domaine, `/sous-chemin/` sinon (garder les deux `/`)     |
| `APP_URL`                   |             | URL absolue du site, sans `/` final — construit l'image d'aperçu des partages |
| `FIREBASE_*`                |             | Notifications push (7 variables) — inutiles si le module est désactivé        |
| `REX_SUBMIT_URL` / `_TOKEN` |             | Service de soumission de REX — inutile si le module est désactivé             |

⚠️ **`.env` n'est pas un coffre-fort.** L'application est compilée : ces valeurs finissent **en clair dans le bundle** téléchargé par le navigateur. Le `.env` évite seulement de les inscrire dans l'historique git. Les clés Firebase Web et le jeton REX ne sont pas des secrets par nature (voir §5 pour la façon correcte de les protéger) ; les vrais secrets (SMTP, identifiants d'API) restent côté serveur.

## 2. Construire

```bash
npm ci
npm run lint && npm test
npx quasar build -m pwa
```

Le résultat est dans `dist/pwa/`.

## 3. Publier

Copier **le contenu** de `dist/pwa/` à la racine du répertoire servi, puis y ajouter le fichier de configuration Apache :

```bash
cp deploy/.htaccess dist/pwa/.htaccess
# puis envoyer dist/pwa/* (y compris .htaccess) sur l'hébergement
```

### Le `.htaccess` est obligatoire

L'application utilise le mode de routage `history` ([ADR-009](DECISIONS.md), amendement) : les URLs sont propres (`/notam` et non `/#/notam`), mais **le serveur doit renvoyer `index.html` pour toute URL inconnue**. Sans cela, ouvrir directement `/notam` ou rafraîchir la page produit un **404**.

[`deploy/.htaccess`](https://github.com/stephanfo/airfield-brief/blob/main/deploy/.htaccess) fournit :

- le repli SPA, en préservant les fichiers réellement existants (assets **et surtout `data/*.json`**, qui recevraient sinon du HTML et casseraient silencieusement le chargement des données) ;
- les en-têtes de cache : `sw.js` et `manifest.json` jamais mis en cache (sinon les mises à jour ne sont plus détectées), JSON revalidés, assets hashés en cache long.

**Hébergement sans réécriture d'URL** (pas de `mod_rewrite`, certains CDN) : repassez `vueRouterMode` à `'hash'` dans `quasar.config.js`. C'est le seul changement nécessaire — aucun code ne dépend du mode de routage.

**Déploiement en sous-répertoire** : décommentez `RewriteBase` dans le `.htaccess` et alignez-le sur `PUBLIC_PATH`.

## 4. Alimenter les données

L'application lit `public/data/*.json`, qui doivent être déposés à la racine servie, dans un sous-dossier `data/`. Ces fichiers sont produits **hors application** (workflows N8N, scripts) et ne sont pas versionnés.

Pointez votre pipeline vers `…/data/` sur l'hébergement. Les formats attendus sont décrits dans [ARCHITECTURE.md](ARCHITECTURE.md) ; des exemples exploitables sont dans `public/data/examples/`.

Les caractéristiques du terrain (piste, altitude, coordonnées) ne font PAS partie de ces données : elles vivent dans `src/config/club.config.js` ([ADR-030](DECISIONS.md)).

## 5. Sécuriser les services externes

### Firebase Cloud Messaging

Les clés Web Firebase sont publiques par conception ; leur protection ne vient pas du secret mais de la **restriction d'usage** :

1. **Firebase Console → Authentication → Settings → Authorized domains** : ajouter le domaine de production.
2. **Google Cloud Console → APIs & Services → Credentials** : sur la clé API, définir une restriction _HTTP referrers_ limitée à votre domaine. **À faire avant la mise en ligne** — sans cela, la clé est utilisable depuis n'importe quel site.
3. Mettre à jour la liste CORS de la Cloud Function d'envoi, puis la redéployer.

### Service de soumission de REX

Déployer le service `rex-submit`, renseigner côté serveur l'adresse du destinataire, le SMTP et l'origine autorisée. Le jeton partagé étant visible dans le bundle, **changez-le à chaque changement de domaine** et alignez les deux côtés.

## 6. Recette après mise en ligne

Dans l'ordre d'importance :

- [ ] **Mode hors ligne** — onglet _Application → Cache Storage_ : le cache `aviation-data` se remplit. Passer en mode avion, recharger : les données s'affichent. **C'est le point de vigilance principal : un échec ici est totalement silencieux.**
- [ ] **URLs profondes** — ouvrir directement `<domaine>/notam` dans un onglet neuf, puis rafraîchir. Un 404 signifie que le `.htaccess` n'est pas actif.
- [ ] **Données** — toutes les pages affichent des données réelles ; la page _Info système_ ne montre aucun store en erreur.
- [ ] **Installation PWA** — l'application s'installe, avec le bon nom et les bonnes icônes.
- [ ] **Notifications** — abonnement, réception, icône visible, le clic ouvre la bonne page.
- [ ] **Mise à jour** — redéployer et vérifier que la bannière de nouvelle version apparaît (preuve que `sw.js` n'est pas mis en cache).

## 7. Changer de domaine

Le stockage navigateur et les abonnements push sont liés à l'**origine**. Un changement de domaine implique donc :

- **perte des préférences** des utilisateurs (NOTAMs masqués, seuils VFR, personnalisation du menu) — inévitable ;
- **perte des abonnements push** : chacun doit se réabonner. Prévenez les utilisateurs depuis l'ancienne origine avant la bascule ;
- une redirection de l'ancienne URL vers la nouvelle.
