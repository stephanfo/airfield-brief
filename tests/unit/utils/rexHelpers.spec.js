import { describe, it, expect } from 'vitest'
import {
  riskColor,
  riskLabel,
  typeColor,
  matchesTypeFilter,
  matchesSubjectFilter,
  matchesRegimeFilter,
  matchesFlightKindFilter,
  matchesEventKindFilter,
  isClubRelevant,
  isAtClubField,
  isDeclaredByClub,
  matchesSearchQuery,
  matchesAllFilters,
  distinctValues,
  parseSummaryMarkdown,
  splitCitationIds,
  formatSummaryForSharing,
  isMainCause,
  sortCausesMainFirst,
  formatSummaryPeriod,
  normalizePlace,
  normalizeAerodromeCodesInText,
} from '@/utils/rexHelpers'
import { CLUB_CONFIG } from '@/config/club.config'

// Terrain de rattachement configuré (ADR-030) : les helpers « club » s'y comparent,
// les assertions le dérivent au lieu de figer un code OACI.
const HOME = CLUB_CONFIG.airfield.icao

const baseRex = {
  id: '3076',
  title: 'Sortie de piste DR 400',
  description: 'Test description avec DR400',
  eventSummary: 'Résumé événement',
  type: 'Anomalie',
  subject: 'Dans / Autour d’un avion',
  place: HOME,
  flightKind: 'Local',
  flightRegime: 'VFR Jour',
  eventKind: 'Incident',
  aircraftType: 'ROBIN - 2+2 (DR-400)',
  eventType: 'RE: Sortie de piste',
  initialRisk: { severity: 4, probability: 3 },
  residualRisk: { severity: 3, probability: 2 },
}

