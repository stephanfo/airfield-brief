/**
 * Boot file pour initialiser Pinia (gestion d'état)
 *
 * Pinia est utilisé pour gérer l'état global de l'application :
 * - Cache des données API (NOTAM, météo, AZBA, etc.)
 * - Filtres et préférences utilisateur
 * - État de chargement et erreurs
 */
import { createPinia } from 'pinia'

export default ({ app }) => {
  const pinia = createPinia()
  app.use(pinia)
}
