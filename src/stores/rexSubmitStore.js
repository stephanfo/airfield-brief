import { defineStore } from 'pinia'
import { computed, reactive, ref, watch } from 'vue'
import { REX_SUBMIT } from '../config/app.config'
import { CLUB_CONFIG } from '../config/club.config'
import { logger } from '../utils/logger'
import { STORAGE_KEYS } from '../config/storageKeys'

/**
 * Store de soumission de REX (FEAT-033).
 *
 * Ce n'est PAS un flux de données (pas de `useDataFetcher`) : c'est un POST unique
 * vers le service web `rex-submit`. Le store porte :
 *  - le formulaire réactif (`form`),
 *  - la persistance du BROUILLON en localStorage (anti-perte) : sauvegarde à chaque
 *    frappe (debounced), restaurée à l'init, **effacée uniquement après un envoi
 *    confirmé** (200 = e-mail réellement parti au CPS). Toute erreur conserve le
 *    brouillon (le texte du pilote ne disparaît jamais tant que le CPS n'a pas reçu).
 *  - l'action `submit()` qui envoie honeypot + token + startedAt (garde-fous anti-spam).
 *
 * Conforme à la règle projet « localStorage = préférences UI » (ici : un brouillon
 * de saisie, pas une donnée métier/aviation).
 *
 * PHOTOS : l'état `images` est VOLONTAIREMENT séparé de `form` et N'EST PAS persisté
 * en localStorage. Le base64 de plusieurs photos saturerait le quota (~5 Mo) ; on
 * préfère ne jamais persister les photos (le récit, lui, reste sauvé). Après un
 * rechargement de page, les photos sont donc à re-sélectionner (l'UI le signale).
 */

const DRAFT_KEY = STORAGE_KEYS.REX_DRAFT

/**
 * Date/heure courantes en UTC, au format attendu par les inputs natifs
 * (`YYYY-MM-DD` et `HH:mm`). L'heure de l'évènement est saisie en **Zulu (UTC)**,
 * jamais en heure locale : on dérive donc les deux de `toISOString()`.
 */
function nowUtcParts() {
  const [date, time] = new Date().toISOString().split('T')
  return { date, time: time.slice(0, 5) }
}

/**
 * Formulaire vierge. Date et heure sont pré-remplies à l'instant courant (UTC) :
 * un REX se saisit le plus souvent le jour même, et un champ date natif vide est
 * rendu de façon trompeuse par Safari (il affiche la date du jour en gris alors
 * que la valeur est vide, cf. FEAT-033). Le pilote reste libre de les corriger.
 */
function emptyForm() {
  const now = nowUtcParts()
  return {
    narrative: '',
    aircraft: '',
    eventDate: now.date,
    eventTime: now.time,
    place: CLUB_CONFIG.airfield.icao,
    phase: '',
    flightType: '',
    gravity: '',
    reporterName: '',
    reporterEmail: '',
    contact: '',
  }
}

