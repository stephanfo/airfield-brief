import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import { useRexSubmitStore } from '@/stores/rexSubmitStore'
import { STORAGE_KEYS } from '@/config/storageKeys'

const DRAFT_KEY = STORAGE_KEYS.REX_DRAFT

/**
 * Couvre la logique du BROUILLON et du MARQUEUR DE PHOTOS PERDUES du rexSubmitStore
 * (rappel « vous aviez chargé des photos » après un rechargement). Chaque `useRexSubmitStore()`
 * sur une pinia neuve rejoue l'init du store = simule un rechargement de page : les images
 * (non persistées) repartent à vide, mais le compteur du brouillon est relu depuis localStorage.
 */
describe('rexSubmitStore — marqueur de photos perdues', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('ne persiste pas les images mais mémorise leur nombre dans le brouillon', async () => {
    const store = useRexSubmitStore()
    store.form.narrative = 'Un récit de test suffisamment long.'
    store.images = [
      { name: 'a.jpg', dataUrl: 'data:image/jpeg;base64,AAAA' },
      { name: 'b.jpg', dataUrl: 'data:image/jpeg;base64,BBBB' },
    ]
    await nextTick()
    store.saveDraft()

    const saved = JSON.parse(localStorage.getItem(DRAFT_KEY))
    expect(saved.imagesCount).toBe(2)
    // Les images elles-mêmes ne doivent JAMAIS être persistées (quota).
    expect(JSON.stringify(saved)).not.toContain('base64')
  })

  it('après rechargement (images vidées), signale les photos perdues', async () => {
    // Première "session" : on a 1 photo + un récit, on sauve.
    const s1 = useRexSubmitStore()
    s1.form.narrative = 'Récit avec une photo jointe.'
    s1.images = [{ name: 'a.jpg', dataUrl: 'data:image/jpeg;base64,AAAA' }]
    await nextTick()
    s1.saveDraft()

    // "Rechargement" : nouvelle pinia → nouvelle instance qui relit le brouillon.
    setActivePinia(createPinia())
    const s2 = useRexSubmitStore()
    await nextTick()

    expect(s2.form.narrative).toBe('Récit avec une photo jointe.') // texte restauré
    expect(s2.images.length).toBe(0) // photos NON restaurées
    expect(s2.hadImagesCount).toBe(1) // mais on sait qu'il y en avait
    expect(s2.pendingImagesLost).toBe(true) // → déclenche le rappel
  })

  it('ne signale rien si le brouillon n’avait pas de photo', async () => {
    const s1 = useRexSubmitStore()
    s1.form.narrative = 'Récit sans photo.'
    await nextTick()
    s1.saveDraft()

    setActivePinia(createPinia())
    const s2 = useRexSubmitStore()
    await nextTick()
    expect(s2.pendingImagesLost).toBe(false)
  })

  it('re-sélectionner des photos lève le rappel', async () => {
    const s1 = useRexSubmitStore()
    s1.form.narrative = 'Récit avec photo.'
    s1.images = [{ name: 'a.jpg', dataUrl: 'data:image/jpeg;base64,AAAA' }]
    await nextTick()
    s1.saveDraft()

    setActivePinia(createPinia())
    const s2 = useRexSubmitStore()
    await nextTick()
    expect(s2.pendingImagesLost).toBe(true)

    // Le pilote re-sélectionne une photo → plus de rappel.
    s2.images = [{ name: 'c.jpg', dataUrl: 'data:image/jpeg;base64,CCCC' }]
    await nextTick()
    expect(s2.pendingImagesLost).toBe(false)
  })

  it('retirer volontairement toutes ses photos ne déclenche pas de faux rappel', async () => {
    const store = useRexSubmitStore()
    store.form.narrative = 'Récit, photos ajoutées puis retirées.'
    store.images = [
      { name: 'a.jpg', dataUrl: 'data:image/jpeg;base64,AAAA' },
      { name: 'b.jpg', dataUrl: 'data:image/jpeg;base64,BBBB' },
    ]
    await nextTick()
    // Retrait volontaire de toutes les photos dans la même session.
    store.images = []
    await nextTick()
    expect(store.hadImagesCount).toBe(0)
    expect(store.pendingImagesLost).toBe(false)
  })

  it('resetDraft efface le marqueur et le brouillon', async () => {
    const store = useRexSubmitStore()
    store.form.narrative = 'À effacer.'
    store.images = [{ name: 'a.jpg', dataUrl: 'data:image/jpeg;base64,AAAA' }]
    await nextTick()
    store.saveDraft()

    store.resetDraft()
    await nextTick()
    expect(store.hadImagesCount).toBe(0)
    expect(store.images.length).toBe(0)
    expect(localStorage.getItem(DRAFT_KEY)).toBe(null)
  })
})
