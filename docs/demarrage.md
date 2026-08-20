# Démarrage

Cette page couvre les deux besoins les plus courants : **essayer le projet en local**, puis
**l'adapter à votre aérodrome**.

## Essayer en local

Aucun accès aux sources officielles n'est nécessaire : le dépôt fournit des données d'exemple.

```bash
git clone https://github.com/stephanfo/airfield-brief.git
cd airfield-brief
npm install
npm run data:example   # données d'exemple, sans backend
npm run dev            # → http://localhost:9000
```

`npm run data:example` n'écrase jamais un fichier existant : la commande est sans risque, y compris sur
une installation qui reçoit de vraies données.

### Les commandes du projet

```bash
npm run dev              # développement, rechargement à chaud
npm test                 # tests unitaires (Vitest)
npm run lint             # ESLint
npm run format           # Prettier
npx quasar build -m pwa  # build PWA — le mode de déploiement
```

## Adapter à votre aérodrome

Deux fichiers, et deux seulement.

### 1. L'identité du club

Tout ce qui distingue un terrain d'un autre vit dans **`src/config/club.config.js`** : nom de
l'application, code OACI, coordonnées, orientation et longueur de piste, nature de la surface, webcams,
zones AZBA prioritaires, topics de notification, et modules activés.

C'est un choix d'architecture délibéré ([ADR-030](DECISIONS.md)) : aucune valeur d'identité n'est
codée en dur ailleurs dans l'application.

Les modules optionnels — station météo, webcam, stress thermique, REX, masse et centrage,
notifications — se désactivent par un simple `false`. Un module désactivé disparaît complètement :
route, entrée de menu et chargement de données. Pas de page en erreur, jamais.

> Le fichier commenté, avec toutes les valeurs et leurs effets, est dans le
> [README du dépôt](https://github.com/stephanfo/airfield-brief#adapter-à-votre-aérodrome).

### 2. Le déploiement

`cp .env.example .env`, puis les URLs et clés propres à votre installation. Voir
**[Déploiement](DEPLOYMENT.md)** pour la procédure complète : build, `.htaccess`, mise en ligne et
recette après déploiement.

### 3. Les données

C'est le point qui demande le plus de réflexion, puisque le pipeline d'Ancenis n'est pas encore
public. Le format attendu est entièrement documenté : voir **[Le pipeline de
données](DATA_PIPELINE.md)**.

## Ensuite

- [Architecture](ARCHITECTURE.md) — comment l'application est construite
- [Décisions (ADR)](DECISIONS.md) — pourquoi elle est construite ainsi
- [Feuille de route](ROADMAP.md) — où va le projet, et ce qui en est exclu
