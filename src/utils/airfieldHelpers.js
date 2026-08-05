/**
 * Caractéristiques du terrain de rattachement.
 *
 * Ces valeurs viennent directement de `club.config.js` (ADR-030) : ce sont des
 * constantes de configuration, pas des données du pipeline. Elles étaient
 * auparavant servies par un `airfieldStore` lisant `airfield.json` — couche
 * supprimée le 05/08/2026, la quasi-totalité du fichier n'étant qu'une copie de
 * la config (voir l'amendement de l'ADR-030).
 */
import { CLUB_CONFIG } from '../config/club.config'

const { airfield } = CLUB_CONFIG

/**
 * Longueur de piste utilisable pour un QFU donné.
 *
 * Un seuil peut offrir une distance différente de l'autre (TODA/LDA propres à
 * chaque sens). Retombe sur la longueur nominale si le QFU n'est pas décrit.
 *
 * @param {string|null|undefined} qfu - QFU sur deux chiffres, ex. `'07'` ou `'25'`
 * @returns {number} Longueur en mètres
 */
export function runwayLengthFor(qfu) {
  const byDirection = airfield.runwayLengths ?? {}
  if (qfu != null && byDirection[qfu] != null) return byDirection[qfu]
  return airfield.runwayLengthM
}
