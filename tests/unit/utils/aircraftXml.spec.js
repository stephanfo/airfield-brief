import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  parseAircraftXml,
  parseEnvelope,
  slugify,
  buildAircraftFromXml,
  FUEL_DENSITY_DEFAULTS,
} from '@/utils/aircraftXml'

// process.cwd() = racine projet quand Vitest tourne (cf. vitest.config.js).
// On évite new URL()/fileURLToPath car happy-dom surcharge le global URL.
//
// Fixture DÉDIÉE (immatriculation neutralisée) plutôt qu'un fichier de
// `public/data/`, qui est gitignoré : sur un clone frais, ces tests
// échoueraient faute de données. Elle reste un XML réel, exporté par le même
// outil que les vraies fiches — c'est tout l'intérêt pour tester le parsing.
const xml = readFileSync(resolve(process.cwd(), 'tests/fixtures/aircraft-dr401.aircraft'), 'utf-8')

describe('slugify', () => {
  it('normalise accents et espaces', () => {
    expect(slugify('Sièges avant')).toBe('sieges-avant')
    expect(slugify('Rear Passenger 1')).toBe('rear-passenger-1')
  })
})

describe('parseEnvelope', () => {
  it('découpe les paires arm,weight', () => {
    const env = parseEnvelope('428.00,900,564,900,564,650')
    expect(env).toEqual([
      { arm: 428, weight: 900 },
      { arm: 564, weight: 900 },
      { arm: 564, weight: 650 },
    ])
  })

  it('renvoie [] si vide', () => {
    expect(parseEnvelope('')).toEqual([])
    expect(parseEnvelope(null)).toEqual([])
  })
})

describe('parseAircraftXml — fichier réel (fixture DR401)', () => {
  const ac = parseAircraftXml(xml)

  it('lit les attributs principaux', () => {
    expect(ac.registration).toBe('F-TEST')
    expect(ac.model).toContain('DR401-120')
    expect(ac.emptyWeight).toBeCloseTo(595.1)
    expect(ac.emptyArm).toBe(403)
    expect(ac.maxTakeoffWeight).toBeCloseTo(1054.6)
    expect(ac.minRunwayM).toBe(600)
  })

  it('lit le bloc carburant', () => {
    expect(ac.fuel.type).toBe('AvGas100LL')
    expect(ac.fuel.density).toBe(FUEL_DENSITY_DEFAULTS.AvGas100LL)
    expect(ac.fuel.maxVolume).toBe(110)
    expect(ac.fuel.taxiFuel).toBe(4)
    expect(ac.fuel.finalReserveMinutes).toBe(30)
    expect(ac.fuel.contingency).toBeCloseTo(0.05)
    expect(ac.fuel.burn.cruise).toBe(25)
  })

  it('lit le tarif horaire', () => {
    expect(ac.pricing.hourlyRate).toBeCloseTo(185.4)
    expect(ac.pricing.currency).toBe('EUR')
    expect(ac.pricing.includesFuel).toBe(true)
  })

  it('extrait les postes de chargement avec types', () => {
    const fuel = ac.stations.find((s) => s.type === 'fuel')
    expect(fuel).toBeTruthy()
    expect(fuel.arm).toBe(1120)
    expect(fuel.maxVolume).toBe(110)
    expect(fuel.unusable).toBe(1)

    const baggage = ac.stations.find((s) => s.type === 'baggage')
    expect(baggage.label).toBe('Bagages') // traduit, id reste basé sur le nom XML
    expect(baggage.id).toBe('baggage')
    expect(baggage.arm).toBe(1900)

    const persons = ac.stations.filter((s) => s.type === 'person')
    expect(persons.length).toBe(4) // Pilot + Front Pax + 2 Rear Pax
  })

  it('ordonne les postes : pilote → passager avant → arrière → bagages → carburant', () => {
    const ids = ac.stations.map((s) => s.id)
    const pilot = ids.indexOf('pilot')
    const front = ids.indexOf('front-passenger')
    const rear = ids.findIndex((id) => id.startsWith('rear-passenger'))
    const baggage = ids.indexOf('baggage')
    const fuel = ac.stations.findIndex((s) => s.type === 'fuel')
    expect(pilot).toBeLessThan(front)
    expect(front).toBeLessThan(rear)
    expect(rear).toBeLessThan(baggage)
    expect(baggage).toBeLessThan(fuel)
  })

  it('traduit en FR les noms de postes par défaut du logiciel', () => {
    const labels = ac.stations.map((s) => s.label)
    expect(labels).toContain('Pilote')
    expect(labels).toContain('Passager avant')
    expect(labels).toContain('Passager arrière 1')
    expect(labels).toContain('Réservoir principal')
    // ids inchangés (clés de persistance stables)
    expect(ac.stations.map((s) => s.id)).toContain('pilot')
  })

  it('parse l’enveloppe (5 sommets)', () => {
    expect(ac.envelope.length).toBe(5)
    expect(ac.envelope[0]).toEqual({ arm: 428, weight: 900 })
  })

  it('extrait les check-lists', () => {
    expect(ac.checklists.length).toBeGreaterThan(0)
    const prep = ac.checklists.find((c) => c.name === 'Préparation')
    expect(prep).toBeTruthy()
    expect(prep.phase).toBe('Preflight')
    expect(prep.sections[0].items[0].challenge).toContain('Documents')
  })
})

describe('parseAircraftXml — densité surchargée', () => {
  it('utilise la densité du complément si fournie', () => {
    const ac = parseAircraftXml(xml, { density: 0.71 })
    expect(ac.fuel.density).toBe(0.71)
    expect(ac.stations.find((s) => s.type === 'fuel').density).toBe(0.71)
  })
})

describe('parseAircraftXml — erreurs', () => {
  it('rejette une chaîne vide', () => {
    expect(() => parseAircraftXml('')).toThrow()
  })

  it('rejette un XML sans <Aircraft>', () => {
    expect(() => parseAircraftXml('<Foo/>')).toThrow()
  })
})

describe('buildAircraftFromXml — fusion XML + index', () => {
  it("l'index fait foi pour l'immatriculation", () => {
    const ac = buildAircraftFromXml(xml, { registration: 'F-AUTRE' })
    expect(ac.registration).toBe('F-AUTRE')
  })

  it("retombe sur l'immatriculation du XML si l'index n'en donne pas", () => {
    const ac = buildAircraftFromXml(xml, {})
    expect(ac.registration).toBe('F-TEST')
  })

  it('applique la densité du complément selon le FuelType du XML', () => {
    const ac = buildAircraftFromXml(xml, {}, { densities: { AvGas100LL: 0.71 } })
    expect(ac.fuel.density).toBe(0.71)
  })

  it("fusionne la performance de l'index, avec repli sur defaultPerformance", () => {
    const perf = { takeoff: [[0, 300]] }
    expect(buildAircraftFromXml(xml, { performance: perf }).performance).toEqual(perf)
    const fallback = { takeoff: [[0, 350]] }
    expect(buildAircraftFromXml(xml, {}, { defaultPerformance: fallback }).performance).toEqual(
      fallback,
    )
  })

  it('propage les erreurs de parsing XML', () => {
    expect(() => buildAircraftFromXml('<Foo/>', {})).toThrow()
  })
})
