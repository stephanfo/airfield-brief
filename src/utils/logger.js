/**
 * Utilitaire de logging conditionnel
 * En développement: tous les logs sont affichés
 * En production: seules les erreurs sont loggées
 */

const isDev = process.env.NODE_ENV === 'development'

export const logger = {
  /**
   * Log d'information (développement uniquement)
   */
  log: (...args) => {
    if (isDev) {
      console.log(...args)
    }
  },

  /**
   * Log d'avertissement (développement uniquement)
   */
  warn: (...args) => {
    if (isDev) {
      console.warn(...args)
    }
  },

  /**
   * Log d'erreur (toujours actif)
   */
  error: (...args) => {
    console.error(...args)
  },

  /**
   * Log de debug (développement uniquement)
   */
  debug: (...args) => {
    if (isDev) {
      console.debug(...args)
    }
  },

  /**
   * Groupe de logs (développement uniquement)
   */
  group: (...args) => {
    if (isDev) {
      console.group(...args)
    }
  },

  /**
   * Fin de groupe de logs (développement uniquement)
   */
  groupEnd: () => {
    if (isDev) {
      console.groupEnd()
    }
  },
}
