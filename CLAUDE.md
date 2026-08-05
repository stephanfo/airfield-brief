# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**Airfield Brief** — a PWA giving VFR private pilots a pre-flight briefing (weather, NOTAMs, AZBA zone status, charts, local weather station). Deployed for Ancenis aerodrome (LFFI), but **designed to be forked by any aerodrome**: the club's identity lives in a single config file (see below). Vue 3 + Quasar + Pinia frontend; data is served as **static JSON files** in `public/data/` generated externally by an N8N workflow (no app backend). Push notifications use Firebase Cloud Messaging. Licensed AGPL-3.0.

`public/data/*.json` is **gitignored** (pipeline output, not code): run `npm run data:example` after cloning to work without a backend.

The codebase, docs, comments, and commit messages are in **French** — match this when writing user-facing strings, comments, and commits.

## Documentation (read before coding)

This repo has unusually deep docs in `docs/`. Treat them as the source of truth and consult them rather than re-deriving:

- **[docs/ai/AGENT_GUIDE.md](docs/ai/AGENT_GUIDE.md)** — the single technical guide for working here: enforced rules, data-flow/cache contracts, store/page/composable patterns, the NOTAM and weather-station domains, aviation vocabulary, common pitfalls. Read this when CLAUDE.md isn't enough.
- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** — full technical architecture, store APIs, JSON schemas.
- **[docs/DECISIONS.md](docs/DECISIONS.md)** — the ADRs explaining _why_ (Quasar, Pinia, Leaflet, localStorage policy, ECharts, etc.). Check for a relevant ADR before changing an architectural choice; add an ADR when you make one.
- **[docs/ROADMAP.md](docs/ROADMAP.md)** — the directions the project is taking, and what is explicitly out of scope. Task-level tracking lives in GitHub issues; check both before building a feature.
- **[docs/NOTIFICATIONS.md](docs/NOTIFICATIONS.md)** / **[docs/LOGGING_STRATEGY.md](docs/LOGGING_STRATEGY.md)** — FCM setup, logging policy.

## Commands

```bash
npm run dev        # quasar dev → http://localhost:9000 (hot reload)
npm run lint       # ESLint 9 (flat config, eslint.config.js)
npm run format     # Prettier auto-fix
npm run build      # quasar build (SPA)
npm test           # Vitest (run once) — tests/unit/**
npm run test:watch # Vitest mode watch
npm run test:cov   # Vitest + couverture v8

quasar build -m pwa                  # PWA build (mode de déploiement)
```

**Unit tests run on Vitest** (`npm test` / `npm run test:watch` / `npm run test:cov` — config in `vitest.config.js`, setup in `tests/setup.js`, specs in `tests/unit/`). Coverage so far (TECH-001, ADR-022): pure utils, the config layer (`features`/`storageKeys`), the `useCache`/`useDataFetcher`/`useLocalStorageSet` composables, and most stores. **Components (`.vue`) are not tested yet.** Always run `npm test` after touching covered code; still verify UI/behaviour via `npm run dev` + manual checks and `npm run lint`. Don't claim tests pass without running them.

## Architecture (the parts that span files)

**Data flow:** Page → Pinia store → `useDataFetcher` (composable) → `useCache` → `fetch('./data/*.json')`. Stores never `fetch()` directly; pages never `fetch()` at all.

