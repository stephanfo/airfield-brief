# Charte UI — LFFI Brief

Référence de cohérence visuelle dérivée du code existant. Toute nouvelle UI doit s'y conformer. En cas de doute, inspecter un composant existant avant d'inventer un pattern.

---

## 1. Cards

**Pattern recommandé pour les sections :** utiliser `<SectionCard>` (`src/components/common/SectionCard.vue`) qui garantit la conformité charte par construction.

```vue
<SectionCard title="Mon titre" icon="cloud">
  <!-- contenu -->
  <template #header-actions><!-- badge ou bouton à droite du titre --></template>
</SectionCard>
```

Props : `title` (requis), `icon`, `titleColor` (défaut `'primary'`), `iconSize` (défaut `'md'`), `padding` (défaut `'md'`), `dense` (titre `text-h6` si vrai), `bgClass`.

**Pattern brut :** `<q-card flat bordered class="q-mb-lg q-pa-md">` — à réserver pour les cas non couverts par `<SectionCard>` (sous-cartes de données, dialogues, cards multi-sections).

- Toujours `flat bordered` — jamais `elevated` ni `bg-white text-black` forcé.
- Padding via classe Quasar : `q-pa-sm` (compact) ou `q-pa-md` (standard).
- `q-mb-lg` sur les cards de section principale.

**`<q-separator>` :** autorisé pour délimiter **deux sous-blocs distincts à l'intérieur d'une même card** (ex : grille de données + bloc synthèse dans AerodromesList), ou dans une `q-list`. À utiliser avec parcimonie. **Interdit comme simple trait décoratif juste sous un titre** — dans ce cas, l'espacement et le titre suffisent.

```vue
<!-- ✅ Correct -->
<q-card flat bordered class="q-mb-lg">
  <q-card-section>
    <!-- contenu -->
  </q-card-section>
</q-card>

<!-- ✅ Correct — separator entre deux sous-blocs réellement distincts -->
<q-card flat bordered class="q-pa-md">
  <div><!-- grille de données --></div>
  <q-separator class="q-my-lg" />
  <div><!-- bloc synthèse --></div>
</q-card>

<!-- ❌ Interdit — separator décoratif juste sous le titre -->
<q-card-section>...titre...</q-card-section>
<q-separator />
<q-card-section>...contenu...</q-card-section>
```

---

## 2. Titres de section

**Pattern :** `text-h5 text-weight-bold text-primary flex items-center q-mb-md`

- `text-h5` pour les titres principaux d'un bloc, `text-h6` pour les sous-titres, `text-subtitle2 text-weight-bold` pour les en-têtes de sous-cartes.
- `text-weight-bold` systématique sur les titres.
- `text-primary` pour la couleur (bleu projet) sur les titres principaux ; la couleur de la teinte de fond (`text-teal-9`, `text-purple-9`…) pour les en-têtes de sous-cartes colorées.
- Icône **avant** le texte, avec `size="md"` (titres principaux) ou `size="sm"` (sous-titres) et `class="q-mr-sm"` / `q-mr-xs`.

```vue
<!-- ✅ Correct -->
<div class="text-h5 text-weight-bold text-primary flex items-center q-mb-md">
  <q-icon name="cloud" size="md" class="q-mr-sm" />
  Titre du bloc
</div>

<!-- ❌ Interdit — titre sans icône, sans bold, sans couleur -->
<div class="text-h5">Titre</div>
```

---

## 3. Couleurs de statut

Palette de teintes légères (fond) + teintes foncées (texte) :

| Statut               | Fond                      | Texte           | Usage                 |
| -------------------- | ------------------------- | --------------- | --------------------- |
| Favorable / VFR      | `bg-green-1`              | `text-green-9`  | Conditions bonnes     |
| Marginal             | `bg-orange-1`             | `text-orange-9` | Dégradé, attention    |
| Défavorable / Alerte | `bg-red-1`                | `text-red-9`    | Condition critique    |
| Neutre               | `bg-grey-1` / `bg-grey-2` | `text-grey-7`   | Conteneur neutre      |
| Info                 | `bg-blue-1`               | `text-blue-9`   | Encart informatif     |
| Synthèse METAR       | `bg-teal-1`               | `text-teal-9`   | Bloc résumé météo     |
| Synthèse TAF         | `bg-purple-1`             | `text-purple-9` | Bloc résumé prévision |

- `q-badge` et `q-chip` : `color="positive/warning/negative/primary"` + `text-color="white"`.
- **Jamais de couleur hardcodée** en `style="color: #..."` ou `style="background: #..."`. Utiliser les classes Quasar ou les variables CSS (`var(--q-color-positive)` pour une bordure).

**Chip ou badge ?**

