<template>
  <q-card class="q-mb-md">
    <q-card-section>
      <div class="text-h6 flex items-center justify-between">
        <div class="flex items-center">
          <q-icon name="dns" class="q-mr-sm" />
          Navigateur localStorage
        </div>
        <q-btn
          outline
          size="sm"
          icon="refresh"
          color="primary"
          label="Actualiser"
          @click="refreshData"
        />
      </div>
      <div class="text-caption text-grey-7 q-mt-xs">
        {{ entries.length }} clé{{ entries.length > 1 ? 's' : '' }} • {{ totalSizeKB }} KB
      </div>
    </q-card-section>

    <q-separator />

    <!-- Filtre de recherche -->
    <q-card-section class="q-py-sm">
      <q-input
        v-model="searchFilter"
        dense
        outlined
        placeholder="Filtrer par clé..."
        clearable
        class="q-mb-sm"
      >
        <template #prepend>
          <q-icon name="search" />
        </template>
      </q-input>
    </q-card-section>

    <q-separator />

    <!-- Liste des entrées -->
    <q-list separator>
      <q-expansion-item
        v-for="entry in filteredEntries"
        :key="entry.key"
        dense-toggle
        expand-separator
        :header-class="entry.isJson ? 'bg-blue-1' : 'bg-grey-1'"
      >
        <template #header>
          <q-item-section avatar>
            <q-icon
              :name="entry.isJson ? 'data_object' : 'text_snippet'"
              :color="entry.isJson ? 'primary' : 'grey-7'"
              size="sm"
            />
          </q-item-section>
          <q-item-section>
            <q-item-label class="text-weight-medium" style="word-break: break-all">
              {{ entry.key }}
            </q-item-label>
            <q-item-label caption>
              {{ entry.sizeLabel }} •
              {{ entry.isJson ? 'JSON' : 'Texte' }}
              <template v-if="entry.isJson && entry.itemCount !== null">
                • {{ entry.itemCount }} entrée{{ entry.itemCount > 1 ? 's' : '' }}
              </template>
            </q-item-label>
          </q-item-section>
          <q-item-section side>
            <div class="row q-gutter-xs">
              <q-btn
                flat
                round
                dense
                icon="content_copy"
                size="sm"
                color="primary"
                @click.stop="copyValue(entry)"
              >
                <q-tooltip>Copier la valeur</q-tooltip>
              </q-btn>
              <q-btn
                flat
                round
                dense
                icon="delete"
                size="sm"
                color="negative"
                @click.stop="confirmDelete(entry.key)"
              >
                <q-tooltip>Supprimer</q-tooltip>
              </q-btn>
            </div>
          </q-item-section>
        </template>

        <!-- Contenu expansé -->
        <q-card>
          <q-card-section class="q-pa-sm">
            <!-- JSON viewer pour les objets/tableaux -->
            <template v-if="entry.isJson">
              <!-- Affichage spécial pour les Sets de NOTAMs (hidden/seen) -->
              <template v-if="entry.isNotamSet">
                <div class="text-caption text-grey-7 q-mb-sm">
                  {{ entry.validCount }} valide{{ entry.validCount > 1 ? 's' : '' }} /
                  {{ entry.expiredCount }} expiré{{ entry.expiredCount > 1 ? 's' : '' }}
                </div>
                <q-markup-table dense flat bordered separator="cell" class="text-caption">
                  <thead>
                    <tr class="bg-grey-2">
                      <th class="text-left">ID NOTAM</th>
                      <th class="text-left">Ajouté le</th>
                      <th class="text-left">Expire le</th>
                      <th class="text-center">État</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="item in entry.notamItems"
                      :key="item.id"
                      :class="item.isExpired ? 'bg-red-1 text-grey-6' : ''"
                    >
                      <td style="word-break: break-all">{{ item.id }}</td>
                      <td>{{ item.addedAt }}</td>
                      <td>{{ item.expiresAt }}</td>
                      <td class="text-center">
                        <q-badge
                          :color="
                            item.isPermanent ? 'accent' : item.isExpired ? 'negative' : 'positive'
                          "
                          :label="
                            item.isPermanent ? 'Permanent' : item.isExpired ? 'Expiré' : 'Actif'
                          "
                        />
                      </td>
                    </tr>
                  </tbody>
                </q-markup-table>
              </template>

              <!-- JSON générique -->
              <template v-else>
                <pre
                  class="json-viewer q-pa-sm bg-grey-1 rounded-borders text-caption"
                  style="
                    max-height: 400px;
                    overflow: auto;
                    white-space: pre-wrap;
                    word-break: break-all;
                  "
                  >{{ entry.formattedJson }}</pre
                >
              </template>
            </template>

            <!-- Texte brut -->
            <template v-else>
              <div
                class="q-pa-sm bg-grey-1 rounded-borders text-caption"
                style="max-height: 200px; overflow: auto; word-break: break-all"
              >
                {{ entry.rawValue }}
              </div>
            </template>
          </q-card-section>
        </q-card>
      </q-expansion-item>
    </q-list>

    <!-- Message si vide -->
    <q-card-section v-if="filteredEntries.length === 0" class="text-center text-grey-5">
      {{ searchFilter ? 'Aucune clé correspondante' : 'localStorage vide' }}
    </q-card-section>
  </q-card>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { STORAGE_KEYS } from '../../config/constants'
