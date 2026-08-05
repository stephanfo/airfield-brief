<template>
  <q-card flat bordered class="rex-card q-mb-sm" :class="highlight ? 'bg-blue-1' : ''">
    <q-card-section>
      <div class="row items-center q-gutter-xs q-mb-sm">
        <q-badge
          :color="typeColor(rex.type)"
          :label="rex.type || 'Inconnu'"
          text-color="white"
          rounded
        />
        <q-badge
          v-if="rex.eventKind"
          color="primary"
          :label="rex.eventKind"
          text-color="white"
          rounded
        />
        <q-badge
          v-if="isDeclaredByClub(rex)"
          color="accent"
          text-color="white"
          label="Club"
          icon="groups"
          rounded
        >
          <q-tooltip>REX déclaré par le club (quel que soit le lieu)</q-tooltip>
        </q-badge>
        <q-badge
          v-if="isAtClubField(rex)"
          color="accent"
          text-color="white"
          :label="CLUB_CONFIG.airfield.icao"
          icon="home"
          rounded
        >
          <q-tooltip>
            Évènement survenu sur le terrain de {{ CLUB_CONFIG.airfield.icao }}
          </q-tooltip>
        </q-badge>
        <q-badge
          :color="riskColor(rex.initialRisk)"
          :label="riskLabel(rex.initialRisk)"
          text-color="white"
          rounded
        />
        <q-space />
        <div class="text-caption text-grey-7">
          #{{ rex.id }} · {{ formatDateOnly(rex.eventDate) }}
        </div>
        <q-btn
          flat
          round
          dense
          size="sm"
          icon="link"
          color="grey-7"
          :aria-label="`Copier le lien vers le REX #${rex.id}`"
          @click="copyLink"
        >
          <q-tooltip>Copier le lien</q-tooltip>
        </q-btn>
      </div>

      <div class="text-subtitle1 text-weight-bold">{{ rex.title }}</div>

      <div class="text-caption text-grey-7 q-mt-xs">
        <span v-if="rex.place">{{ rex.place }}</span>
        <span v-if="rex.flightPhase"> · {{ rex.flightPhase }}</span>
        <span v-if="rex.flightRegime"> · {{ rex.flightRegime }}</span>
        <span v-if="rex.aircraftType"> · {{ rex.aircraftType }}</span>
      </div>

      <div class="text-body2 q-mt-sm rex-prewrap">
        {{ rex.eventSummary || rex.description }}
      </div>

      <q-expansion-item v-if="hasDetails" dense expand-separator label="Détails" class="q-mt-sm">
        <div v-if="rex.causes?.length" class="q-mt-md">
          <div class="rex-section-title text-orange-9 flex items-center">
            <q-icon name="report" size="xs" class="q-mr-xs" />
            Causes
          </div>
          <div
            v-for="(cause, idx) in sortedCauses"
            :key="idx"
            class="text-body2 rex-section-body flex no-wrap items-start q-mt-xs"
          >
            <q-icon name="chevron_right" size="xs" class="q-mr-xs q-mt-xs text-grey-6" />
            <div>
              <q-badge
                v-if="isMainCause(cause)"
                color="warning"
                text-color="white"
                label="Cause principale"
                class="q-mr-xs"
                rounded
              />
              <span :class="isMainCause(cause) ? 'text-weight-bold' : ''">{{ cause.title }}</span>
              <span v-if="cause.description"> — {{ cause.description }}</span>
            </div>
          </div>
        </div>

        <div v-if="rex.actions?.length" class="q-mt-md">
          <div class="rex-section-title text-blue-9 flex items-center">
            <q-icon name="build" size="xs" class="q-mr-xs" />
            Actions correctrices
          </div>
          <div
            v-for="(action, idx) in rex.actions"
            :key="idx"
            class="text-body2 rex-section-body flex no-wrap items-start q-mt-xs"
          >
            <q-icon name="chevron_right" size="xs" class="q-mr-xs q-mt-xs text-grey-6" />
            <div>{{ action.description }}</div>
          </div>
        </div>

        <div v-if="rex.safetyEducation" class="q-mt-md">
          <div class="rex-section-title text-green-9 flex items-center">
            <q-icon name="lightbulb" size="xs" class="q-mr-xs" />
            Enseignement
          </div>
          <div class="text-body2 rex-section-body rex-prewrap q-mt-xs">
            {{ rex.safetyEducation }}
          </div>
        </div>

        <div v-if="rex.images?.length" class="q-mt-md">
          <div class="rex-section-title text-purple-9 flex items-center">
            <q-icon name="photo_camera" size="xs" class="q-mr-xs" />
            {{ rex.images.length > 1 ? 'Photos' : 'Photo' }}
          </div>
          <div class="rex-section-body q-mt-xs row q-gutter-sm">
            <q-btn
              v-for="(img, idx) in rex.images"
              :key="img.id ?? idx"
              outline
              no-caps
              color="primary"
              icon="image"
              size="sm"
              :href="img.url"
              target="_blank"
              rel="noopener noreferrer"
              :label="rex.images.length > 1 ? `Photo ${idx + 1}` : 'Voir la photo'"
              :aria-label="`Ouvrir la photo du REX #${rex.id} sur la plateforme FFA`"
            >
              <q-tooltip>Ouvre la photo (plateforme FFA, nouvel onglet)</q-tooltip>
            </q-btn>
          </div>
        </div>

        <div v-if="rex.residualRisk" class="q-mt-md">
          <div class="rex-section-title text-grey-8 flex items-center">
            <q-icon name="trending_down" size="xs" class="q-mr-xs" />
            Risque après actions correctrices
          </div>
          <div class="q-mt-xs rex-section-body flex items-center">
            <q-badge
              :color="riskColor(rex.initialRisk)"
              :label="riskLabel(rex.initialRisk)"
              text-color="white"
              rounded
            />
            <q-icon name="arrow_forward" size="xs" class="q-mx-sm text-grey-7" />
            <q-badge
              :color="riskColor(rex.residualRisk)"
              :label="riskLabel(rex.residualRisk)"
              text-color="white"
              rounded
            />
          </div>
        </div>
      </q-expansion-item>
    </q-card-section>
  </q-card>
