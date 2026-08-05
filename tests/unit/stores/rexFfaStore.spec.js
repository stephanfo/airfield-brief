/**
 * Tests du store REX FFA — historique des synthèses mensuelles (`summaries[]`).
 *
 * On se concentre sur la sélection d'archives : c'est la logique qui décide quel
 * mois s'affiche dans l'onglet Synthèse, et qui doit rester correcte face à un
 * rex.json ancien (sans `summaries[]`) ou désynchronisé (synthèse servie hors
 * historique, cas du fail-safe LLM côté script).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useRexFfaStore } from '@/stores/rexFfaStore'
import { useCache } from '@/composables/useCache'

const mkSummary = (period, text = `synthèse ${period}`) => ({
  period,
  model: 'm',
  generatedAt: '2026-07-01T00:00:00Z',
  text,
  citedRexIds: [],
})

const periodsOf = (store) => store.summaries.map((s) => s.period)

/** Charge un rex.json simulé dans le store (via le vrai chemin fetch → cache). */
const loadPayload = async (payload) => {
  global.fetch = vi.fn(() =>
    Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(payload) }),
  )
  const store = useRexFfaStore()
  await store.loadRexFfa()
  return store
}

describe('rexFfaStore — historique des synthèses', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    useCache().clear()
    vi.clearAllMocks()
  })

  it('expose les périodes de summaries[] telles que servies par rex.json', async () => {
    const store = await loadPayload({
      generatedAt: '2026-07-03T10:00:00Z',
      summary: mkSummary('2026-06'),
      summaries: [mkSummary('2026-06'), mkSummary('2026-05'), mkSummary('2026-04')],
      rex: [],
    })
    expect(periodsOf(store)).toEqual(['2026-06', '2026-05', '2026-04'])
  })

  it('retombe sur summary seul si rex.json ne porte pas encore summaries[] (compat)', async () => {
    const store = await loadPayload({ summary: mkSummary('2026-06'), rex: [] })
    expect(periodsOf(store)).toEqual(['2026-06'])
  })

  it("n'expose aucune synthèse quand le texte est vide (fail-safe backend niveau 3)", async () => {
    const store = await loadPayload({ summary: mkSummary('2026-06', ''), rex: [] })
    expect(store.summaries).toEqual([])
  })

  it('écarte de summaries[] les entrées sans texte', async () => {
    const store = await loadPayload({
      summary: mkSummary('2026-06'),
      summaries: [mkSummary('2026-06'), mkSummary('2026-05', '')],
      rex: [],
    })
    expect(periodsOf(store)).toEqual(['2026-06'])
  })

  // Régression : le fail-safe LLM du script peut servir une synthèse (reprise du
  // rex.json précédent) qui n'a jamais été archivée en base, donc absente de
  // summaries[]. La page ne lit que summaries[] → elle disparaîtrait de l'écran.
  it('réinjecte la synthèse servie si elle est absente de summaries[] (payload désynchronisé)', async () => {
    const store = await loadPayload({
      summary: mkSummary('2026-06', 'synthèse reprise du json précédent'),
      summaries: [mkSummary('2026-05'), mkSummary('2026-04')],
      rex: [],
    })
    expect(periodsOf(store)).toEqual(['2026-06', '2026-05', '2026-04'])
    expect(store.findSummaryByPeriod('2026-06').text).toBe('synthèse reprise du json précédent')
  })

  it('ne duplique pas la synthèse servie quand elle figure déjà dans summaries[]', async () => {
    const store = await loadPayload({
      summary: mkSummary('2026-06'),
      summaries: [mkSummary('2026-06'), mkSummary('2026-05')],
      rex: [],
    })
    expect(periodsOf(store)).toEqual(['2026-06', '2026-05'])
  })

  it('findSummaryByPeriod renvoie la synthèse du mois demandé', async () => {
    const store = await loadPayload({
      summary: mkSummary('2026-06'),
      summaries: [mkSummary('2026-06'), mkSummary('2026-05')],
      rex: [],
    })
    expect(store.findSummaryByPeriod('2026-05').text).toBe('synthèse 2026-05')
  })

  it('findSummaryByPeriod retombe sur le mois le plus récent si la période est inconnue ou absente', async () => {
    const store = await loadPayload({
      summary: mkSummary('2026-06'),
      summaries: [mkSummary('2026-06'), mkSummary('2026-05')],
      rex: [],
    })
    // Période sortie de la fenêtre servie, ou aucun choix encore fait par le pilote.
    expect(store.findSummaryByPeriod('2024-01').period).toBe('2026-06')
    expect(store.findSummaryByPeriod(null).period).toBe('2026-06')
  })

  it('findSummaryByPeriod renvoie null quand aucune synthèse n’est servie', async () => {
    const store = await loadPayload({ rex: [] })
    expect(store.findSummaryByPeriod('2026-06')).toBeNull()
  })

  // Régression : la normalisation recréait 724 objets à chaque recalcul, ce qui
  // invalidait rexById/filteredRexList/filterOptions ensemble et forçait un
  // re-rendu complet de la liste à chaque revalidation ou retour d'onglet.
  it('préserve l’identité des REX normalisés tant que le payload ne change pas', async () => {
    const store = await loadPayload({
      summary: mkSummary('2026-06'),
      rex: [{ id: '1', place: 'lfmd', title: 'vol lfeh' }],
    })

    const first = store.rexList
    const firstItem = store.rexList[0]

    expect(store.rexList).toBe(first)
    expect(store.rexList[0]).toBe(firstItem)
    expect(store.findRexById('1')).toBe(firstItem)
  })

  it('renvoie un tableau stable quand le payload ne porte aucun REX', async () => {
    const store = await loadPayload({ summary: mkSummary('2026-06') })
    expect(store.rexList).toEqual([])
    expect(store.rexList).toBe(store.rexList)
  })

  it('normalise place et les codes aérodrome du texte narratif des REX et des synthèses servis', async () => {
    const store = await loadPayload({
      summary: mkSummary('2026-06', 'vol lfeh vers la campagne'),
      rex: [{ id: '1', place: ' lfmd ', title: 'vol lfeh incident' }],
    })
    expect(store.rexList[0].place).toBe('LFMD')
    expect(store.rexList[0].title).toBe('vol LFEH incident')
    expect(store.summary.text).toBe('vol LFEH vers la campagne')
  })
})