import { storageKey } from '../../config/storageKeys'

// Préfixe des clés appartenant à l'application (`storageKey('')` → « prefixe-»)
const APP_KEY_PREFIX = storageKey('')

const $q = useQuasar()
const searchFilter = ref('')
const rawEntries = ref([])

// Clés connues pour les sets de NOTAMs (hidden/seen)
const NOTAM_SET_KEYS = new Set([STORAGE_KEYS.HIDDEN_NOTAMS, STORAGE_KEYS.SEEN_NOTAMS])

/**
 * Charge toutes les entrées du localStorage
 */
const loadEntries = () => {
  const result = []
  const now = new Date()

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    const rawValue = localStorage.getItem(key)
    const sizeBytes = (key.length + rawValue.length) * 2 // UTF-16

    let isJson = false
    let parsedValue = null
    let formattedJson = ''
    let itemCount = null
    let isNotamSet = false
    let notamItems = []
    let validCount = 0
    let expiredCount = 0

    try {
      parsedValue = JSON.parse(rawValue)
      isJson = true
      formattedJson = JSON.stringify(parsedValue, null, 2)

      // Compter les éléments si c'est un objet ou tableau
      if (Array.isArray(parsedValue)) {
        itemCount = parsedValue.length
      } else if (parsedValue && typeof parsedValue === 'object') {
        itemCount = Object.keys(parsedValue).length
      }

      // Détection spéciale pour les sets de NOTAMs
      if (NOTAM_SET_KEYS.has(key) && parsedValue && typeof parsedValue === 'object') {
        isNotamSet = true
        notamItems = Object.entries(parsedValue)
          .map(([id, data]) => {
            const isExpired = data.expiresAt ? new Date(data.expiresAt) <= now : false
            const isPermanent = !data.expiresAt
            if (isExpired) expiredCount++
            else validCount++
            return {
              id,
              addedAt: data.addedAt
                ? new Date(data.addedAt).toLocaleString('fr-FR', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })
                : '?',
              expiresAt: data.expiresAt
                ? new Date(data.expiresAt).toLocaleString('fr-FR', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })
                : 'Permanent',
              isExpired,
              isPermanent,
            }
          })
          .sort((a, b) => (a.isExpired === b.isExpired ? 0 : a.isExpired ? 1 : -1))
      }
    } catch {
      // Pas du JSON valide
    }

    result.push({
      key,
      rawValue,
      sizeBytes,
      sizeLabel: sizeBytes > 1024 ? `${(sizeBytes / 1024).toFixed(1)} KB` : `${sizeBytes} B`,
      isJson,
      parsedValue,
      formattedJson,
      itemCount,
      isNotamSet,
      notamItems,
      validCount,
      expiredCount,
    })
  }

  // Trier : clés de l'application (préfixe club) en premier, puis alphabétique
  result.sort((a, b) => {
    const aIsApp = a.key.startsWith(APP_KEY_PREFIX)
    const bIsApp = b.key.startsWith(APP_KEY_PREFIX)
    if (aIsApp && !bIsApp) return -1
    if (!aIsApp && bIsApp) return 1
    return a.key.localeCompare(b.key)
  })

  rawEntries.value = result
}

const entries = computed(() => rawEntries.value)

const filteredEntries = computed(() => {
  if (!searchFilter.value) return entries.value
  const filter = searchFilter.value.toLowerCase()
  return entries.value.filter((e) => e.key.toLowerCase().includes(filter))
})

const totalSizeKB = computed(() => {
  const total = entries.value.reduce((sum, e) => sum + e.sizeBytes, 0)
  return (total / 1024).toFixed(2)
})

const refreshData = () => {
  loadEntries()
  $q.notify({
    type: 'info',
    message: 'localStorage actualisé',
    icon: 'refresh',
    timeout: 1500,
  })
}

const copyValue = (entry) => {
  navigator.clipboard.writeText(entry.rawValue)
  $q.notify({
    type: 'positive',
    message: `Valeur de "${entry.key}" copiée`,
    icon: 'content_copy',
    timeout: 1500,
  })
}

const confirmDelete = (key) => {
  $q.dialog({
    title: "Supprimer l'entrée",
    message: `Supprimer la clé "${key}" du localStorage ?`,
    cancel: { label: 'Annuler', color: 'grey', flat: true },
    ok: { label: 'Supprimer', color: 'negative' },
    persistent: true,
  }).onOk(() => {
    localStorage.removeItem(key)
    loadEntries()
    $q.notify({
      type: 'positive',
      message: `"${key}" supprimé`,
      icon: 'delete',
      timeout: 2000,
    })
  })
}

onMounted(() => {
  loadEntries()
})

defineExpose({ refreshData })
</script>