- `q-chip` : indicateur de **statut autonome** porté à l'œil (icône + libellé), éventuellement cliquable. Ex : pastille Go/No-Go (toolbar + bloc), catégorie de vol d'un aérodrome (`VFR`/`IFR`…), confiance IA. Pas de `style` inline pour le padding — `dense` suffit pour la version compacte.
- `q-badge` : **compteur ou micro-étiquette** dense, accolé à un autre élément (ex : niveau d'un critère dans une grille, pastille de notification). `rounded` pour la forme pilule.

**Confiance IA (probabilité) :** toujours un `q-chip` coloré selon le niveau via `confidenceColor()` (`src/utils/confidenceHelpers.js`) — **≥80 `positive`, 50-79 `warning`, <50 `negative`**. Format `X%` (sans icône), en `dense` pour les sous-éléments comme les scénarios alternatifs. Ne jamais représenter une confiance par un badge bleu uni (ne communique pas la qualité).

**Exception documentée :** les tooltips ECharts (WindRose, WindHistory, PressureChart, TempHumidityChart) construisent du HTML en chaîne et utilisent des couleurs hex inline pour les puces `●`. C'est imposé par l'API ECharts (pas de classes Quasar dans un tooltip rendu hors du DOM Vue) — toléré, à garder cohérent avec la palette.

```vue
<!-- ✅ Correct -->
<q-badge color="positive" label="VFR" text-color="white" rounded />
<div class="bg-green-1 text-green-9">...</div>

<!-- ❌ Interdit (hors tooltip ECharts) -->
<div style="background: #2ecc71; color: white">...</div>
```

---

## 4. Espacements

Classes Quasar exclusivement — jamais de valeurs custom en `style`.

| Contexte                | Classe    |
| ----------------------- | --------- |
| Entre sections majeures | `q-mb-lg` |
| Standard                | `q-mb-md` |
| Compact                 | `q-mb-sm` |
| Minimal                 | `q-mb-xs` |
| Padding card standard   | `q-pa-md` |
| Padding card compact    | `q-pa-sm` |

- `gap:` en CSS scoped toléré dans des grilles internes (`criteria-grid`) non couvertes par Quasar.
- `style="min-height: …"` toléré pour aligner des cartes de même rangée (pattern établi : cartes conditions/prévisions à `min-height: 70px`).

---

## 5. Badges et chips

```vue
<q-badge color="positive" label="VFR" text-color="white" rounded />
<q-chip dense size="sm" color="primary" text-color="white">Contenu</q-chip>
```

- `rounded` systématique sur les badges de statut.
- Taille par défaut sauf besoin justifié (`size="sm"` pour chips denses).

---

## 6. Grilles responsives

```vue
<div class="row q-col-gutter-md">
  <div class="col-12 col-sm-6 col-md-4 col-xl-3">
    <q-card flat bordered>...</q-card>
  </div>
</div>
```

- Breakpoints : `col-12` (mobile) → `col-sm-*` → `col-md-*` → `col-xl-*`.
- `q-col-gutter-md` par défaut, `q-col-gutter-sm` pour les grilles denses.

---

## 7. Éléments interactifs dans la toolbar

La toolbar a un fond `bg-accent` (orange ambre `#ff9800`). Les indicateurs colorés doivent avoir un **fond propre contrasté + texte blanc explicite** — ne jamais s'appuyer sur `color=` Quasar seul, qui colore le contenu sans fond et devient invisible sur fond orange.

```vue
<!-- ✅ Correct — fond coloré foncé + texte blanc -->
<div class="go-no-go-toolbar-chip" :class="`go-no-go-${status}`">
  <q-icon name="check_circle" size="16px" /> GO
</div>
<!-- CSS : .go-no-go-good { background:#2e7d32; color:#fff } etc. -->

<!-- ❌ Interdit — color Quasar seul sur fond accent -->
<q-btn color="positive" label="GO" />
```

---

## 8. À ne jamais faire

| Interdit                                                              | Raison                        | Alternative                          |
| --------------------------------------------------------------------- | ----------------------------- | ------------------------------------ |
| `<q-separator>` décoratif sous un titre                               | Bruit visuel                  | Espacement + titre suffisent         |
| `style="color: #…"` / `style="background: #…"` (hors tooltip ECharts) | Hors palette, non maintenable | Classes `bg-*-1`, `text-*-9`         |
| `q-card` sans `flat bordered`                                         | Élévation incohérente         | `flat bordered` par défaut           |
| `bg-white text-black` forcé sur une card                              | Ne suit pas le thème          | Laisser le thème, ou teinte `bg-*-1` |
| Titre sans `text-weight-bold`                                         | Visuel affaibli               | Toujours bold                        |
| Icône de titre sans `q-mr-sm`/`q-mr-xs`                               | Colle au texte                | Toujours une marge droite            |
| Padding custom (`style="padding:…"`)                                  | Hors système                  | `q-pa-sm`, `q-pa-md`                 |
| `color="warning"` seul sur fond accent                                | Invisible                     | Pastille fond foncé + texte blanc    |
