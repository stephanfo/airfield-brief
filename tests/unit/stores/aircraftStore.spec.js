import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { useAircraftStore } from '@/stores/aircraftStore'
import { useCache } from '@/composables/useCache'
import { STORAGE_KEYS } from '@/config/storageKeys'

// Fichier .aircraft réel du repo (même fixture que aircraftXml.spec.js)
const realXml = readFileSync(
  resolve(process.cwd(), 'tests/fixtures/aircraft-dr401.aircraft'),
  'utf-8',
)

const index = {
  generatedAt: '2026-06-10T08:00:00Z',
  fuelDensity: { AvGas100LL: 0.72 },
  defaultPerformance: { takeoff: [[0, 350]] },
  aircraft: [
    {
      registration: 'F-HKRI',
      source: './data/aircrafts/F-HKRI.aircraft',
      performance: { takeoff: [[0, 300]] },
    },
    { registration: 'F-GAAA', source: './data/aircrafts/F-GAAA.aircraft' },
  ],
}

/**
 * Mock fetch : l'index répond en JSON, les .aircraft en texte XML.
 * `xmlByRegistration` associe chaque immat à son contenu XML (ou une
 * réponse en échec si absent).
 */
const mockFetchByUrl = (idx, xmlByRegistration) =>
  vi.fn((url) => {
    const u = String(url)
    if (u.includes('aircrafts.json')) {
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(idx) })
    }
    const reg = Object.keys(xmlByRegistration).find((r) => u.includes(r))
    if (!reg || xmlByRegistration[reg] == null) {
      return Promise.resolve({ ok: false, status: 404 })
    }
    return Promise.resolve({
      ok: true,
      status: 200,
      text: () => Promise.resolve(xmlByRegistration[reg]),
    })
  })

describe('aircraftStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    useCache().clear()
    vi.clearAllMocks()
  })

  it('construit la liste des avions depuis index + XML', async () => {
    global.fetch = mockFetchByUrl(index, { 'F-HKRI': realXml, 'F-GAAA': realXml })
    const store = useAircraftStore()
    await store.loadAircrafts()

    expect(store.aircraftList).toHaveLength(2)
    // L'index fait foi pour l'immatriculation, même si le XML dit F-HKRI
    expect(store.aircraftList.map((a) => a.registration)).toEqual(['F-HKRI', 'F-GAAA'])
  })

  it('fusionne la performance de l’index, avec repli sur defaultPerformance', async () => {
    global.fetch = mockFetchByUrl(index, { 'F-HKRI': realXml, 'F-GAAA': realXml })
    const store = useAircraftStore()
    await store.loadAircrafts()

    const [hkri, gaaa] = store.aircraftList
    expect(hkri.performance).toEqual({ takeoff: [[0, 300]] })
    expect(gaaa.performance).toEqual({ takeoff: [[0, 350]] }) // defaultPerformance
  })

  it('un avion en échec ne casse pas les autres', async () => {
    global.fetch = mockFetchByUrl(index, { 'F-HKRI': realXml, 'F-GAAA': null })
    const store = useAircraftStore()
    await store.loadAircrafts()

    expect(store.aircraftList).toHaveLength(1)
    expect(store.aircraftList[0].registration).toBe('F-HKRI')
    expect(store.parseError).toBeNull()
  })

  it('parseError est posé quand aucun avion n’est lisible', async () => {
    global.fetch = mockFetchByUrl(index, { 'F-HKRI': null, 'F-GAAA': null })
    const store = useAircraftStore()
    await store.loadAircrafts()

    expect(store.aircraftList).toHaveLength(0)
    expect(store.parseError).toBeTruthy()
  })

  it('selectedAircraft retombe sur le premier avion sans sélection mémorisée', async () => {
    global.fetch = mockFetchByUrl(index, { 'F-HKRI': realXml, 'F-GAAA': realXml })
    const store = useAircraftStore()
    await store.loadAircrafts()

    expect(store.selectedAircraft.registration).toBe('F-HKRI')
  })

  it('setSelected change la sélection et la persiste', async () => {
    global.fetch = mockFetchByUrl(index, { 'F-HKRI': realXml, 'F-GAAA': realXml })
    const store = useAircraftStore()
    await store.loadAircrafts()

    store.setSelected('F-GAAA')
    expect(store.selectedAircraft.registration).toBe('F-GAAA')
    expect(localStorage.getItem(STORAGE_KEYS.SELECTED_AIRCRAFT)).toBe('F-GAAA')
  })

  it('liste vide si l’index ne contient aucun avion', async () => {
    global.fetch = mockFetchByUrl({ ...index, aircraft: [] }, {})
    const store = useAircraftStore()
    await store.loadAircrafts()

    expect(store.aircraftList).toEqual([])
  })
})
