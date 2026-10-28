import { defineConfig } from 'vitepress'
import { writeFileSync } from 'node:fs'
import { dirname as pathDirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const dirname = pathDirname(fileURLToPath(import.meta.url))

// Le site est déployable soit à la racine d'un domaine personnalisé (défaut),
// soit dans un sous-chemin GitHub Pages (stephanfo.github.io/airfield-brief/).
// Même logique que quasar.config.js pour l'application (PUBLIC_PATH).
const base = process.env.SITE_BASE || '/'
// URL absolue du site, nécessaire pour og:image : les messageries et réseaux sociaux
// ne résolvent pas les chemins relatifs. Suit le mode de déploiement choisi.
const siteUrl = (
  process.env.SITE_URL ||
  (base === '/' ? 'https://airfield-brief.ratelet.fr' : 'https://stephanfo.github.io')
).replace(/\/$/, '')

// Lien vers un fichier du dépôt (racine hors srcDir : README, CONTRIBUTING, LICENSE).
const repo = 'https://github.com/stephanfo/airfield-brief'
const ghBlob = (p) => `${repo}/blob/main/${p}`

// L'auteur, tel que le décrit son site personnel : les moteurs relient ainsi ce projet à la
// même personne que les autres (même @id dans chaque JSON-LD).
const auteur = 'https://stephane.ratelet.fr/'

// Fiche du logiciel pour les moteurs de recherche, sur la page d'accueil seulement.
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Airfield Brief',
  description:
    'Briefing pré-vol VFR d’un aérodrome sur un seul écran : météo, NOTAM, AZBA, masse et centrage.',
  url: `${siteUrl}${base}`,
  sameAs: repo,
  image: `${siteUrl}${base}og-image.png`,
  applicationCategory: 'UtilitiesApplication',
  operatingSystem: 'Web',
  isAccessibleForFree: true,
  license: 'https://www.gnu.org/licenses/agpl-3.0.html',
  author: { '@type': 'Person', '@id': `${auteur}#me`, name: 'Stéphane Ratelet', url: auteur },
}

export default defineConfig({
  // Le site est un projet npm distinct de l'application. Sans ces deux réglages,
  // Vite remonte l'arborescence et hérite de la configuration de l'app Quasar
  // (postcss.config.js, jsconfig.json), dont les dépendances ne sont pas
  // installées ici : le build échoue sur un dépôt fraîchement cloné.
  vite: {
    css: { postcss: {} },
    esbuild: { tsconfigRaw: {} },
    // srcDir pointant sur ../docs, VitePress chercherait les fichiers statiques
    // dans docs/public/. Les assets du site vivent avec le site, pas avec la doc.
    publicDir: resolve(dirname, '../public'),
    // Les pages vivent dans ../docs, hors de ce projet npm : sans cela, Vite y
    // cherche vue/ et ses dépendances et ne les trouve pas sur un dépôt cloné.
    resolve: {
      alias: {
        vue: resolve(dirname, '../node_modules/vue'),
        'vue/server-renderer': resolve(dirname, '../node_modules/vue/server-renderer'),
      },
    },
  },

  lang: 'fr-FR',
  title: 'Airfield Brief',
  description:
    "Briefing pré-vol VFR pour aérodrome : météo, NOTAM, AZBA, masse et centrage. Application libre, conçue pour être reprise par n'importe quel aéroclub.",
  base,
  srcDir: '../docs',
  srcExclude: ['TODO.md', 'PLAN_OPEN_SOURCE.md', 'INDEX.md'],
  cleanUrls: true,
  rewrites: { 'accueil.md': 'index.md' },
  lastUpdated: true,
  ignoreDeadLinks: false,

  head: [
    ['link', { rel: 'icon', href: `${base}favicon.png`, type: 'image/png' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:site_name', content: 'Airfield Brief' }],
    ['meta', { property: 'og:image', content: `${siteUrl}${base}og-image.png` }],
    ['meta', { property: 'og:locale', content: 'fr_FR' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
  ],

  sitemap: { hostname: `${siteUrl}${base}` },

  // Adresse canonique et aperçu de partage propres à chaque page (sans cela, toutes les pages
  // partagent le titre et l'image du site, sans og:url ni og:title).
  transformHead: ({ pageData, title, description }) => {
    const chemin = pageData.relativePath.replace(/(^|\/)index\.md$/, '$1').replace(/\.md$/, '')
    const url = `${siteUrl}${base}${chemin}`
    const tetes = [
      ['link', { rel: 'canonical', href: url }],
      ['meta', { property: 'og:url', content: url }],
      ['meta', { property: 'og:title', content: title }],
      ['meta', { property: 'og:description', content: description }],
    ]
    if (pageData.relativePath === 'index.md') {
      tetes.push(['script', { type: 'application/ld+json' }, JSON.stringify(jsonLd)])
    }
    return tetes
  },

  // robots.txt annonce le sitemap ; écrit ici pour suivre `siteUrl` et `base`.
  buildEnd: ({ outDir }) => {
    writeFileSync(
      join(outDir, 'robots.txt'),
      `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}${base}sitemap.xml\n`,
    )
  },

  themeConfig: {
    outline: { level: [2, 3], label: 'Sur cette page' },
    search: { provider: 'local' },

    nav: [
      { text: 'Découvrir', link: '/' },
      { text: 'Installer', link: '/demarrage' },
      { text: 'Comprendre', link: '/ARCHITECTURE' },
      { text: 'Démo', link: 'https://brief.aeroclub-ancenis.fr' },
    ],

    sidebar: [
      {
        text: 'Découvrir',
        items: [
          { text: 'Présentation', link: '/' },
          { text: 'Le pipeline de données', link: '/DATA_PIPELINE' },
          { text: 'Feuille de route', link: '/ROADMAP' },
        ],
      },
      {
        text: 'Installer chez soi',
        items: [
          { text: 'Démarrage', link: '/demarrage' },
          { text: 'Déploiement', link: '/DEPLOYMENT' },
          { text: 'Notifications push', link: '/NOTIFICATIONS' },
        ],
      },
      {
        text: 'Comprendre',
        items: [
          { text: 'Architecture', link: '/ARCHITECTURE' },
          { text: 'Décisions (ADR)', link: '/DECISIONS' },
          { text: 'Besoin produit', link: '/PRD' },
        ],
      },
      {
        text: 'Contribuer',
        items: [
          { text: 'Charte UI', link: '/UI_CHARTER' },
          { text: 'Stratégie de logging', link: '/LOGGING_STRATEGY' },
          { text: 'Guide agents IA', link: '/ai/AGENT_GUIDE' },
          { text: 'Contribuer au projet ↗', link: ghBlob('CONTRIBUTING.md') },
        ],
      },
    ],

    socialLinks: [{ icon: 'github', link: repo }],

    editLink: {
      pattern: `${repo}/edit/main/docs/:path`,
      text: 'Proposer une correction',
    },

    docFooter: { prev: 'Précédent', next: 'Suivant' },
    lastUpdatedText: 'Dernière mise à jour',
    darkModeSwitchLabel: 'Apparence',
    lightModeSwitchTitle: 'Passer au thème clair',
    darkModeSwitchTitle: 'Passer au thème sombre',
    returnToTopLabel: 'Haut de page',
    sidebarMenuLabel: 'Menu',
    langMenuLabel: 'Langue',

    footer: {
      message:
        'Sous licence AGPL-3.0. Aide à la préparation du vol — ne remplace pas le briefing officiel.',
      copyright: `© ${new Date().getFullYear()} <a href="${auteur}">Stéphane Ratelet</a>`,
    },
  },
})
