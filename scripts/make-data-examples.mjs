#!/usr/bin/env node
/**
 * Génère `public/data/examples/` à partir des vraies données locales.
 *
 *   node scripts/make-data-examples.mjs
 *
 * Les JSON de `public/data/` sont produits par le pipeline et gitignorés : le
 * dépôt public a besoin d'**exemples** pour qu'on puisse lancer l'application
 * sans backend (`npm run data:example`). Ce script les fabrique en réduisant
 * les vraies données (quelques entrées par liste) et en neutralisant ce qui est
 * propre à un club ou à un tiers.
 *
 * ⚠️ À relancer quand le format d'un endpoint change, puis **relire le résultat**
 * avant de commiter : c'est le seul garde-fou contre une fuite de donnée.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const DATA = 'public/data'
const OUT = join(DATA, 'examples')

/** Ne conserve que les `n` premiers éléments des tableaux listés. */
function truncate(obj, paths, n = 3) {
  for (const path of paths) {
    const parts = path.split('.')
    let node = obj
    for (const p of parts.slice(0, -1)) node = node?.[p]
    const last = parts.at(-1)
    if (Array.isArray(node?.[last])) node[last] = node[last].slice(0, n)
  }
  return obj
}

const read = (name) => JSON.parse(readFileSync(join(DATA, `${name}.json`), 'utf8'))

/**
 * Les liens TEMSI/WINTEM portent un paramètre `login=` : un jeton d'accès
 * Météo-France propre à l'abonnement du club. Même expiré, il n'a rien à faire
 * dans un dépôt public — on le remplace par un marqueur explicite.
 */
function scrubChartLinks(obj, listKey) {
  for (const item of obj[listKey] ?? []) {
    if (typeof item.link === 'string') {
      item.link = item.link.replace(/login=[^&]*/, 'login=JETON_METEO_FRANCE_A_RENSEIGNER')
    }
  }
  return obj
}

/**
 * Recette par endpoint : `[nom, transformation]`. La transformation reçoit le
 * JSON réel et renvoie l'exemple à écrire.
 */
const RECIPES = [
  ['weather', (d) => d],
  [
    'aircrafts',
    (d) => {
      // Les fiches d'avions sont propres à chaque club (immatriculations, coûts
      // horaires, masses réelles) : l'index d'exemple ne référence que l'appareil
      // fictif de `examples/aircrafts/`. Les abaques de `defaultPerformance`
      // viennent d'un manuel de vol public : elles sont conservées telles quelles.
      d.aircraft = [{ registration: 'F-XXXX', source: './data/aircrafts/F-XXXX.aircraft' }]
      return d
    },
  ],
  ['azba', (d) => truncate(d, ['zones'])],
  ['temsi', (d) => scrubChartLinks(truncate(d, ['temsiList'], 2), 'temsiList')],
  ['wintem', (d) => scrubChartLinks(truncate(d, ['wintemList'], 2), 'wintemList')],
  ['vac', (d) => truncate(d, ['vacs'], 5)],
  ['wind_current', (d) => d],
  // La rose des vents (`wind_rose`) est conservée entière : agrégée et légère,
  // la tronquer produirait une rose partielle visuellement fausse.
  ['wind_history', (d) => truncate(d, ['24h_history'], 24)],
  ['atmosphere', (d) => truncate(d, ['atmosphere'], 24)],
  ['ephemeris', (d) => truncate(d, ['days'], 3)],
  ['thermal_forecast', (d) => truncate(d, ['days'], 2)],
  [
    'notam',
    (d) => {
      // Structure réelle : `notamList.listnotams.AD` est une liste de NOTAMs ;
      // `notamList.listnotams.FIR` est un objet { catégorie → liste }. On borne
      // chaque liste rencontrée, quel que soit son niveau.
      const listnotams = d.notamList?.listnotams ?? {}
      for (const [key, value] of Object.entries(listnotams)) {
        if (Array.isArray(value)) {
          listnotams[key] = value.slice(0, 3)
        } else if (value && typeof value === 'object') {
          for (const [category, list] of Object.entries(value)) {
            if (Array.isArray(list)) value[category] = list.slice(0, 2)
          }
        }
      }
      return d
    },
  ],
  [
    'rex',
    (d) => {
      // REX FFA = données de tiers : on ne republie ni le corpus ni les récits.
      // L'exemple garde la FORME (assez pour que la page s'affiche) avec un
      // contenu entièrement inventé.
      truncate(d, ['summaries'], 1)
      d.rex = [
        {
          id: '1',
          title: 'Exemple de REX (contenu fictif)',
          description:
            'Cet enregistrement est un EXEMPLE destiné au développement local. Il ne provient pas de la base REX de la FFA.',
          eventSummary: 'Résumé fictif de l’évènement.',
          type: 'Anomalie',
          subject: 'Dans / Autour d’un avion',
          place: 'LFXX',
          eventDate: '2026-01-15',
          flightKind: 'Local',
          flightRegime: 'VFR Jour',
          eventKind: 'Incident',
          aircraftType: 'ROBIN - 2+2 (DR-400)',
          eventType: 'RE: Exemple',
          initialRisk: { severity: 2, probability: 2 },
          fromClub: true,
          causes: [{ type: 'Cause Principale', title: 'Cause fictive', description: 'Exemple.' }],
          actions: [{ description: 'Action corrective fictive.' }],
          safetyEducation: 'Enseignement fictif à des fins de démonstration.',
        },
      ]
      // Les synthèses sont générées par LLM à partir des REX réels : elles
      // citent des évènements de tiers. On remplace INTÉGRALEMENT leur texte,
      // aussi bien dans `summaries[]` que dans la synthèse courante `summary`
      // (deux emplacements distincts — ne pas en oublier un).
      const fictionalText =
        '## Synthèse d’exemple\n\n' +
        'Contenu **fictif** servant uniquement au développement local. ' +
        'Les vraies synthèses sont générées à partir de la base REX de la FFA ' +
        'et ne sont pas redistribuées avec ce dépôt.\n\n' +
        '- {1} Exemple de citation cliquable renvoyant vers le REX d’exemple.'
      // `citedRexIds` référence de vrais identifiants REX, et `model` révèle la
      // chaîne de génération : on les remplace aussi.
      const sanitizeSummary = (s) => ({
        ...s,
        text: fictionalText,
        summary: undefined,
        citedRexIds: ['1'],
        model: 'exemple',
      })
      if (Array.isArray(d.summaries)) d.summaries = d.summaries.map(sanitizeSummary)
      if (d.summary && typeof d.summary === 'object') d.summary = sanitizeSummary(d.summary)
      return d
    },
  ],
]

mkdirSync(OUT, { recursive: true })
let written = 0
for (const [name, transform] of RECIPES) {
  const src = join(DATA, `${name}.json`)
  if (!existsSync(src)) {
    console.warn(`⏭  ${name}.json absent — ignoré`)
    continue
  }
  const example = transform(read(name))
  writeFileSync(join(OUT, `${name}.json`), JSON.stringify(example, null, 2) + '\n')
  written++
}
console.log(`✅ ${written} exemples écrits dans ${OUT}`)
console.log('⚠️  Relisez-les avant de commiter (aucune donnée personnelle ni tierce).')