export const useRexSubmitStore = defineStore('rexSubmit', () => {
  const form = reactive(emptyForm())
  /** Photos jointes [{ name, dataUrl }] — hors `form`, jamais persistées (cf. entête). */
  const images = ref([])
  /**
   * Nombre de photos qui étaient présentes dans le brouillon, persisté en localStorage
   * (juste un COMPTEUR, pas les images → aucun souci de quota). Sert à détecter, après
   * un rechargement de page, que le pilote avait chargé des photos désormais perdues,
   * afin de le prévenir avant l'envoi. Restauré au chargement, effacé avec le brouillon.
   */
  const hadImagesCount = ref(0)
  const submitting = ref(false)
  const error = ref(null)
  const lastSubmittedAt = ref(null)
  const draftSavedAt = ref(null)
  /** Timestamp d'ouverture du formulaire (time-trap anti-bot côté serveur). */
  const startedAt = ref(Date.now())

  // Un brouillon « réel » = au moins un champ saisi par le pilote. Les champs
  // pré-remplis par défaut (lieu, date, heure) ne comptent pas : sinon un
  // formulaire jamais touché serait signalé comme brouillon en cours.
  const PREFILLED_FIELDS = ['place', 'eventDate', 'eventTime']
  const hasDraft = computed(() =>
    Object.entries(form).some(
      ([key, v]) => !PREFILLED_FIELDS.includes(key) && v && String(v).trim() !== '',
    ),
  )

  /**
   * Vrai si le brouillon indiquait des photos mais qu'aucune n'est actuellement chargée
   * (typiquement après un rechargement de page : les images ne survivent pas, cf. entête).
   * Le composant s'en sert pour confirmer avant d'envoyer un REX sans ses photos.
   */
  const pendingImagesLost = computed(() => hadImagesCount.value > 0 && images.value.length === 0)

  // ── Brouillon localStorage : restauration à l'init ──────────────────────────
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (raw) {
      const saved = JSON.parse(raw)
      if (saved && typeof saved === 'object') {
        Object.assign(form, emptyForm(), saved.form ?? {})
        draftSavedAt.value = saved.savedAt ?? null
        hadImagesCount.value = Number(saved.imagesCount) || 0
      }
    }
  } catch (e) {
    logger.warn('Brouillon REX illisible, ignoré :', e)
  }

  // Sauvegarde debounced à chaque modification du formulaire.
  let saveTimer = null
  // Vrai pendant un reset : empêche le watcher de re-sauver un brouillon vide
  // (la remise à zéro du formulaire déclencherait sinon un saveDraft différé).
  let suppressSave = false
  watch(
    form,
    () => {
      if (suppressSave) return
      if (saveTimer) clearTimeout(saveTimer)
      saveTimer = setTimeout(saveDraft, 400)
    },
    { deep: true },
  )

  // Le compteur de photos du brouillon suit le nombre RÉEL d'images dès que le pilote
  // touche à sa sélection dans CETTE session (ajout ou retrait) : à partir de là le
  // compteur = images.length (retirer toutes ses photos volontairement remet donc le
  // compteur à 0 → pas de faux rappel). Tant qu'il n'y a pas eu d'interaction (ex. juste
  // après un rechargement, images vide), on PRÉSERVE le compteur restauré du brouillon —
  // c'est précisément ce qui déclenche le rappel « vous aviez chargé des photos ».
  let imagesTouchedThisSession = false
  watch(
    images,
    () => {
      if (suppressSave) return
      if (imagesTouchedThisSession || images.value.length > 0) {
        imagesTouchedThisSession = true
        hadImagesCount.value = images.value.length
      }
      saveDraft()
    },
    { deep: true },
  )

  function saveDraft() {
    try {
      const savedAt = new Date().toISOString()
      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({ form: { ...form }, savedAt, imagesCount: hadImagesCount.value }),
      )
      draftSavedAt.value = savedAt
    } catch (e) {
      logger.warn('Impossible d’enregistrer le brouillon REX :', e)
    }
  }

  /** Efface le brouillon persistant ET remet le formulaire à vide. */
  function resetDraft() {
    if (saveTimer) clearTimeout(saveTimer)
    suppressSave = true
    try {
      localStorage.removeItem(DRAFT_KEY)
    } catch (e) {
      logger.warn('Impossible d’effacer le brouillon REX :', e)
    }
    Object.assign(form, emptyForm())
    images.value = []
    hadImagesCount.value = 0
    draftSavedAt.value = null
    startedAt.value = Date.now()
    error.value = null
    // Réactive la sauvegarde après que la mutation du formulaire ait été observée.
    setTimeout(() => {
      suppressSave = false
    }, 0)
  }

  /**
   * Envoie la soumission au service `rex-submit`. Ne vide le brouillon QUE sur un
   * succès confirmé (200). Renvoie true si envoyé, false sinon (brouillon conservé).
   */
  async function submit() {
    submitting.value = true
    error.value = null
    try {
      const payload = {
        ...form,
        images: images.value.map(({ name, dataUrl }) => ({ name, dataUrl })),
        website: '', // honeypot (doit rester vide : rempli => bot)
        token: REX_SUBMIT.token || undefined,
        startedAt: startedAt.value,
      }
      const res = await fetch(REX_SUBMIT.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      let body = null
      try {
        body = await res.json()
      } catch {
        body = null
      }

      if (!res.ok || !body?.success) {
        error.value = body?.message || 'L’envoi a échoué. Vos données sont conservées, réessayez.'
        return false
      }

      // Succès confirmé (e-mail parti au CPS) : on peut effacer le brouillon.
      lastSubmittedAt.value = new Date().toISOString()
      resetDraft()
      return true
    } catch (e) {
      logger.error('Échec de soumission REX :', e)
      error.value = 'Envoi impossible (réseau). Vos données sont conservées, réessayez.'
      return false
    } finally {
      submitting.value = false
    }
  }

  return {
    form,
    images,
    hadImagesCount,
    pendingImagesLost,
    submitting,
    error,
    lastSubmittedAt,
    draftSavedAt,
    hasDraft,
    submit,
    resetDraft,
    saveDraft,
  }
})
