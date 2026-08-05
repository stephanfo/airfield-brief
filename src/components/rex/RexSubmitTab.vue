<template>
  <SectionCard title="Retour d'expérience" icon="health_and_safety">
    <q-banner dense class="bg-blue-1 text-blue-9 rounded-borders q-mb-md">
      <template #avatar>
        <q-icon name="info" color="blue-9" />
      </template>
      Décrivez librement ce qu'il s'est passé : pas besoin de mise en forme ni de
      vocabulaire technique. Le CPS reformulera au format REX FFA. Les champs marqués
      d'un <span class="text-red-7">*</span> sont obligatoires.
    </q-banner>

    <q-form ref="formRef" @submit="onSubmit">
      <q-input
        v-model="form.narrative"
        type="textarea"
        label="Que s'est-il passé ? *"
        autogrow
        counter
        maxlength="8000"
        input-style="min-height: 140px"
        :rules="[(v) => (v && v.trim().length >= 10) || 'Décrivez l\'évènement (10 caractères min.)']"
        class="q-mb-md"
      />

      <q-select
        v-model="aircraftChoice"
        :options="aircraftOptions"
        label="Avion concerné *"
        emit-value
        map-options
        :rules="[() => !!aircraftChoice || !!form.aircraft || 'Sélectionnez l\'avion (ou « Autre »)']"
        @update:model-value="onAircraftChoice"
        :class="isOtherAircraft ? '' : 'q-mb-md'"
      />
      <q-input
        v-if="isOtherAircraft"
        v-model="form.aircraft"
        label="Immatriculation *"
        placeholder="F-XXXX"
        autofocus
        hint="Avion non listé : saisissez l'immatriculation"
        :rules="[(v) => !!(v && v.trim()) || 'Immatriculation obligatoire']"
        @update:model-value="(v) => (form.aircraft = (v || '').toUpperCase())"
        class="q-mb-md"
      />

      <div class="row q-col-gutter-md q-mb-md">
        <div class="col-12 col-sm-6">
          <q-input
            v-model="form.eventDate"
            type="date"
            label="Date de l'évènement *"
            stack-label
            :rules="[(v) => !!v || 'Date obligatoire']"
          />
        </div>
        <div class="col-12 col-sm-6">
          <q-input
            v-model="form.eventTime"
            type="time"
            label="Heure Zulu (UTC, approximative)"
            hint="Heure en Zulu (UTC), pas l'heure locale"
            stack-label
          />
        </div>
      </div>

      <q-input v-model="form.place" label="Lieu *" :rules="[(v) => !!v || 'Lieu obligatoire']" class="q-mb-md" />

      <div class="row q-col-gutter-md q-mb-md">
        <div class="col-12 col-sm-4">
          <q-select v-model="form.phase" :options="phaseOptions" label="Phase de vol" emit-value map-options clearable />
        </div>
        <div class="col-12 col-sm-4">
          <q-select v-model="form.flightType" :options="flightTypeOptions" label="Type de vol" emit-value map-options clearable />
        </div>
        <div class="col-12 col-sm-4">
          <q-select v-model="form.gravity" :options="gravityOptions" label="Gravité ressentie" emit-value map-options clearable />
        </div>
      </div>

      <!-- Photos (facultatif) : compressées côté navigateur, envoyées avec le REX -->
      <div class="text-subtitle2 text-grey-8 q-mb-sm">Photos (facultatif) — {{ images.length }}/{{ MAX_IMAGES }}</div>
      <!-- Le champ ne retient pas la sélection (vidé après chaque ajout) : pas de
           `clearable` (les vignettes se suppriment par leur croix) ni de `append`
           (le cumul est géré manuellement dans `images`). -->
      <q-file
        ref="photosAnchor"
        v-model="pickedFiles"
        label="Ajouter des photos"
        accept="image/*"
        multiple
        :disable="images.length >= MAX_IMAGES || compressing"
        :loading="compressing"
        class="q-mb-sm"
        @update:model-value="onPickFiles"
      >
        <template #prepend>
          <q-icon name="add_a_photo" />
        </template>
      </q-file>

      <div v-if="images.length" class="row q-col-gutter-sm q-mb-sm">
        <div v-for="(img, idx) in images" :key="idx" class="col-4 col-sm-3">
          <q-img :src="img.dataUrl" :ratio="1" class="rounded-borders thumb-bordered">
            <q-btn
              round
              dense
              size="sm"
              color="negative"
              icon="close"
              class="absolute-top-right q-ma-xs"
              @click="removeImage(idx)"
            />
          </q-img>
        </div>
      </div>

      <div v-if="images.length" class="text-caption text-grey-7 flex items-center q-mb-md">
        <q-icon name="info" size="xs" class="q-mr-xs" />
        Les photos ne sont pas conservées si vous rechargez la page — à re-sélectionner avant l'envoi.
      </div>

      <q-separator class="q-my-md" />

      <div class="text-subtitle2 text-grey-8 q-mb-sm">Coordonnées (facultatif)</div>

      <div class="row q-col-gutter-md q-mb-md">
        <div class="col-12 col-sm-6">
          <q-input v-model="form.reporterName" label="Votre nom" />
        </div>
        <div class="col-12 col-sm-6">
          <q-input v-model="form.contact" label="Contact (tél. / autre)" />
        </div>
      </div>

      <q-checkbox v-model="wantsCopy" label="Recevoir une copie de ma soumission par e-mail" class="q-mb-sm" />
      <q-input
        v-if="wantsCopy"
        v-model="form.reporterEmail"
        type="email"
        label="Votre e-mail"
        :rules="[(v) => !v || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v) || 'E-mail invalide']"
        class="q-mb-md"
      />

      <q-banner v-if="error" dense class="bg-red-1 text-red-9 rounded-borders q-mb-md">
        <template #avatar>
          <q-icon name="error" color="red-9" />
        </template>
        {{ error }}
      </q-banner>

      <div class="row items-center q-gutter-sm q-mt-md">
        <q-btn
          type="submit"
          unelevated
          no-caps
          color="primary"
          icon="send"
          label="Envoyer au CPS"
          :loading="submitting"
        />
        <q-btn
          flat
          no-caps
          color="grey-8"
          icon="delete_outline"
          label="Effacer"
          :disable="submitting"
          @click="onClear"
        />
      </div>

      <!-- Honeypot anti-bot : caché, jamais rempli par un humain -->
      <input v-model="honeypot" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true" style="position: absolute; left: -9999px; opacity: 0; height: 0" />
    </q-form>

    <div class="text-caption text-grey-7 flex items-center q-mt-md">
      <q-icon name="save" size="xs" class="q-mr-xs" />
      Brouillon enregistré automatiquement sur cet appareil
      <span v-if="draftSavedAt">&nbsp;— {{ draftSavedLabel }}</span>
    </div>
  </SectionCard>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { Dialog, Notify } from 'quasar'
