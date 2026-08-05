import { describe, it, expect } from 'vitest'
import { runwayLengthFor } from '@/utils/airfieldHelpers'
import { CLUB_CONFIG } from '@/config/club.config'

/**
 * La longueur de piste alimente le calcul de distances de décollage et
 * d'atterrissage : une valeur erronée est sécurité-critique. Le piège principal
 * est le format des QFU — `getActiveRunway` produit des chaînes sur deux
 * chiffres (« 07 »), qui doivent correspondre aux clés de `runwayLengths`.
 */
describe('runwayLengthFor', () => {
  const { runwayLengthM, runwayLengths } = CLUB_CONFIG.airfield

  it('retombe sur la longueur nominale sans QFU', () => {
    expect(runwayLengthFor(null)).toBe(runwayLengthM)
    expect(runwayLengthFor(undefined)).toBe(runwayLengthM)
  })

  it('retombe sur la longueur nominale pour un QFU non décrit', () => {
    expect(runwayLengthFor('99')).toBe(runwayLengthM)
  })

  it('les clés de runwayLengths sont au format QFU sur deux chiffres', () => {
    // « 7 » au lieu de « 07 » ne serait jamais trouvé par getActiveRunway :
    // la longueur spécifique au seuil serait silencieusement ignorée.
    for (const qfu of Object.keys(runwayLengths ?? {})) {
      expect(qfu).toMatch(/^\d{2}$/)
    }
  })

  it('renvoie la longueur propre à chaque QFU décrit', () => {
    for (const [qfu, length] of Object.entries(runwayLengths ?? {})) {
      expect(runwayLengthFor(qfu)).toBe(length)
    }
  })
})
