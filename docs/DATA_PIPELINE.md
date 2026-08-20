# Le pipeline de données

L'application ne contient aucun backend. Elle lit des **fichiers JSON statiques** déposés dans
`public/data/`, produits à l'extérieur par un pipeline d'agrégation. C'est ce choix qui rend le
déploiement accessible à un aéroclub : un hébergement mutualisé suffit, sans base de données, sans
serveur applicatif, sans compte utilisateur ([ADR-007](DECISIONS.md)).

Cette page décrit **le contrat** entre le pipeline et l'application. Les services qui produisent ces
fichiers pour Ancenis ne sont pas encore publics ([voir la feuille de route](ROADMAP.md)), mais le
format qu'ils respectent l'est entièrement — vous pouvez alimenter l'application avec vos propres
scripts, dans le langage de votre choix.

## Le principe

```
Sources officielles  →  Agrégation  →  JSON statiques  →  PWA
(SIA, Météo-France,     (N8N, PHP,      public/data/       lecture seule
 IMCCE, station)         cron…)                            + cache navigateur
```

L'application ne sait rien de ce qui se passe à gauche de `public/data/`. Elle vérifie l'âge des
fichiers, les met en cache, et signale visuellement une donnée périmée — c'est tout. Un pipeline qui
respecte les formats et les fréquences est interchangeable.

## Ce qu'il faut produire

Chaque endpoint est déclaré dans [`src/config/app.config.js`](https://github.com/stephanfo/airfield-brief/blob/main/src/config/app.config.js) avec sa
fréquence de rafraîchissement côté client et le seuil au-delà duquel la donnée est signalée comme
périmée.

| Fichier                      | Contenu                         | Régénération attendue  |
| ---------------------------- | ------------------------------- | ---------------------- |
| `weather.json`               | METAR, TAF, observations        | toutes les heures      |
| `notam.json`                 | NOTAMs du périmètre VFR local   | toutes les heures      |
| `azba.json`                  | Activation des zones AZBA       | toutes les heures      |
| `temsi.json` / `wintem.json` | Cartes TEMSI et WINTEM          | toutes les heures      |
| `vac.json`                   | Cartes VAC du terrain           | 1×/jour                |
| `wind_current.json`          | Vent instantané de la station   | toutes les 10 min      |
| `wind_history.json`          | Historique du vent              | toutes les heures      |
| `atmosphere.json`            | Température, humidité, pression | toutes les heures      |
| `thermal_forecast.json`      | Prévision thermique             | ~1×/heure              |
| `ephemeris.json`             | Éphémérides (nuit aéronautique) | 1×/jour                |
| `aircrafts.json`             | Index des appareils du club     | manuel, quasi-statique |
| `rex.json`                   | Synthèse des REX                | ~1×/mois               |

Tous ces modules sont **optionnels** sauf la météo et les NOTAMs : `src/config/features.js` permet de
désactiver ceux dont vous n'avez pas la source, sans laisser de page cassée.

## Les formats

Les schémas complets, champ par champ, sont dans
[ARCHITECTURE.md](ARCHITECTURE.md#structure-des-données).

Le plus rapide reste de partir des **exemples fournis**, qui sont des fichiers réels anonymisés :

```bash
npm run data:example   # copie public/data/examples/*.json vers public/data/
npm run dev            # l'application tourne, sans pipeline
```

C'est aussi la manière recommandée de développer sur le projet : aucun accès aux sources officielles
n'est nécessaire.

## Les sources

Le pipeline d'Ancenis agrège les services officiels français :

- **SIA** — NOTAMs, cartes VAC, zones AZBA ;
- **Météo-France** — METAR, TAF, cartes TEMSI et WINTEM ;
- **IMCCE** — éphémérides, pour le calcul de la nuit aéronautique ;
- **Open-Meteo** — prévision thermique ;
- **la station météo du terrain** — vent et paramètres atmosphériques en temps quasi réel.

Un aérodrome hors de France devra remplacer ces sources par ses équivalents nationaux. Le contrat côté
application reste le même : produire les mêmes fichiers, avec les mêmes champs.

## Le rôle de N8N

[N8N](https://n8n.io) orchestre ces récupérations pour Ancenis : un workflow par source, une écriture
de fichier en sortie. **Ce n'est pas une dépendance de l'application** — c'est un choix d'outillage,
motivé par le confort de maintenance d'un workflow visuel.

Un simple `cron` appelant des scripts remplit exactement le même rôle. Une partie du pipeline
d'Ancenis fonctionne d'ailleurs déjà ainsi, en PHP.

## Publier les fichiers

Les JSON doivent être servis depuis `data/` à la racine du site déployé, avec les bons en-têtes de
cache — voir [DEPLOYMENT.md](DEPLOYMENT.md). Un point mérite l'attention : le repli SPA du serveur ne
doit **jamais** intercepter `data/*.json`, sous peine de renvoyer du HTML à la place des données et de
casser silencieusement le chargement. Le `.htaccess` fourni traite ce cas.

## État d'ouverture

Les services d'agrégation seront publiés un par un, après nettoyage : scripts d'agrégation, service de
notifications push, puis workflows d'acquisition. La [feuille de route](ROADMAP.md) suit cette
progression.

En attendant, ce document et les schémas d'[ARCHITECTURE.md](ARCHITECTURE.md) constituent tout ce qui
est nécessaire pour brancher votre propre pipeline.
