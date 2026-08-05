// Configuration for your app
// https://v2.quasar.dev/quasar-cli-vite/quasar-config-file

import { defineConfig } from '#q-app/wrappers'
import dotenv from 'dotenv'
// Identité du club/aérodrome — source unique pour forker le projet (ADR-030).
// Import possible ici parce que club.config.js est un module ESM pur (aucune dépendance).
import { CLUB_CONFIG } from './src/config/club.config.js'

// Charger les variables d'environnement depuis le fichier .env
dotenv.config()

export default defineConfig((/* ctx */) => {
  return {
    eslint: {
      warnings: true,
      errors: true,
    },

    // https://v2.quasar.dev/quasar-cli-vite/quasar-config-file#property-htmlvariables
    htmlVariables: {
      productName: CLUB_CONFIG.app.name,
      productDescription: CLUB_CONFIG.app.description,
      // og:image doit être une URL ABSOLUE (les réseaux sociaux ne résolvent pas
      // les chemins relatifs). Sans APP_URL, on retombe sur un chemin relatif :
      // l'aperçu de partage n'aura pas d'image, mais rien d'autre n'est cassé.
      ogImageUrl: process.env.APP_URL
        ? `${process.env.APP_URL.replace(/\/$/, '')}/icons/icon-512x512.png`
        : 'icons/icon-512x512.png',
    },
    // https://v2.quasar.dev/quasar-cli-vite/prefetch-feature
    // preFetch: true,

    // app boot file (/src/boot)
    // --> boot files are part of "main.js"
    // https://v2.quasar.dev/quasar-cli-vite/boot-files
    boot: ['pinia'],

    // https://v2.quasar.dev/quasar-cli-vite/quasar-config-file#css
    css: ['app.scss'],

    // https://github.com/quasarframework/quasar/tree/dev/extras
    extras: [
      // 'ionicons-v4',
      // 'mdi-v7',
      // 'fontawesome-v6',
      // 'eva-icons',
      // 'themify',
      // 'line-awesome',
      // 'roboto-font-latin-ext', // this or either 'roboto-font', NEVER both!

      'roboto-font', // optional, you are not bound to it
      'material-icons', // optional, you are not bound to it
    ],

    // Full list of options: https://v2.quasar.dev/quasar-cli-vite/quasar-config-file#build
    build: {
      target: {
        browser: ['es2022', 'firefox115', 'chrome115', 'safari14'],
        node: 'node20',
      },

      // URLs propres (/notam au lieu de /#/notam) — exige un fallback SPA côté
      // serveur : voir `deploy/.htaccess` (Apache/OVH) et docs/DEPLOYMENT.md.
      // Amende l'ADR-009.
      vueRouterMode: 'history', // available values: 'hash', 'history'
      // vueRouterBase,
      // vueDevtools,
      // vueOptionsAPI: false,

      // rebuildCache: true, // rebuilds Vite/linter/etc cache on startup

      // Chemin public de déploiement : `/` à la racine d'un domaine, `/sous-chemin/`
      // sinon. Piloté par `.env` (PUBLIC_PATH) pour que le même code se déploie
      // aux deux endroits. Quasar propage cette valeur à `viteConf.base` : ne PAS
      // la redéfinir dans `extendViteConf`, sous peine de builds incohérents.
      publicPath: process.env.PUBLIC_PATH || '/',
      // analyze: true,

      // La compression gzip est gérée automatiquement par le serveur (mod_deflate sur OVH)
      // Pas besoin de pré-compresser les fichiers côté build.
      vitePlugins: [
        [
          'vite-plugin-checker',
          {
            eslint: {
              lintCommand: 'eslint -c ./eslint.config.js "./src*/**/*.{js,mjs,cjs,vue}"',
              useFlatConfig: true,
            },
          },
          { server: false },
        ],
      ],

      env: {
        BUILD_DATE: new Date().toISOString(),
        // Identité produit relayée au service worker (titre par défaut des notifications) :
        // le SW n'a accès ni aux stores ni aux imports applicatifs (ADR-030).
        APP_NAME: CLUB_CONFIG.app.name,
        // Variables Firebase pour les notifications push
        FIREBASE_API_KEY: process.env.FIREBASE_API_KEY || '',
        FIREBASE_AUTH_DOMAIN: process.env.FIREBASE_AUTH_DOMAIN || '',
        FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || '',
        FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET || '',
        FIREBASE_MESSAGING_SENDER_ID: process.env.FIREBASE_MESSAGING_SENDER_ID || '',
        FIREBASE_APP_ID: process.env.FIREBASE_APP_ID || '',
        FIREBASE_VAPID_KEY: process.env.FIREBASE_VAPID_KEY || '',
        // Soumission de REX (FEAT-033) — endpoint du service web rex-submit.
        // Injectées au build (PWA compilée) ; l'URL reste hors du dépôt public.
        REX_SUBMIT_URL: process.env.REX_SUBMIT_URL || '',
        REX_SUBMIT_TOKEN: process.env.REX_SUBMIT_TOKEN || '',
      },
      // rawDefine: {}
      // ignorePublicFolder: true,
      // minify: false,
      // polyfillModulePreload: true,
      // distDir

      // viteVuePluginOptions: {},
    },

    // Full list of options: https://v2.quasar.dev/quasar-cli-vite/quasar-config-file#devserver
    devServer: {
      // https: true,
      open: true, // opens browser window automatically
    },

    // https://v2.quasar.dev/quasar-cli-vite/quasar-config-file#framework
    framework: {
      config: {},

      // iconSet: 'material-icons', // Quasar icon set
      // lang: 'en-US', // Quasar language pack

      // For special cases outside of where the auto-import strategy can have an impact
      // (like functional components as one of the examples),
      // you can manually specify Quasar components/directives to be available everywhere:
      //
      // components: [],
      // directives: [],

      // Quasar plugins
      plugins: ['Notify', 'Dialog'],
    },

    // animations: 'all', // --- includes all animations
    // https://v2.quasar.dev/options/animations
    animations: [],

    // https://v2.quasar.dev/quasar-cli-vite/quasar-config-file#sourcefiles
    // sourceFiles: {
    //   rootComponent: 'src/App.vue',
    //   router: 'src/router/index',
    //   store: 'src/store/index',
    //   pwaRegisterServiceWorker: 'src-pwa/register-service-worker',
    //   pwaServiceWorker: 'src-pwa/custom-service-worker',
    //   pwaManifestFile: 'src-pwa/manifest.json',
    // },

    // https://v2.quasar.dev/quasar-cli-vite/developing-pwa/configuring-pwa
    pwa: {
      workboxMode: 'InjectManifest',
      injectPwaMetaTags: true,
      swFilename: 'sw.js',
      manifestFilename: 'manifest.json',
      useCredentialsForManifestTag: false,
      metaVariables: {
        appleTouchIcon120: 'icons/apple-icon-120x120.png',
        appleTouchIcon152: 'icons/apple-icon-152x152.png',
        appleTouchIcon167: 'icons/apple-icon-167x167.png',
        appleTouchIcon180: 'icons/apple-icon-180x180.png',
        appleSafariPinnedTab: 'icons/safari-pinned-tab.svg',
        msapplicationTileColor: '#ff9800',
        themeColor: '#ff9800',
        appleMobileWebAppCapable: 'yes',
        appleMobileWebAppStatusBarStyle: 'black-translucent',
        appleMobileWebAppTitle: CLUB_CONFIG.app.name,
      },
      extendInjectManifestOptions(cfg) {
        // Ne pas pré-cacher les JSON dynamiques (données météo, NOTAM...)
        // qui sont générés côté backend et changent fréquemment.
        // Ils sont gérés par la stratégie StaleWhileRevalidate dans le SW.
        cfg.globIgnores = (cfg.globIgnores || []).concat(['**/data/*.json'])
      },
      extendManifestJson(json) {
        // Identité du club injectée au build (ADR-030) : src-pwa/manifest.json reste
        // un squelette neutre (icônes, couleurs), le nom vient de club.config.js.
        json.name = CLUB_CONFIG.app.name
        json.short_name = CLUB_CONFIG.app.shortName
        json.description = CLUB_CONFIG.app.description
        // Ajouter les permissions pour les notifications
        json.gcm_sender_id = process.env.FIREBASE_MESSAGING_SENDER_ID || '000000000000'
      },
    },
  }
})
