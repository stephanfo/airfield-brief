# Product Requirements Document (PRD)

## Portail Aéronautique LFFI Brief

---

## 📋 Vue d'ensemble

### Objectif du produit

Fournir aux pilotes privés PPL/VFR un outil mobile-first centralisant **toutes les informations aéronautiques critiques** pour préparer et suivre un vol au départ/arrivée de l'aérodrome d'Ancenis (LFFI).

### Vision

Remplacer la consultation dispersée (sites SIA, Météo France, NOTAM, AZBA) par **une seule interface unifiée, temps réel, disponible offline**.

### Utilisateurs cibles

- **Pilotes PPL** (licence de pilote privé)
- **Vols VFR** (Visual Flight Rules - vol à vue)
- **Instructeurs** et étudiants PPL
- **Utilisateurs occasionnels** (weekend pilots)

---

## 🎯 Problème Résolu

### Points de friction actuels

1. **Dispersion des sources** : 5+ sites web à consulter (SIA, Météo France, SOFIA, AZBA...)
2. **Manque de mobilité** : Sites desktop non optimisés mobile
3. **Pas de synthèse** : Impossible d'avoir vue d'ensemble rapide
4. **Données obsolètes** : Rafraîchissement manuel nécessaire
5. **Pas d'historique** : Difficile de suivre l'évolution (nouveaux NOTAMs)
6. **Terminologie complexe** : Q-codes et abréviations OACI non traduits

### Solution apportée

✅ **Interface unique** regroupant toutes les données  
✅ **Mobile-first** : optimisé tablette en cockpit  
✅ **Temps réel** : rafraîchissement auto toutes les heures  
✅ **Mode offline** : PWA avec Service Worker  
✅ **Traductions** : METAR/TAF décodés en français  
✅ **Filtres intelligents** : par FL, trafic VFR/IFR, validité

---

## 🔑 Fonctionnalités Principales

### 1. Page d'accueil - Synthèse

**Rôle** : Dashboard global avant vol

- ✅ **Piste en service** : QFU, vent (composantes), état
- ✅ **Météo actuelle** : METAR décodé, conditions visuelles (VFR/MVFR/IFR)
- ✅ **Prévisions courtes** : TAF 6h et 24h
- ✅ **Statut AZBA** : Zones prioritaires (R149E, R57...) actives/inactives
- ✅ **Résumé NOTAMs** : Compteurs (total, nouveaux, en cours, futurs)
- ✅ **Cartes TEMSI/WINTEM** : 2 dernières cartes disponibles
- ✅ **Webcam** : Vue terrain en temps réel (5 min)
- ✅ **Horodatage** : Date de dernière mise à jour visible

**Valeur** : Vision 360° en 10 secondes max

---

### 2. Météo Aéronautique

**Rôle** : Briefing météo complet

#### 2.1 Conditions actuelles (METAR)

- ✅ METAR brut + décodage français complet
- ✅ Vent (vitesse, direction, rafales, composantes piste)
- ✅ Visibilité horizontale (mètres + qualification VFR/IFR)
- ✅ Plafond nuageux (couches, type, altitude)
- ✅ Température / Point de rosée (avec écart givrage)
- ✅ QNH / QFE
- ✅ Phénomènes météo (pluie, brouillard, orage...)
- ✅ RVR si disponible
- ✅ Tendance (TEMPO, BECMG...)

#### 2.2 Prévisions (TAF)

- ✅ TAF brut + décodage
- ✅ Évolution par tranches horaires
- ✅ Prévisions 6h et 24h
- ✅ Changements temporaires (TEMPO) et définitifs (BECMG)

#### 2.3 Aérodromes secondaires

- ✅ Liste aérodromes proches (LFRN Rennes, LFRS Nantes...)
- ✅ METAR/TAF pour chaque terrain
- ✅ Distance depuis LFFI

**Données sources** : `public/data/weather.json` (mise à jour horaire)

---

### 3. NOTAMs

**Rôle** : Alertes aéronautiques avec filtrage avancé

#### 3.1 Affichage