- **`src/config/club.config.js`** holds the **entire club/airfield identity** (product name, ICAO, coordinates, runway, webcam URLs, notification topics, AZBA priority zones, feature flags, storage prefix) — ADR-030. It is a **pure ESM module** (no imports), so `quasar.config.js` can read it at build time too. **Never hardcode an identity value** (ICAO, coordinates, club name, URL) anywhere else.
- **`src/config/features.js`** — `isFeatureEnabled(name)` gates optional modules (`webcam`, `station`, `thermal`, `rex`, `aircraft`, `notifications`). Routes, menu entries and diagnostics entries carry a declarative `feature` property. A fork without a given service must not end up with a broken page.
- **`src/config/storageKeys.js`** — the single registry of `localStorage` keys, all prefixed by the club. **Never write a literal key.**
- **`src/config/app.config.js`** is the single registry of endpoints. Each has a `url`, `refreshInterval` (client cache TTL), and `staleThreshold` (visual "stale" warning). Get config via `getEndpointConfig(name)` — it throws on unknown names. Also holds VFR coloring thresholds, and composes the club's AZBA/webcam values with technical settings.
- **`useDataFetcher`** wraps `useCache` with **stale-while-revalidate** (returns cache instantly, refreshes in background) and request **deduplication**. This is why a store exposes both `loading` and `isRefreshing`.
- **Weather station is split across coordinated stores** (recent refactor): `stationWindCurrentStore` (2-min cycle), `stationWindHistoryStore`, `stationAtmosphereStore`, orchestrated by `stationStore`. ECharts (via `vue-echarts`) renders the graphs.
- **TEMSI/WINTEM stores** are built from a `createChartStore` factory rather than hand-written.
- **NOTAMs** are the most complex domain: multi-criteria filtering (validity / VFR-IFR traffic / flight-level slider) in `notamStore` + `src/utils/notamHelpers.js`. User hide/seen state lives in `localStorage` via `useHiddenNotams`/`useSeenNotams`, keyed by NOTAM id with expiry; `NotamPage.vue` watches the JSON and calls `pruneStale()` to drop orphaned entries.

**`@/` alias maps to `src/`** (Quasar default).

## UI consistency (enforced — full reference in docs/UI_CHARTER.md)

Before adding or modifying any UI component, check **[docs/UI_CHARTER.md](docs/UI_CHARTER.md)**. The non-negotiable rules, short version:

- Cards: always `flat bordered` (no forced `bg-white`). `<q-separator>` only to split two genuinely distinct sub-blocks — **never as a decorative line under a title**.
- Section titles: `text-h5 text-weight-bold text-primary flex items-center` + icon with `q-mr-sm`.
- Status colors: `bg-green/orange/red-1` + `text-green/orange/red-9` for backgrounds; `color="positive/warning/negative"` + `text-color="white"` for badges. **No hardcoded `style="color:…"`**.
- Spacing: Quasar classes only (`q-mb-lg` between major sections, `q-pa-md` on cards). No custom values.
- Toolbar elements on `bg-accent` background: use an explicit dark background + white text — never rely on Quasar `color=` prop alone (becomes invisible on the orange toolbar).

## Conventions (enforced — see AGENT_GUIDE.md for the full list)

- **Composition API + `<script setup>` only.** No Options API, no `this`.
- Extract reactive store state with **`storeToRefs(store)`** — destructuring the store directly loses reactivity. Mutate state only through store actions.
- Every page uses **`useVisibilityRefresh()`** to auto-refresh when the tab regains focus.
- Use **Quasar components** (`q-card`, `q-btn`, …), not hand-rolled HTML/CSS.
- **`localStorage` is for UI preferences only** (hidden/seen NOTAMs, menu customization, VFR thresholds) — never business/aviation data.
- Logging: use **`logger`** from `src/utils/logger.js` in `src/` (conditional: all in dev, errors in prod). Raw `console` is only allowed in `src-pwa/`.
- Files: `PascalCase.vue` for components, `camelCase.js` for stores/composables/utils. One store = one business domain.
- Commits: `type(scope): description` (`feat`/`fix`/`docs`/`refactor`/…), in French.

## Firebase (separate working dir)

`../Airfield-Portal-Firebase/functions/` holds Cloud Functions (Node 24, `firebase-functions` v7) for FCM. It's a distinct npm project with its own lint/deploy:

```bash
npm --prefix ../Airfield-Portal-Firebase/functions run deploy   # firebase deploy --only functions
npm --prefix ../Airfield-Portal-Firebase/functions run logs
```
