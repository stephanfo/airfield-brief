# Contribuer

Merci de l'intérêt porté au projet. Les contributions les plus utiles sont celles qui viennent d'un usage réel : un aéroclub qui adapte l'application à son terrain rencontre des cas que personne d'autre ne verra.

## Avant de coder

- **Ouvrez une issue d'abord** pour toute évolution non triviale — cela évite un travail qui prendrait une direction inattendue.
- **Signaler un bug** : décrivez le contexte de vol/consultation, ce qui était attendu, ce qui s'est produit. Une capture d'écran et le contenu du JSON concerné aident beaucoup.
- **Adapter à votre aérodrome** ne demande normalement aucune modification du code : si vous devez éditer autre chose que `club.config.js` et `.env`, c'est un manque de configurabilité — signalez-le, c'est un bug.

## Le projet est en français

Interface, commentaires, documentation et messages de commit sont **en français**. C'est un choix assumé : le public visé est constitué de pilotes et d'aéroclubs francophones, et le vocabulaire aéronautique français est précis (QFU, plafond, nuit aéronautique…). Les identifiants de code restent en anglais, comme il est d'usage.

## Conventions de code

Le détail est dans **[docs/ai/AGENT_GUIDE.md](docs/ai/AGENT_GUIDE.md)** — à lire avant une première contribution. L'essentiel :

- **Composition API + `<script setup>`** exclusivement. Jamais l'Options API ni `this`.
- **`storeToRefs(store)`** pour extraire l'état réactif d'un store ; déstructurer directement perd la réactivité.
- **Aucun `fetch()` direct** dans un store ou une page : tout passe par `useDataFetcher`.
- **Composants Quasar** plutôt que du HTML/CSS reconstruit à la main. Voir **[docs/UI_CHARTER.md](docs/UI_CHARTER.md)** pour les règles d'interface (cartes, couleurs de statut, espacements).
- **Aucune valeur d'identité en dur** — code OACI, coordonnées, nom du club, URL : tout vient de `club.config.js` ([ADR-030](docs/DECISIONS.md)).
- **Aucune clé `localStorage` en dur** : passer par `STORAGE_KEYS` (`src/config/storageKeys.js`). `localStorage` ne contient que des **préférences d'interface**, jamais de donnée aéronautique faisant autorité.
- **Un module optionnel se rattache à son feature flag**, sinon un fork qui ne dispose pas du service se retrouve avec une page cassée.

## Avant de proposer une pull request

```bash
npm test        # doit être vert
npm run lint    # doit être vert
npm run format  # applique Prettier
```

Vérifiez aussi le rendu dans le navigateur (`npm run dev`) : les composants `.vue` ne sont pas encore couverts par les tests.

## Messages de commit

Format `type(portée): description`, en français, à l'impératif :

```
feat(notam): filtre par catégorie de Q-code
fix(azba): ne jamais afficher un faux « inactif » sur données non fiables
docs(deploiement): précise la configuration du fallback SPA
```

Types utilisés : `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `style`.

## Décisions d'architecture

Un choix structurant (dépendance nouvelle, changement de flux de données, rupture de compatibilité) se documente par un **ADR** ajouté à [docs/DECISIONS.md](docs/DECISIONS.md) : contexte, décision, conséquences, alternatives rejetées. Le format est décrit en tête du fichier. Consultez les ADR existants avant de remettre en cause un choix : la raison y est probablement déjà expliquée.

## Sécurité

Ne publiez jamais dans une issue ou une PR : clés d'API, jetons, URLs de services privés, ou données personnelles issues de REX. Pour signaler une vulnérabilité, ouvrez une issue sans détail exploitable en demandant un contact privé.

## Licence

En contribuant, vous acceptez que votre travail soit distribué sous [AGPL-3.0](LICENSE), comme le reste du projet.