describe('rexHelpers', () => {
  describe('riskColor', () => {
    it('renvoie grey si pas de risque évalué', () => {
      expect(riskColor(null)).toBe('grey')
      expect(riskColor({ severity: 0, probability: 3 })).toBe('grey')
    })

    it('renvoie negative pour un score élevé (>=15)', () => {
      expect(riskColor({ severity: 5, probability: 5 })).toBe('negative')
      expect(riskColor({ severity: 5, probability: 3 })).toBe('negative')
    })

    it('renvoie warning pour un score modéré (6-14)', () => {
      expect(riskColor({ severity: 3, probability: 3 })).toBe('warning')
    })

    it('renvoie positive pour un score faible (<6)', () => {
      expect(riskColor({ severity: 2, probability: 2 })).toBe('positive')
      expect(riskColor({ severity: 1, probability: 1 })).toBe('positive')
    })
  })

  describe('riskLabel', () => {
    it('reflète la couleur calculée', () => {
      expect(riskLabel(null)).toBe('Non évalué')
      expect(riskLabel({ severity: 5, probability: 5 })).toBe('Risque élevé')
      expect(riskLabel({ severity: 3, probability: 3 })).toBe('Risque modéré')
      expect(riskLabel({ severity: 1, probability: 1 })).toBe('Risque faible')
    })
  })

  describe('typeColor', () => {
    it('mappe Anomalie/Bonne pratique', () => {
      expect(typeColor('Anomalie')).toBe('negative')
      expect(typeColor('Bonne pratique')).toBe('positive')
      expect(typeColor('Autre chose')).toBe('grey')
    })
  })

  describe('causes', () => {
    it('isMainCause détecte la cause principale (insensible à la casse/espaces)', () => {
      expect(isMainCause({ type: 'Cause Principale' })).toBe(true)
      expect(isMainCause({ type: ' cause principale ' })).toBe(true)
      expect(isMainCause({ type: 'Facteur contributif' })).toBe(false)
      expect(isMainCause({})).toBe(false)
      expect(isMainCause(null)).toBe(false)
    })

    it('sortCausesMainFirst place les causes principales en tête sans muter la source', () => {
      const causes = [
        { type: 'Facteur contributif', title: 'A' },
        { type: 'Cause Principale', title: 'B' },
        { type: 'Facteur contributif', title: 'C' },
      ]
      const sorted = sortCausesMainFirst(causes)
      expect(sorted.map((c) => c.title)).toEqual(['B', 'A', 'C'])
      // source inchangée
      expect(causes[0].title).toBe('A')
    })

    it('sortCausesMainFirst tolère une liste vide/absente', () => {
      expect(sortCausesMainFirst(undefined)).toEqual([])
      expect(sortCausesMainFirst([])).toEqual([])
    })
  })

  describe('filtres par champ', () => {
    it('matchesTypeFilter', () => {
      expect(matchesTypeFilter(baseRex, 'all')).toBe(true)
      expect(matchesTypeFilter(baseRex, 'Anomalie')).toBe(true)
      expect(matchesTypeFilter(baseRex, 'Bonne pratique')).toBe(false)
    })

    it('matchesSubjectFilter', () => {
      expect(matchesSubjectFilter(baseRex, 'all')).toBe(true)
      expect(matchesSubjectFilter(baseRex, baseRex.subject)).toBe(true)
      expect(matchesSubjectFilter(baseRex, 'Autre')).toBe(false)
    })

    it('matchesRegimeFilter', () => {
      expect(matchesRegimeFilter(baseRex, 'all')).toBe(true)
      expect(matchesRegimeFilter(baseRex, 'VFR Jour')).toBe(true)
      expect(matchesRegimeFilter(baseRex, 'IFR Nuit')).toBe(false)
    })

    it('matchesFlightKindFilter', () => {
      expect(matchesFlightKindFilter(baseRex, 'all')).toBe(true)
      expect(matchesFlightKindFilter(baseRex, 'Local')).toBe(true)
      expect(matchesFlightKindFilter(baseRex, 'Voltige')).toBe(false)
    })

    it('matchesEventKindFilter', () => {
      expect(matchesEventKindFilter(baseRex, 'all')).toBe(true)
      expect(matchesEventKindFilter(baseRex, 'Incident')).toBe(true)
      expect(matchesEventKindFilter(baseRex, 'Accident')).toBe(false)
    })
  })

  describe('isAtClubField', () => {
    it('vrai uniquement si place === terrain du club (insensible casse/espaces)', () => {
      expect(isAtClubField({ place: HOME })).toBe(true)
      expect(isAtClubField({ place: ` ${HOME.toLowerCase()} ` })).toBe(true)
      expect(isAtClubField({ place: 'LFBH' })).toBe(false)
      expect(isAtClubField({ place: null })).toBe(false)
      expect(isAtClubField({})).toBe(false)
    })
  })

  describe('isDeclaredByClub', () => {
    it('vrai seulement si fromClub === true (strict)', () => {
      expect(isDeclaredByClub({ fromClub: true })).toBe(true)
      expect(isDeclaredByClub({ fromClub: false })).toBe(false)
      expect(isDeclaredByClub({ fromClub: null })).toBe(false)
      expect(isDeclaredByClub({})).toBe(false)
    })
  })

  describe('isClubRelevant', () => {
    it('vrai si déclaré par le club OU survenu sur le terrain du club', () => {
      // REX déclaré par le club mais évènement ailleurs (cas 3074 : place ≠ terrain)
      expect(isClubRelevant({ fromClub: true, place: 'LFLO' })).toBe(true)
      // REX survenu sur le terrain mais déclaré par un autre club
      expect(isClubRelevant({ fromClub: false, place: HOME })).toBe(true)
      // Les deux à la fois
      expect(isClubRelevant({ fromClub: true, place: HOME })).toBe(true)
      // Ni l'un ni l'autre
      expect(isClubRelevant({ fromClub: false, place: 'LFBH' })).toBe(false)
      expect(isClubRelevant({})).toBe(false)
    })
  })

  describe('matchesSearchQuery', () => {
    it('vrai si query vide', () => {
      expect(matchesSearchQuery(baseRex, '')).toBe(true)
      expect(matchesSearchQuery(baseRex, '   ')).toBe(true)
      expect(matchesSearchQuery(baseRex, undefined)).toBe(true)
    })

    it('recherche insensible à la casse sur les champs narratifs', () => {
      expect(matchesSearchQuery(baseRex, 'dr400')).toBe(true)
      expect(matchesSearchQuery(baseRex, 'SORTIE DE PISTE')).toBe(true)
      expect(matchesSearchQuery(baseRex, 'introuvable-xyz')).toBe(false)
    })

    it('cherche aussi dans les causes, actions et enseignement', () => {
      const rex = {
        ...baseRex,
        causes: [{ title: 'Givrage carburateur', description: 'Réchauffe non tirée' }],
        actions: [{ description: 'Briefing club sur la réchauffe' }],
        safetyEducation: 'Toujours anticiper le givrage',
      }
      expect(matchesSearchQuery(rex, 'carburateur')).toBe(true)
      expect(matchesSearchQuery(rex, 'réchauffe non tirée')).toBe(true)
      expect(matchesSearchQuery(rex, 'briefing club')).toBe(true)
      expect(matchesSearchQuery(rex, 'anticiper le givrage')).toBe(true)
      expect(matchesSearchQuery(baseRex, 'carburateur')).toBe(false)
    })
  })

  describe('matchesAllFilters', () => {
    it('combine tous les critères (ET logique)', () => {
      const filters = {
        type: 'Anomalie',
        subject: 'all',
        regime: 'all',
        flightKind: 'all',
        eventKind: 'all',
        search: 'DR400',
        clubOnly: true,
      }
      expect(matchesAllFilters(baseRex, filters)).toBe(true)
    })

    it('faux si un seul critère échoue', () => {
      const filters = {
        type: 'Bonne pratique',
        subject: 'all',
        regime: 'all',
        flightKind: 'all',
        eventKind: 'all',
        search: '',
        clubOnly: false,
      }
      expect(matchesAllFilters(baseRex, filters)).toBe(false)
    })

    it('clubOnly exclut les REX hors terrain du club', () => {
      const rexAilleurs = { ...baseRex, place: 'LFBH' }
      const filters = {
        type: 'all',
        subject: 'all',
        regime: 'all',
        flightKind: 'all',
        eventKind: 'all',
        search: '',
        clubOnly: true,
      }
      expect(matchesAllFilters(rexAilleurs, filters)).toBe(false)
      expect(matchesAllFilters(baseRex, filters)).toBe(true)
      // REX déclaré par le club mais survenu ailleurs (cas 3074) : retenu quand même
      const rexClubAilleurs = { ...baseRex, place: 'LFLO', fromClub: true }
      expect(matchesAllFilters(rexClubAilleurs, filters)).toBe(true)
    })
  })

  describe('distinctValues', () => {
    it('extrait les valeurs uniques triées, en ignorant les valeurs vides', () => {
      const list = [
        { type: 'Anomalie' },
        { type: 'Bonne pratique' },
        { type: 'Anomalie' },
        { type: null },
      ]
      expect(distinctValues(list, 'type')).toEqual(['Anomalie', 'Bonne pratique'])
    })

    it('renvoie un tableau vide sur une liste vide/undefined', () => {
      expect(distinctValues([], 'type')).toEqual([])
      expect(distinctValues(undefined, 'type')).toEqual([])
    })
  })

  describe('splitCitationIds', () => {
    it('découpe une citation groupée en IDs', () => {
      expect(splitCitationIds('3074, 3065')).toEqual(['3074', '3065'])
      expect(splitCitationIds('3074')).toEqual(['3074'])
      expect(splitCitationIds(' 3074 ,  3065 , 3018')).toEqual(['3074', '3065', '3018'])
    })
  })

  describe('parseSummaryMarkdown', () => {
    it('renvoie un tableau vide pour un texte vide', () => {
      expect(parseSummaryMarkdown('')).toEqual([])
      expect(parseSummaryMarkdown(null)).toEqual([])
    })

    it('parse un titre ## en heading niveau 2', () => {
      const blocks = parseSummaryMarkdown('## Titre principal')
      expect(blocks).toHaveLength(1)
      expect(blocks[0].type).toBe('heading')
      expect(blocks[0].level).toBe(2)
      expect(blocks[0].parts).toEqual([{ type: 'text', value: 'Titre principal' }])
    })

    it('parse un séparateur --- en hr', () => {
      expect(parseSummaryMarkdown('---')).toEqual([{ type: 'hr' }])
    })

    it('parse une liste à puce en listItem', () => {
      const blocks = parseSummaryMarkdown('- Point important')
      expect(blocks[0].type).toBe('listItem')
    })

    it('isole le gras **texte** en segment bold', () => {
      const blocks = parseSummaryMarkdown('Ceci est **important** à retenir')
      const parts = blocks[0].parts
      expect(parts).toEqual([
        { type: 'text', value: 'Ceci est ' },
        { type: 'bold', value: 'important' },
        { type: 'text', value: ' à retenir' },
      ])
    })

    it('isole une citation {id} en segment citation', () => {
      const blocks = parseSummaryMarkdown('Perte de contrôle moteur {3074}.')
      const parts = blocks[0].parts
      expect(parts).toEqual([
        { type: 'text', value: 'Perte de contrôle moteur ' },
        { type: 'citation', value: '3074' },
        { type: 'text', value: '.' },
      ])
    })

    it('isole une citation groupée {id, id}', () => {
      const blocks = parseSummaryMarkdown('Surchauffe moteur {3064, 3018}.')
      const parts = blocks[0].parts
      expect(parts[1]).toEqual({ type: 'citation', value: '3064, 3018' })
    })

    it('reconnaît une citation à l’intérieur d’un gras **{id}** (régression 03/07/2026)', () => {
      const blocks = parseSummaryMarkdown('- **{3074}** : perte de contrôle moteur.')
      const parts = blocks[0].parts
      expect(parts).toEqual([
        { type: 'citation', value: '3074' },
        { type: 'text', value: ' : perte de contrôle moteur.' },
      ])
    })

    it('gère du texte gras mêlé à une citation, ex. **texte {id} texte**', () => {
      const blocks = parseSummaryMarkdown('**Action {3074} immédiate** requise.')
      const parts = blocks[0].parts
      expect(parts).toEqual([
        { type: 'bold', value: 'Action ' },
        { type: 'citation', value: '3074' },
        { type: 'bold', value: ' immédiate' },
        { type: 'text', value: ' requise.' },
      ])
    })

    it('ignore les lignes vides', () => {
      const blocks = parseSummaryMarkdown('Ligne 1\n\n\nLigne 2')
      expect(blocks).toHaveLength(2)
    })
  })

  describe('formatSummaryForSharing', () => {
    it('renvoie une chaîne vide pour un texte vide', () => {
      expect(formatSummaryForSharing('')).toBe('')
      expect(formatSummaryForSharing(null)).toBe('')
    })

    it('déplie le gras et explicite les citations en "(REX #id)"', () => {
      const out = formatSummaryForSharing('- **{3074}** : perte de contrôle moteur.')
      expect(out).toBe('- (REX #3074) : perte de contrôle moteur.')
    })

    it('explicite une citation groupée en plusieurs ids', () => {
      const out = formatSummaryForSharing('Surchauffe moteur {3064, 3018}.')
      expect(out).toBe('Surchauffe moteur (REX #3064, #3018).')
    })

    it('passe les titres ## en MAJUSCULES sans le symbole markdown', () => {
      const out = formatSummaryForSharing('## Thème 1 — Prévol')
      expect(out).toBe('THÈME 1 — PRÉVOL')
    })

    it('garde la casse normale pour un sous-titre ###', () => {
      const out = formatSummaryForSharing('### À retenir')
      expect(out).toBe('À retenir')
    })

    it('remplace un séparateur --- par une ligne ASCII', () => {
      const out = formatSummaryForSharing('Texte 1\n---\nTexte 2')
      expect(out).toBe('Texte 1\n───────────────────────\nTexte 2')
    })

    it('ne laisse aucun symbole markdown (**, {, }, ##, ---) dans la sortie', () => {
      const out = formatSummaryForSharing(
        '## Titre **gras**\n- **{3075}** : fait {2981, 2965}\n---\nFin.',
      )
      expect(out).not.toMatch(/[*{}]/)
      expect(out).not.toMatch(/^#{2,3}\s/m)
      expect(out).not.toMatch(/^-{3,}$/m)
    })
  })

  describe('formatSummaryPeriod', () => {
    it("formate une période 'YYYY-MM' en mois et année en français", () => {
      expect(formatSummaryPeriod('2026-06')).toBe('juin 2026')
    })

    it('gère janvier (mois 01) sans décalage', () => {
      expect(formatSummaryPeriod('2026-01')).toBe('janvier 2026')
    })

    it('gère décembre (mois 12) sans basculer sur l\'année suivante', () => {
      expect(formatSummaryPeriod('2025-12')).toBe('décembre 2025')
    })

    it('renvoie une chaîne vide pour une période absente ou mal formée', () => {
      expect(formatSummaryPeriod(null)).toBe('')
      expect(formatSummaryPeriod('')).toBe('')
      expect(formatSummaryPeriod('2026')).toBe('')
      expect(formatSummaryPeriod('2026-6')).toBe('')
      expect(formatSummaryPeriod('pas une période')).toBe('')
    })

    it('rejette un mois hors plage plutôt que de décaler la date', () => {
      expect(formatSummaryPeriod('2026-13')).toBe('')
      expect(formatSummaryPeriod('2026-00')).toBe('')
    })
  })

  describe('normalizePlace', () => {
    it('met en majuscule et retire les espaces superflus', () => {
      expect(normalizePlace(' lfmd ')).toBe('LFMD')
      expect(normalizePlace('Lfru ')).toBe('LFRU')
    })

    it('ne modifie pas un lieu déjà normalisé', () => {
      expect(normalizePlace('LFFI')).toBe('LFFI')
    })

    it('laisse passer un lieu hors format OACI, seulement mis en majuscules', () => {
      expect(normalizePlace('Baie de Somme')).toBe('BAIE DE SOMME')
      expect(normalizePlace('lf8523')).toBe('LF8523')
    })

    it('gère les valeurs absentes', () => {
      expect(normalizePlace(null)).toBe('')
      expect(normalizePlace(undefined)).toBe('')
      expect(normalizePlace('')).toBe('')
    })
  })

  describe('normalizeAerodromeCodesInText', () => {
    it('met en majuscule un code aérodrome isolé en minuscule dans le texte', () => {
      expect(normalizeAerodromeCodesInText('vol lfeh vers la campagne')).toBe(
        'vol LFEH vers la campagne',
      )
    })

    it('corrige plusieurs occurrences indépendamment', () => {
      expect(normalizeAerodromeCodesInText('trajet LFOQ - lfpz')).toBe('trajet LFOQ - LFPZ')
    })

    it('ne touche pas au reste de la casse du texte', () => {
      expect(normalizeAerodromeCodesInText('VOL LOCAL AVEC lfeh EN ROUTE')).toBe(
        'VOL LOCAL AVEC LFEH EN ROUTE',
      )
    })

    it("ne matche pas un code altisurface à 6 caractères (LFxxNN)", () => {
      expect(normalizeAerodromeCodesInText("l'altisurface LF3832")).toBe("l'altisurface LF3832")
    })

    it('ne matche pas LF en milieu de mot (faux positifs)', () => {
      expect(normalizeAerodromeCodesInText('un terrain de GOLF en Californie')).toBe(
        'un terrain de GOLF en Californie',
      )
    })

    it('tolère la ponctuation collée', () => {
      expect(normalizeAerodromeCodesInText('en provenance de (lfpo), via lfpz.')).toBe(
        'en provenance de (LFPO), via LFPZ.',
      )
    })

    it('gère les valeurs absentes', () => {
      expect(normalizeAerodromeCodesInText(null)).toBe('')
      expect(normalizeAerodromeCodesInText(undefined)).toBe('')
      expect(normalizeAerodromeCodesInText('')).toBe('')
    })
  })
})
