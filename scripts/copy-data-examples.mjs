#!/usr/bin/env node
/**
 * Installe les données d'exemple pour un développement sans backend.
 *
 *   npm run data:example
 *
 * L'application lit `public/data/*.json`, normalement produits par le pipeline
 * (N8N / scripts PHP) et gitignorés. Après un clone, ce dossier est donc vide et
 * toutes les pages sont en erreur. Ce script y copie les exemples versionnés.
 *
 * Les fichiers déjà présents ne sont JAMAIS écrasés : lancer la commande sur une
 * installation qui reçoit de vraies données ne casse rien. Utiliser `--force`
 * pour repartir des exemples.
 */
import { readdirSync, copyFileSync, mkdirSync, existsSync, statSync } from 'node:fs'
import { join } from 'node:path'

const EXAMPLES = 'public/data/examples'
const TARGET = 'public/data'
const force = process.argv.includes('--force')

if (!existsSync(EXAMPLES)) {
  console.error(`❌ ${EXAMPLES} introuvable — lancez la commande depuis la racine du projet.`)
  process.exit(1)
}

let copied = 0
let skipped = 0

/** Copie un répertoire d'exemples vers sa destination, sans écraser par défaut. */
function copyDir(from, to) {
  mkdirSync(to, { recursive: true })
  for (const entry of readdirSync(from)) {
    const src = join(from, entry)
    const dest = join(to, entry)
    if (statSync(src).isDirectory()) {
      copyDir(src, dest)
      continue
    }
    if (existsSync(dest) && !force) {
      skipped++
      continue
    }
    copyFileSync(src, dest)
    copied++
  }
}

// `examples/` est un sous-dossier de `public/data/` : la copie part du contenu
// des exemples vers la racine, sans jamais se réintroduire elle-même.
copyDir(EXAMPLES, TARGET)

console.log(`✅ ${copied} fichier(s) d'exemple installé(s) dans ${TARGET}/`)
if (skipped > 0) {
  console.log(`↩️  ${skipped} fichier(s) déjà présent(s), conservé(s) — « --force » pour écraser.`)
}
console.log('\nLancez maintenant : npm run dev')
