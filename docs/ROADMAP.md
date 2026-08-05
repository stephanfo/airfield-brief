# Feuille de route

Les grandes directions du projet. Le suivi fin se fait dans les [issues GitHub](https://github.com/stephanfo/airfield-brief/issues) — c'est là qu'il faut proposer une idée ou signaler un besoin.

Rien de tout ceci n'est daté : le projet avance au rythme d'un aéroclub, pas d'une feuille de route commerciale.

---

## Priorité haute

### Ouvrir le pipeline de données

C'est la principale limite actuelle pour qui veut reprendre le projet : l'application est publique, mais les services qui produisent `public/data/*.json` ne le sont pas encore. Ils seront ouverts un par un, après nettoyage :

- scripts d'agrégation (REX FFA, prévision thermique) ;
- service de notifications push ;
- workflows d'acquisition des sources officielles (SIA, Météo-France, IMCCE).

En attendant, les formats sont documentés dans [ARCHITECTURE.md](ARCHITECTURE.md) et des exemples exploitables sont fournis.

### Tests des composants

Les utilitaires, composables et stores sont couverts ; les composants `.vue` ne le sont pas encore. C'est le principal angle mort de la suite de tests.

### Accessibilité

Audit WCAG 2.1 AA : contrastes, navigation au clavier, libellés ARIA. Une application consultée en extérieur, en plein soleil, avant un vol, a des exigences de lisibilité particulières.

---

## Fonctionnalités envisagées

**Météo et NOTAM**
Tendance courte issue du TAF ; recherche textuelle et tri dans les NOTAMs ; virtualisation de la liste pour les périodes chargées ; infobulles explicatives sur les Q-codes.

**Préparation du vol**
Annuaire des fréquences et informations terrain consultable hors ligne ; export PDF du briefing ; historique des derniers briefings.

**Confort d'usage**
Mode sombre ; aérodromes favoris ; comparaison de deux terrains côte à côte ; partage d'un briefing par lien ; squelettes de chargement.

**Mobile**
L'application s'installe déjà comme PWA depuis le navigateur (iOS et Android), ce qui couvre l'essentiel du besoin. Des applications natives (via Capacitor) et des widgets d'écran d'accueil restent envisageables si un usage le justifie.

---

## Technique

- Renforcement du mode hors ligne (couverture plus large du cache, meilleure signalisation de la fraîcheur des données).
- Content Security Policy stricte.
- Supervision des erreurs en production.
- Audit de performance (Lighthouse).
- Documentation JSDoc des API internes.

---

## Hors périmètre

Quelques choix assumés, pour éviter des propositions qui seraient refusées :

- **Pas de backend applicatif.** L'architecture statique est ce qui rend le déploiement accessible à un aéroclub. Voir [ADR-007](DECISIONS.md).
- **Pas de comptes utilisateurs.** Aucune donnée personnelle n'est collectée ; les préférences restent dans le navigateur.
- **Pas de substitution au briefing officiel.** L'application aide à préparer un vol, elle ne remplace pas les services officiels et n'a pas vocation à devenir un outil de navigation.
- **Multi-pistes non géré.** Le modèle actuel suppose une piste unique dont les QFU dérivent d'un cap ([ADR-030](DECISIONS.md)). Un terrain à pistes croisées demanderait une évolution — la demande est légitime, elle n'est simplement pas encore couverte.