import { useRexSubmitStore } from '../../stores/rexSubmitStore'
import { useAircraftStore } from '../../stores/aircraftStore'
import { compressImages } from '../../composables/useImageCompressor'
import { formatDate } from '../../utils/dateHelpers'
import SectionCard from '../common/SectionCard.vue'

// Envoi réussi : la page conteneur bascule sur l'onglet Synthèse.
const emit = defineEmits(['submitted'])

const rexSubmitStore = useRexSubmitStore()
const { form, images, pendingImagesLost, hadImagesCount, submitting, error, draftSavedAt } =
  storeToRefs(rexSubmitStore)

// ── Photos : sélection → compression navigateur → images du store ─────────────
// La limite serveur est de 5 photos ; on la reflète côté UI (au-delà : Notify + ignore).
const MAX_IMAGES = 5
const pickedFiles = ref(null)
const compressing = ref(false)
// Cible de scroll quand le pilote choisit de re-sélectionner ses photos perdues.
const photosAnchor = ref(null)

async function onPickFiles(files) {
  const list = Array.from(files ?? [])
  // q-file en `append` : on nettoie le modèle après chaque sélection pour repartir propre.
  pickedFiles.value = null
  if (!list.length) return

  const room = MAX_IMAGES - images.value.length
  if (room <= 0) {
    Notify.create({ type: 'warning', message: `Maximum ${MAX_IMAGES} photos.`, icon: 'info' })
    return
  }
  const toProcess = list.slice(0, room)
  if (list.length > room) {
    Notify.create({ type: 'warning', message: `Seules ${room} photo(s) ajoutée(s) (max ${MAX_IMAGES}).`, icon: 'info' })
  }

  compressing.value = true
  try {
    const compressed = await compressImages(toProcess, { maxDim: 2000, quality: 0.8 })
    images.value = [...images.value, ...compressed]
    const failed = toProcess.length - compressed.length
    if (failed > 0) {
      Notify.create({ type: 'negative', message: `${failed} photo(s) illisible(s), ignorée(s).`, icon: 'error' })
    }
  } finally {
    compressing.value = false
  }
}

function removeImage(idx) {
  images.value = images.value.filter((_, i) => i !== idx)
}

const aircraftStore = useAircraftStore()
const { aircraftList } = storeToRefs(aircraftStore)

const formRef = ref(null)
const honeypot = ref('')
const wantsCopy = ref(!!form.value.reporterEmail)

// Décocher « recevoir une copie » doit réellement annuler l'opt-in : le champ
// e-mail disparaît du DOM (v-if) et sa règle de validation avec lui, mais
// l'adresse resterait sinon dans le brouillon et partirait dans le POST.
watch(wantsCopy, (checked) => {
  if (!checked) form.value.reporterEmail = ''
})