- ✅ NOTAMs AD (aérodrome LFFI)
- ✅ NOTAMs FIR (région de vol)
- ✅ Catégorisation automatique (8 catégories)
- ✅ Badge "Nouveau" si < 24h
- ✅ Badge "En cours" si actif maintenant
- ✅ Texte décodé (itemE)
- ✅ Période validité (itemB → itemC)
- ✅ Localisation + Q-code

#### 3.2 Filtres disponibles

- ✅ **Par validité** : Tous / En cours / Futurs
- ✅ **Par trafic** : Tous / VFR / IFR
- ✅ **Par niveaux de vol** : FL 0-100+ (slider)
- ✅ **Par catégories** :
  - Aérodromes et services
  - Aire de mouvement
  - Navigation
  - Obstacles
  - Espace aérien
  - Communications
  - Réglementation
  - Dangers et restrictions

#### 3.3 Gestion utilisateur

- ✅ **Masquer un NOTAM** : persiste jusqu'à expiration
- ✅ **Marquer comme vu** : indicateur "nouveau" disparaît
- ✅ **Afficher/cacher masqués** : toggle
- ✅ **Réinitialiser le masquage** : tout remettre à zéro
- ✅ **Persistance** : localStorage (survit au rechargement)

#### 3.4 Statistiques temps réel

- ✅ Total NOTAMs
- ✅ Nouveaux (< 24h)
- ✅ En cours (actifs)
- ✅ Futurs (pas encore actifs)
- ✅ Masqués (par utilisateur)

**Données sources** : `public/data/notam.json`

---

### 4. Zones AZBA

**Rôle** : Planification trajets (évitement zones actives)

- ✅ Liste toutes zones France
- ✅ **Zones prioritaires** en tête (R149E, R57, R149D, R147)
- ✅ Statut actif/inactif
- ✅ Créneaux d'activation (heures UTC)
- ✅ Fenêtre de validité (72h glissantes)
- ✅ Compteur zones actives

**Données sources** : `public/data/azba.json`

---

### 5. Cartes TEMSI / WINTEM

**Rôle** : Planification météo régionale

#### 5.1 TEMSI (TEMps SIgnificatif)

- ✅ Cartes France métropolitaine
- ✅ Échéances multiples (H+3, H+6, H+9...)
- ✅ Affichage plein écran
- ✅ Date validité visible
- ✅ Liste complète ou limitée (2 dernières sur accueil)

#### 5.2 WINTEM (WIND and TEMperature)

- ✅ Même fonctionnement que TEMSI
- ✅ Altitudes FL multiples
- ✅ Vent et température en altitude

**Données sources** :

- `public/data/temsi.json`
- `public/data/wintem.json`

---

### 6. Cartes VAC

**Rôle** : Approche et procédures terrain

- ✅ Cartes d'aérodrome (VAC = Visual Approach Chart)
- ✅ Visualisation PDF/images
- ✅ Zoom/pan

**Données sources** : `public/data/vac.json`

---

### 7. Webcam Terrain

**Rôle** : Vérification conditions réelles

- ✅ Image temps réel du terrain
- ✅ Rafraîchissement auto 5 minutes
- ✅ Horodatage capture + alerte « image périmée » (caméra hors ligne)
- ✅ Timelapse de la dernière heure, avec réglage de vitesse
- ✅ Zoom plein écran

**Source** : serveur webcam du club, configuré dans `src/config/club.config.js`
(`webcam`). Module optionnel : `webcam: null` le désactive entièrement.

---

## 🚀 Fonctionnalités PWA

### Mode Offline

- ✅ Service Worker (Workbox)
- ✅ Cache stratégies (network-first pour data, cache-first pour assets)
- ✅ Fallback si pas de réseau
- ✅ Indicateur "Mode offline" visible

### Installation

