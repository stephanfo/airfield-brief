# Documentation LFFI Brief — Index

Point d'entrée unique de la documentation du projet. Ce fichier sert de guide de navigation.

---

## Arborescence

```
docs/
├── INDEX.md                 ← Ce fichier (navigation)
├── ARCHITECTURE.md          ← Architecture technique complète
├── PRD.md                   ← Product Requirements Document
├── DECISIONS.md             ← Architecture Decision Records
├── DEPLOYMENT.md            ← Mise en production (.env, .htaccess, recette)
├── ROADMAP.md               ← Feuille de route publique
├── UI_CHARTER.md            ← Règles d'interface
├── NOTIFICATIONS.md         ← Setup Firebase Cloud Messaging
├── LOGGING_STRATEGY.md      ← Stratégie de logging (logger.js / console)
└── ai/                      ← Documentation spécifique agents IA
    └── AGENT_GUIDE.md       ← Guide technique unique (règles, patterns, contrats)

README.md (racine)           ← Point d'entrée projet (stack, install, liens)
```

---

## Guide de Lecture par Profil

### Chef de Projet / Product Owner

| Ordre | Fichier                        | Temps  | Contenu                                        |
| ----- | ------------------------------ | ------ | ---------------------------------------------- |
| 1     | [README.md](../README.md)      | 2 min  | Vue d'ensemble, stack, commandes               |
| 2     | [PRD.md](./PRD.md) ⭐          | 30 min | Fonctionnalités, métriques, glossaire aviation |
| 3     | [ROADMAP.md](./ROADMAP.md)     | 5 min  | Grandes directions, hors périmètre assumé      |
| 4     | [DECISIONS.md](./DECISIONS.md) | 15 min | Décisions stratégiques (optionnel)             |

### Développeur Frontend

| Ordre | Fichier                                     | Temps  | Contenu                                              |
| ----- | ------------------------------------------- | ------ | ---------------------------------------------------- |
| 1     | [README.md](../README.md)                   | 2 min  | Setup dev                                            |
| 2     | [ARCHITECTURE.md](./ARCHITECTURE.md) ⭐     | 20 min | Stores, composables, cache, flux de données          |
| 3     | [ai/AGENT_GUIDE.md](./ai/AGENT_GUIDE.md) ⭐ | 8 min  | Règles enforced, patterns, contrats, pièges          |
| 4     | [DECISIONS.md](./DECISIONS.md)              | 15 min | Comprendre les choix (ADR-002 Pinia, ADR-005 cache…) |
| 5     | [ROADMAP.md](./ROADMAP.md)                  | 5 min  | Directions en cours, dette technique connue          |

### Agent IA (Copilot, Claude, ChatGPT…)

Le point d'entrée chargé automatiquement par Claude Code est `CLAUDE.md` (racine). Pour aller plus loin :

| Ordre | Fichier                                       | Temps  | Contenu                                                    |
| ----- | --------------------------------------------- | ------ | ---------------------------------------------------------- |
| 1     | [../CLAUDE.md](../CLAUDE.md) ⭐⭐⭐           | 2 min  | Entrée : règles enforced, flux de données, pointeurs       |
| 2     | [ai/AGENT_GUIDE.md](./ai/AGENT_GUIDE.md) ⭐⭐ | 8 min  | Patterns store/page/composable, contrats, domaines, pièges |
| 3     | [PRD.md](./PRD.md)                            | 20 min | Besoin métier, glossaire                                   |
| 4     | [ARCHITECTURE.md](./ARCHITECTURE.md)          | 20 min | API détaillée des stores et composables                    |
| 5     | [DECISIONS.md](./DECISIONS.md)                | 15 min | ADR (ne pas réinventer)                                    |
| 6     | [ROADMAP.md](./ROADMAP.md)                    | 5 min  | Ce qui est prévu, ce qui est hors périmètre                |

