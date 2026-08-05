import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

// Déterminisme des dates : on fige le fuseau sur UTC pour que les rendus locaux
// (toLocaleString) soient stables quelle que soit la machine. Les assertions de
// formatage fr-FR supposent un Node full-ICU (cas par défaut pour les versions
// déclarées dans package.json#engines ; garanti en CI, cf. .github/workflows/ci.yml).
process.env.TZ = 'UTC'

// Config Vitest pour les tests unitaires (TECH-001).
// Setup volontairement manuel (pas l'app-extension Quasar) pour limiter les
// dépendances et garder le contrôle du mock de `quasar`. Voir ADR-021.
export default defineConfig({
  plugins: [vue()],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./tests/setup.js'],
    include: ['tests/**/*.spec.js'],
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage',
      include: ['src/utils/**', 'src/composables/**', 'src/stores/**'],
      exclude: ['src/utils/logger.js'],
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // Alias Quasar utilisés par le routeur et les layouts (`pages/…`, `layouts/…`)
      pages: fileURLToPath(new URL('./src/pages', import.meta.url)),
      layouts: fileURLToPath(new URL('./src/layouts', import.meta.url)),
      components: fileURLToPath(new URL('./src/components', import.meta.url)),
    },
  },
})