</template>

<script setup>
import { computed } from 'vue'
import { useQuasar } from 'quasar'
import { useRouter } from 'vue-router'
import { formatDateOnly } from '../../utils/dateHelpers'
import { CLUB_CONFIG } from '../../config/club.config'
import {
  typeColor,
  riskColor,
  riskLabel,
  isDeclaredByClub,
  isAtClubField,
  isMainCause,
  sortCausesMainFirst,
} from '../../utils/rexHelpers'

const props = defineProps({
  rex: {
    type: Object,
    required: true,
  },
  /** Met la carte en évidence (ex: ciblée depuis une citation de la synthèse) */
  highlight: {
    type: Boolean,
    default: false,
  },
})

const $q = useQuasar()
const router = useRouter()

// Lien partageable direct vers ce REX : même comportement à l'ouverture que
// le clic sur une citation {id} depuis la synthèse (cf. RexFfaPage.vue).
const copyLink = async () => {
  const { href } = router.resolve({ path: '/rex-ffa', query: { tab: 'rex', rexId: props.rex.id } })

  // `href` est un chemin SANS origine ("/rex-ffa?…", publicPath compris en
  // mode history — ADR-009 amendée). On le résout contre l'URL courante pour
  // obtenir l'URL absolue, correct à la racine comme en sous-répertoire.
  const url = new URL(href, window.location.href).toString()

  try {
    await navigator.clipboard.writeText(url)
    $q.notify({
      type: 'positive',
      message: 'Lien copié dans le presse-papier',
      icon: 'link',
      timeout: 2000,
    })
  } catch {
    $q.notify({ type: 'negative', message: 'Impossible de copier le lien', timeout: 2000 })
  }
}

const hasDetails = computed(
  () =>
    props.rex.causes?.length ||
    props.rex.actions?.length ||
    props.rex.safetyEducation ||
    props.rex.residualRisk ||
    props.rex.images?.length,
)

/** Causes triées cause(s) principale(s) en premier (mise en avant). */
const sortedCauses = computed(() => sortCausesMainFirst(props.rex.causes))
</script>

<style scoped>
/* Adoucit l'apparition/disparition du surlignage de citation (bg-blue-1) */
.rex-card {
  transition: background-color 0.6s ease;
  /* Cible d'un scroll (citation {id} ou lien ?rexId=) : laisse la carte
     s'arrêter SOUS le header fixe, comme .rex-list-top dans RexListTab. */
  scroll-margin-top: 70px;
}

/* Titre de sous-section (Causes / Actions / Enseignement) : différencié par
   icône + couleur sémantique, sans surcharger la carte. */
.rex-section-title {
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

/* Corps de section légèrement en retrait, aligné sous le texte du titre. */
.rex-section-body {
  padding-left: 4px;
}

/* Respecte les sauts de ligne d'origine des textes narratifs (résumé,
   enseignement) sans introduire de scroll horizontal. */
.rex-prewrap {
  white-space: pre-line;
}
</style>
