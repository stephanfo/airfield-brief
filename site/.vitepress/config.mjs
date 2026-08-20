import { defineConfig } from 'vitepress'

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

export default defineConfig({
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
      copyright: `© ${new Date().getFullYear()} Stephanfo`,
    },
  },
})