// ── Options des sélecteurs (libellés = codes stables envoyés au serveur) ──────
const phaseOptions = [
  { value: 'sol', label: 'Au sol / roulage' },
  { value: 'decollage', label: 'Décollage' },
  { value: 'montee', label: 'Montée' },
  { value: 'croisiere', label: 'Croisière' },
  { value: 'tour-de-piste', label: 'Tour de piste' },
  { value: 'approche', label: 'Approche' },
  { value: 'atterrissage', label: 'Atterrissage' },
  { value: 'autre', label: 'Autre' },
]
const flightTypeOptions = [
  { value: 'solo', label: 'Solo' },
  { value: 'instruction', label: 'Instruction' },
  { value: 'navigation', label: 'Navigation' },
  { value: 'local', label: 'Local' },
  { value: 'tour-de-piste', label: 'Tour de piste' },
  { value: 'autre', label: 'Autre' },
]
const gravityOptions = [
  { value: 'aucune', label: 'Aucune conséquence' },
  { value: 'incident-leger', label: 'Incident léger' },
  { value: 'incident', label: 'Incident' },
  { value: 'presque-accident', label: 'Presque-accident' },
  { value: 'accident', label: 'Accident' },
]

// ── Sélecteur d'avion : dropdown simple (avions du club + « Autre ») ──────────
// Un q-select classique liste les immat du club + une option sentinelle « Autre »
// qui révèle un champ texte immat. form.aircraft reste une string (l'immat).
const OTHER = '__autre__'
const aircraftChoice = ref('')
const aircraftOptions = computed(() => [
  ...aircraftList.value.map((a) => ({
    value: a.registration,
    label: a.type ? `${a.registration} — ${a.type}` : a.registration,
  })),
  { value: OTHER, label: 'Autre (non listé)…' },
])
const isOtherAircraft = computed(() => aircraftChoice.value === OTHER)

// Sélection dans le dropdown : une immat connue alimente form.aircraft direct ;
// « Autre » vide form.aircraft pour laisser le champ texte le renseigner.
function onAircraftChoice(val) {
  form.value.aircraft = val === OTHER ? '' : val || ''
}

// Réconcilie le dropdown avec un brouillon restauré : si l'immat n'est pas dans
// la liste du club, on positionne le sélecteur sur « Autre » (champ texte visible).
function syncAircraftChoice() {
  const reg = form.value.aircraft
  if (!reg) {
    aircraftChoice.value = ''
    return
  }
  const known = aircraftList.value.some((a) => a.registration === reg)
  aircraftChoice.value = known ? reg : OTHER
}

const draftSavedLabel = computed(() => formatDate(draftSavedAt.value))

// Réinitialise l'état d'UI local. Le brouillon du store est géré séparément :
// submit() le vide après un envoi confirmé, onClear appelle resetDraft().
function resetLocalUi() {
  wantsCopy.value = false
  pickedFiles.value = null
  syncAircraftChoice()
  formRef.value?.resetValidation()
}

async function onSubmit() {
  // Honeypot rempli => on ne fait rien (bot). Silencieux volontairement.
  if (honeypot.value) return

  // Garde-fou anti-oubli : le brouillon indiquait des photos, mais aucune n'est chargée
  // (typiquement perdues à un rechargement de page). On confirme avant d'envoyer un REX
  // amputé de ses photos, pour que le pilote ait la chance de les re-sélectionner.
  if (pendingImagesLost.value) {
    const n = hadImagesCount.value
    Dialog.create({
      title: 'Photos non conservées',
      message:
        `Vous aviez ajouté ${n} photo${n > 1 ? 's' : ''} à ce REX, mais elle${n > 1 ? 's' : ''} ` +
        `n'${n > 1 ? 'ont' : 'a'} pas été conservée${n > 1 ? 's' : ''} après le rechargement de la page. ` +
        `Voulez-vous les re-sélectionner avant d'envoyer ?`,
      cancel: { label: 'Envoyer sans photos', flat: true, color: 'grey-8', noCaps: true },
      ok: { label: 'Ajouter des photos', unelevated: true, color: 'primary', noCaps: true },
      persistent: true,
    })
      .onOk(() => {
        // Le pilote veut corriger : on n'envoie pas, on le ramène au champ photos.
        pickedFiles.value = null
        photosAnchor.value?.$el?.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
      })
      .onCancel(() => {
        // Choix assumé d'envoyer sans photos.
        doSubmit()
      })
    return
  }

  doSubmit()
}

async function doSubmit() {
  const ok = await rexSubmitStore.submit()
  if (ok) {
    Notify.create({ type: 'positive', message: 'REX transmis au CPS. Merci !', icon: 'check' })
    resetLocalUi()
    emit('submitted')
  } else {
    Notify.create({
      type: 'negative',
      message: error.value || "L'envoi a échoué. Vos données sont conservées.",
      icon: 'error',
    })
  }
}

function onClear() {
  rexSubmitStore.resetDraft()
  resetLocalUi()
}

onMounted(async () => {
  await aircraftStore.loadAircrafts()
  // Aligne le sélecteur sur le brouillon restauré une fois la liste connue.
  syncAircraftChoice()
})
</script>

<style scoped>
/* Vignette de photo : fine bordure neutre (charte : pas de style inline couleur). */
.thumb-bordered {
  border: 1px solid rgba(0, 0, 0, 0.12);
}
</style>
