---
layout: home

hero:
  name: Airfield Brief
  text: Le briefing pré-vol VFR de votre aérodrome
  tagline: Météo décodée, NOTAMs filtrés, zones AZBA, masse et centrage — sur un seul écran, dans le hangar comme sur le téléphone. Logiciel libre, conçu pour être repris par n'importe quel aéroclub.
  actions:
    - theme: brand
      text: Voir la démo (instance d'Ancenis)
      link: https://brief.aeroclub-ancenis.fr
    - theme: alt
      text: L'installer chez soi
      link: /demarrage
    - theme: alt
      text: Code source
      link: https://github.com/stephanfo/airfield-brief

features:
  - icon: 🌤️
    title: Météo décodée en français
    details: METAR et TAF traduits (~900 Q-codes), avec vos propres seuils VFR. Un bilan Go/No-Go synthétise visibilité, plafond, vent et traversier.
  - icon: 📋
    title: NOTAMs enfin lisibles
    details: Filtrage par validité, trafic VFR/IFR, niveaux de vol et catégories. Chaque NOTAM est décodé et situé sur une carte ; ceux que vous avez lus se masquent.
  - icon: 🚫
    title: Zones AZBA
    details: Statut des zones militaires et créneaux d'activation, avec mise en avant de celles qui concernent votre terrain.
  - icon: 🗺️
    title: Cartes TEMSI, WINTEM et VAC
    details: Cartes météo significatives, vents en altitude, et cartes d'approche triées par distance au terrain.
  - icon: 🌅
    title: Nuit aéronautique
    details: Aube, crépuscule et nuit aéronautique calculés sur les éphémérides IMCCE — l'heure limite d'atterrissage, sans calcul mental.
  - icon: 💨
    title: Station météo du terrain
    details: Vent instantané, rose des vents superposée à l'axe de piste, historique 24 h. Optionnel, si votre club dispose d'une station.
  - icon: ⚖️
    title: Masse, centrage et performances
    details: Devis de masse, enveloppe de centrage, distances de décollage et d'atterrissage avec marge piste, carburant et check-lists.
  - icon: 📡
    title: Fonctionne sans réseau
    details: PWA installable depuis le navigateur. Le dernier briefing consulté reste accessible dans le hangar, même sans couverture.
---

> [!WARNING] Aide à la préparation, pas source officielle
> Les données proviennent de sources officielles
> (SIA, Météo-France) mais sont retraitées et mises en cache. Le briefing réglementaire reste celui
> des services officiels ; la responsabilité de la décision de vol appartient au commandant de bord.

## Le problème

Préparer un vol VFR local, aujourd'hui, c'est ouvrir cinq sites. Le METAR sur l'un, les NOTAMs sur un
autre — en anglais, non filtrés, mêlant l'IFR au VFR et les niveaux de vol qui ne vous concernent pas.
Les zones AZBA ailleurs encore. Les cartes sur un quatrième. Puis reprendre le tout sur un téléphone,
debout dans le hangar, avant de partir.

Rien de tout cela n'est difficile. C'est simplement long, dispersé, et facile à écourter un jour de
beau temps. Airfield Brief rassemble ces informations sur un écran, filtrées pour **votre** terrain et
**votre** type de vol.

## Une démo, avec de vraies données

<https://brief.aeroclub-ancenis.fr> est l'instance de l'aéroclub d'Ancenis, en service, avec les
données du jour.

Vous remarquerez qu'elle s'appelle « LFFI Brief » et non « Airfield Brief » : c'est exactement le
propos. Chaque aérodrome installe le projet sous son propre nom, avec sa piste, ses coordonnées, ses
zones et ses modules. C'est à ça que ressemble une reprise du projet.

## Comment ça marche

L'application n'a **aucun backend**. Elle lit des fichiers JSON statiques produits à l'extérieur :

```
Sources officielles  →  Agrégation  →  JSON statiques  →  PWA
(SIA, Météo-France,     (N8N, cron,     public/data/       lecture seule
 IMCCE, station)         scripts…)                         + cache navigateur
```

C'est ce qui rend l'hébergement accessible : un mutualisé Apache suffit, sans base de données ni
serveur applicatif. Aucun compte utilisateur, aucune donnée personnelle collectée — vos préférences
restent dans votre navigateur.

Les services d'agrégation utilisés à Ancenis ne sont pas encore publiés, mais **le format qu'ils
respectent l'est entièrement** : vous pouvez brancher vos propres scripts.
[Voir le contrat de données →](/DATA_PIPELINE)

## Par où commencer

**Je suis pilote à Ancenis** — ouvrez [la démo](https://brief.aeroclub-ancenis.fr) et installez-la sur
votre téléphone : depuis le navigateur, « Ajouter à l'écran d'accueil ». Elle fonctionnera ensuite
comme une application, y compris hors réseau.

**Je voudrais ça pour mon aéroclub** — l'identité du terrain tient dans un seul fichier de
configuration. Commencez par le [démarrage rapide](/demarrage), puis le [déploiement](/DEPLOYMENT).
Comptez un hébergement mutualisé et un moyen d'alimenter les données.

**Je veux contribuer** — le [code est sur GitHub](https://github.com/stephanfo/airfield-brief), la
[feuille de route](/ROADMAP) dit où va le projet et ce qui en est explicitement exclu.

## Licence

Le projet est sous **AGPL-3.0**. Vous pouvez l'utiliser, le modifier et le déployer librement, y
compris pour votre club. La clause Affero ajoute une condition : si vous le mettez à disposition en
ligne, même sans le distribuer, vous devez proposer le code source de votre version — améliorations
comprises.

C'est un choix délibéré : les adaptations faites par un aéroclub profitent aux suivants.