Le suivi fin des tâches se fait dans les [issues GitHub](https://github.com/stephanfo/airfield-brief/issues) : les consulter avant de proposer une fonctionnalité, pour éviter les doublons.

**Session courte** : CLAUDE.md + AGENT_GUIDE.md (~10 min) couvrent l'essentiel.

### Pilote PPL / Utilisateur

| Ordre | Fichier                   | Temps  | Contenu                             |
| ----- | ------------------------- | ------ | ----------------------------------- |
| 1     | [README.md](../README.md) | 2 min  | Description du projet               |
| 2     | [PRD.md](./PRD.md) ⭐      | 15 min | Fonctionnalités, glossaire aviation |
| 3     | [ROADMAP.md](./ROADMAP.md) | 5 min  | Futures fonctionnalités             |

---

## Description des Fichiers

### Essentiels

| Fichier                                  | Rôle                                                                                                          | Audience |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------- | -------- |
| [ARCHITECTURE.md](./ARCHITECTURE.md)     | Stack technique, stores Pinia, cache, composables, structures JSON, notifications push, logging, diagnostic   | Dev, IA  |
| [PRD.md](./PRD.md)                       | Objectif produit, 7 fonctionnalités détaillées, métriques, principes UX, scope, roadmap, glossaire aviation   | Tous     |
| [ai/AGENT_GUIDE.md](./ai/AGENT_GUIDE.md) | Guide agent : règles enforced, flux/cache, patterns store/page/composable, domaines (NOTAM, station…), pièges | IA, Dev  |

### Référence régulière

| Fichier                        | Rôle                                                                | Audience       |
| ------------------------------ | ------------------------------------------------------------------- | -------------- |
| [DECISIONS.md](./DECISIONS.md) | Les ADR du projet (Quasar, Pinia, cache, JSON statique, pas d'auth, identité club…) | Dev, Archi, IA |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Mise en production : `.env`, build, `.htaccess` (fallback SPA), sécurisation Firebase, checklist de recette | Dev |
| [ROADMAP.md](./ROADMAP.md) | Feuille de route (grandes directions, hors périmètre assumé) ; le suivi fin est dans les issues GitHub | Tous |

### Guides spécifiques

| Fichier                                      | Rôle                                                                | Audience |
| -------------------------------------------- | ------------------------------------------------------------------- | -------- |
| [NOTIFICATIONS.md](./NOTIFICATIONS.md)       | Setup Firebase FCM, Cloud Function, topics, payload, N8N, dépannage | Dev      |
| [LOGGING_STRATEGY.md](./LOGGING_STRATEGY.md) | `logger.js` vs `console`, conventions, diagnostic PWA, StatusPage   | Dev      |

---

## Workflow de Mise à Jour

| Changement                      | Fichier(s) à mettre à jour                |
| ------------------------------- | ----------------------------------------- |
| Nouvelle fonctionnalité         | `PRD.md` + issue GitHub associée          |
| Décision architecturale         | `DECISIONS.md` (ajouter ADR)              |
| Changement API store/composable | `ARCHITECTURE.md` + `ai/AGENT_GUIDE.md`   |
| Bug fix                         | Issue GitHub (fermée par la PR)           |
| Nouvelle dépendance             | `DECISIONS.md` (ADR), `README.md` (stack) |
| Nouveau pattern de code         | `ai/AGENT_GUIDE.md` (patterns)            |
| Direction de fond               | `ROADMAP.md`                              |

### Checklist avant commit

- [ ] Documentation impactée par le changement de code ?
- [ ] Nouvelle décision → ADR ajouté dans DECISIONS.md ?
- [ ] API publique modifiée → ARCHITECTURE.md + ai/AGENT_GUIDE.md synchronisés ?

---

## Conventions Documentation

### Émojis standards

| Émoji    | Signification               | Usage                    |
| -------- | --------------------------- | ------------------------ |
| ⭐       | Important                   | Titres, priorité lecture |
| ✅       | Terminé                     | Statut, fonctionnalités  |
| ❌       | Interdit / Annulé           | Règles, scope OUT        |
| ⚠️       | Attention / Hypothèse       | Zones floues             |
| 🔴🟠🟡🟢 | Priorité (critique → basse) | Issues, suivi            |
| ⏳       | À faire                     | Backlog                  |
| 🚧       | En cours                    | WIP                      |
| 💡       | Idée                        | R&D                      |

### Format ADR

```markdown
## ADR-XXX : Titre

**Date** : JJ/MM/AAAA
**Statut** : ✅ Acceptée

### Contexte / Décision / Conséquences (+/-) / Alternatives rejetées
```


---

## Plan de Maintenance

| Fréquence                    | Action                                                        |
| ---------------------------- | ------------------------------------------------------------- |
| À chaque commit significatif | Mettre à jour docs impactés (voir workflow ci-dessus)         |
| Mensuel                      | Revue des issues ouvertes, vérification des liens de la doc   |
| Trimestriel                  | Vérifier versions dans ARCHITECTURE.md vs package.json        |

---

**Dernière mise à jour** : 5 août 2026
**Mainteneur** : Stephanfo