- ✅ Installable sur écran d'accueil (iOS/Android)
- ✅ Icônes adaptatives
- ✅ Splash screen
- ✅ Thème couleur (#ff9800 - orange aviation)

### Performance

- ✅ Cache TTL 1 heure (données météo/NOTAM)
- ✅ Cache 5 minutes (webcam)
- ✅ Déduplication requêtes (évite appels simultanés)
- ✅ Stale-while-revalidate (affiche cache pendant chargement)

---

## 📊 Métriques de Succès

### Métriques utilisateur

| Métrique                 | Cible   | Mesure                                     |
| ------------------------ | ------- | ------------------------------------------ |
| Temps préparation vol    | -50%    | Avant : 15 min sur 5 sites → Après : 7 min |
| Taux utilisation mobile  | > 80%   | Analytics device type                      |
| Taux rétention 7 jours   | > 60%   | PWA analytics                              |
| Satisfaction utilisateur | > 4.5/5 | Enquête post-vol                           |

### Métriques techniques

| Métrique               | Cible  | Actuel      |
| ---------------------- | ------ | ----------- |
| First Contentful Paint | < 1.5s | À mesurer   |
| Time to Interactive    | < 3s   | À mesurer   |
| Lighthouse Score       | > 90   | À mesurer   |
| Cache Hit Ratio        | > 70%  | À monitorer |
| Taux erreur API        | < 1%   | À monitorer |

---

## 🎨 Principes UX

### Mobile-First

- Touch-friendly (boutons min 44x44px)
- Lisibilité en cockpit (contraste élevé, police 16px min)
- Pas de hover (tout en tap)
- Swipe gestures (future)

### Accessibilité

- Respect WCAG 2.1 AA minimum
- Support lecteurs d'écran
- Contraste texte/fond (4.5:1 min)
- Navigation clavier

### Feedback utilisateur

- ✅ Indicateurs de chargement (spinner)
- ✅ Indicateurs rafraîchissement (badge "Mise à jour...")
- ✅ Badges visuels (Nouveau, En cours)
- ✅ Toast notifications (erreurs réseau)
- ✅ Horodatages partout

---

## 🔐 Données et Sécurité

### Sources de données

**Architecture confirmée** : Workflow N8N génère les JSON toutes les 60 minutes.  
**Processus backend** : N8N (workflow automation) récupère données des sources officielles (SIA, Météo France...) et génère les fichiers JSON statiques.

Fichiers JSON générés :

- `azba.json` - Zones AZBA
- `notam.json` - NOTAMs AD + FIR
- `temsi.json` - Cartes TEMSI
- `weather.json` - METAR/TAF
- `wintem.json` - Cartes WINTEM
- `vac.json` - Cartes VAC

**Fréquence de mise à jour** : 60 minutes (synchronisée avec cache frontend TTL 1h)

### Sécurité

- ✅ HTTPS obligatoire (PWA requirement)
- ✅ Content Security Policy (à vérifier)
- ✅ Pas de données sensibles (tout public)
- ✅ localStorage seulement pour préférences UI

### RGPD

- ✅ Pas de tracking utilisateur
- ✅ Pas de cookies tiers
- ✅ Données stockées localement uniquement
- ✅ Anonymat complet

---

## 🚧 Limites Connues

### Scope OUT (non implémenté)

❌ Plan de vol (dépôt FPL)  
❌ Calcul navigation (route, carburant)  
❌ Partage entre pilotes  
❌ Historique météo  
❌ Export PDF du briefing  
❌ Multi-aérodromes (seulement LFFI)  
❌ Authentification utilisateur

### Limites connues

⚠️ **Pas de carte AZBA** : les zones sont présentées en liste (statut + créneaux), sans
représentation cartographique. Seules les cartes VAC disposent d'une carte Leaflet.
⚠️ **Pas de synchronisation multi-appareils** : les préférences (NOTAMs masqués, seuils VFR,
personnalisation du menu) vivent en `localStorage`, donc par navigateur — conséquence assumée
de l'absence de comptes utilisateurs.

### Architecture

✅ **Pas de backend applicatif** : le pipeline (N8N, scripts) génère des JSON statiques,
régénérés environ toutes les heures selon la source.
✅ **Fraîcheur** : « quasi temps réel » — la donnée affichée date au plus du dernier cycle
de génération, et l'interface signale explicitement une donnée périmée.

---

## 🗺️ Roadmap (Hypothétique)

### Phase 1 - MVP (Actuel)

✅ Toutes fonctionnalités listées ci-dessus

### Phase 2 - Améliorations UX

- Virtual scrolling (listes NOTAMs > 50 items)
- Recherche textuelle NOTAMs
- Tri/ordre personnalisé
- Favoris aérodromes
- Mode sombre

### Phase 3 - Fonctionnalités Avancées

- Export PDF briefing complet
- Calcul vent traversier automatique
- Recommandations piste (basé vent)
- Historique derniers vols

### Phase 4 - Collaboration

- Partage briefing avec co-pilote
- Annotations/notes sur NOTAMs
- Feedback terrain (REX)

---

## 📝 Vocabulaire Aviation / Développement

### Glossaire pour développeurs

| Terme Aviation | Signification                                       | Équivalent Dev         |
| -------------- | --------------------------------------------------- | ---------------------- |
| **NOTAM**      | Notice To Airmen - Avis aux navigateurs             | Alert / Notification   |
| **METAR**      | METeorological Aerodrome Report - Observation météo | Current weather data   |
| **TAF**        | Terminal Aerodrome Forecast - Prévision météo       | Weather forecast       |
| **AZBA**       | Activation de Zones par Avis aux Navigateurs        | Restricted airspace    |
| **TEMSI**      | TEMps SIgnificatif - Carte météo                    | Weather map            |
| **WINTEM**     | WIND and TEMperature - Vent et température altitude | Wind aloft chart       |
| **VAC**        | Visual Approach Chart - Carte d'approche            | Airport chart          |
| **FL**         | Flight Level - Niveau de vol (100 FL = 10,000 ft)   | Altitude unit          |
| **VFR**        | Visual Flight Rules - Vol à vue                     | Visual flight mode     |
| **IFR**        | Instrument Flight Rules - Vol aux instruments       | Instrument flight mode |
| **QFU**        | Orientation magnétique de la piste                  | Runway heading         |
| **QNH**        | Pression atmosphérique ramenée au niveau de la mer  | Sea level pressure     |
| **RVR**        | Runway Visual Range - Portée visuelle de piste      | Visibility distance    |
| **MVFR**       | Marginal VFR - Conditions VFR limites               | Marginal weather       |

### Catégories NOTAMs (8)

1. `aerodromes_services` - Services aéroport (carburant, tours...)
2. `aire_mouvement` - Pistes, taxiways, aires de trafic
3. `navigation` - Aides radio (VOR, ILS...)
4. `obstacles` - Obstacles temporaires (grues, ballons...)
5. `espace_aerien` - Zones aériennes (CTR, TMA...)
6. `communications` - Fréquences radio
7. `reglementation` - Procédures, restrictions
8. `dangers_restrictions` - Zones dangereuses, interdites

---

## 🎯 Critères d'Acceptation

### Fonctionnel

- [ ] Affichage correct METAR/TAF LFFI
- [ ] NOTAMs filtrables par validité/trafic/FL
- [ ] Masquage NOTAM persistant (localStorage)
- [ ] AZBA : zones prioritaires en premier
- [ ] Webcam rafraîchie toutes les 5 min
- [ ] Mode offline fonctionnel (Service Worker)
- [ ] Installation PWA possible (mobile/tablette)

### Non-fonctionnel

- [ ] Responsive mobile/tablette/desktop
- [ ] Lighthouse Score > 80 (perf/a11y/best practices/SEO)
- [ ] Temps chargement < 3s (3G)
- [ ] Pas d'erreur console JavaScript
- [ ] Traductions françaises METAR complètes

---

## 📞 Contact et Support

**Mainteneur** : Stephanfo — contact via les issues GitHub  
**Aérodrome cible** : LFFI - Ancenis-Nantes-Aérocampus  
**Communauté** : Aéro-club local, instructeurs PPL

---

**Version** : 1.1.0  
**Dernière mise à jour** : 23 février 2026  
**Statut** : ✅ Production
