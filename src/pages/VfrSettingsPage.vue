<template>
  <q-page class="q-pa-md">
    <div class="q-mt-lg q-mb-xl text-center">
      <div class="text-h3 text-white text-weight-bold">Seuils VFR</div>
      <div class="text-subtitle2 text-white q-mt-xs">
        Personnalisez les seuils de colorisation des paramètres météo
      </div>
    </div>

    <q-card flat bordered class="q-pa-md q-mb-lg">
      <div class="text-body2 text-grey-8 q-mb-md">
        Ces seuils déterminent la colorisation des cartes météo sur la page Météo AI. Les valeurs
        par défaut sont basées sur les standards OACI pour le VFR.
      </div>

      <!-- Visibilité -->
      <div class="q-mb-lg">
        <div class="text-subtitle1 text-weight-bold q-mb-sm flex items-center">
          <q-icon name="visibility" size="sm" class="q-mr-sm text-primary" />
          Visibilité (mètres)
        </div>
        <div class="row q-col-gutter-md q-mb-sm">
          <div class="col-6">
            <q-input
              v-model.number="thresholds.visibility.good"
              type="number"
              label="Seuil VFR (vert → orange)"
              outlined
              dense
              :rules="[
                (val) => val > 0 || 'Doit être positif',
                (val) => val > thresholds.visibility.marginal || 'Doit être > seuil marginal',
              ]"
              suffix="m"
              @update:model-value="saveThresholds"
            />
          </div>
          <div class="col-6">
            <q-input
              v-model.number="thresholds.visibility.marginal"
              type="number"
              label="Seuil marginal (orange → rouge)"
              outlined
              dense
              :rules="[
                (val) => val > 0 || 'Doit être positif',
                (val) => val < thresholds.visibility.good || 'Doit être < seuil VFR',
              ]"
              suffix="m"
              @update:model-value="saveThresholds"
            />
          </div>
        </div>
        <div class="row q-col-gutter-sm">
          <div class="col-4">
            <q-card flat bordered class="q-pa-xs bg-green-1 text-center">
              <div class="text-caption text-green-9 text-weight-bold">VFR</div>
              <div class="text-caption text-green-8">≥ {{ thresholds.visibility.good }} m</div>
            </q-card>
          </div>
          <div class="col-4">
            <q-card flat bordered class="q-pa-xs bg-orange-1 text-center">
              <div class="text-caption text-orange-9 text-weight-bold">Marginal</div>
              <div class="text-caption text-orange-8">≥ {{ thresholds.visibility.marginal }} m</div>
            </q-card>
          </div>
          <div class="col-4">
            <q-card flat bordered class="q-pa-xs bg-red-1 text-center">
              <div class="text-caption text-red-9 text-weight-bold">Défavorable</div>
              <div class="text-caption text-red-8">&lt; {{ thresholds.visibility.marginal }} m</div>
            </q-card>
          </div>
        </div>
      </div>

      <q-separator class="q-my-md" />

      <!-- Plafond -->
      <div class="q-mb-lg">
        <div class="text-subtitle1 text-weight-bold q-mb-sm flex items-center">
          <q-icon name="cloud" size="sm" class="q-mr-sm text-primary" />
          Plafond (pieds)
        </div>
        <div class="row q-col-gutter-md q-mb-sm">
          <div class="col-6">
            <q-input
              v-model.number="thresholds.ceiling.good"
              type="number"
              label="Seuil VFR (vert → orange)"
              outlined
              dense
              :rules="[
                (val) => val > 0 || 'Doit être positif',
                (val) => val > thresholds.ceiling.marginal || 'Doit être > seuil marginal',
              ]"
              suffix="ft"
              @update:model-value="saveThresholds"
            />
          </div>
          <div class="col-6">
            <q-input
              v-model.number="thresholds.ceiling.marginal"
              type="number"
              label="Seuil marginal (orange → rouge)"
              outlined
              dense
              :rules="[
                (val) => val > 0 || 'Doit être positif',
                (val) => val < thresholds.ceiling.good || 'Doit être < seuil VFR',
              ]"
              suffix="ft"
              @update:model-value="saveThresholds"
            />
          </div>
        </div>
        <div class="row q-col-gutter-sm">
          <div class="col-4">
            <q-card flat bordered class="q-pa-xs bg-green-1 text-center">
              <div class="text-caption text-green-9 text-weight-bold">VFR</div>
              <div class="text-caption text-green-8">≥ {{ thresholds.ceiling.good }} ft</div>
            </q-card>
          </div>
          <div class="col-4">
            <q-card flat bordered class="q-pa-xs bg-orange-1 text-center">
              <div class="text-caption text-orange-9 text-weight-bold">Marginal</div>
              <div class="text-caption text-orange-8">≥ {{ thresholds.ceiling.marginal }} ft</div>
            </q-card>
          </div>
          <div class="col-4">
            <q-card flat bordered class="q-pa-xs bg-red-1 text-center">
              <div class="text-caption text-red-9 text-weight-bold">Défavorable</div>
              <div class="text-caption text-red-8">&lt; {{ thresholds.ceiling.marginal }} ft</div>
            </q-card>
          </div>
        </div>
      </div>

      <q-separator class="q-my-md" />

      <!-- Vent -->
      <div class="q-mb-lg">
        <div class="text-subtitle1 text-weight-bold q-mb-sm flex items-center">
          <q-icon name="air" size="sm" class="q-mr-sm text-primary" />
          Vent (nœuds)
        </div>
        <div class="row q-col-gutter-md q-mb-sm">
          <div class="col-6">
            <q-input
              v-model.number="thresholds.wind.good"
              type="number"
              label="Seuil VFR (vert → orange)"
              outlined
              dense
              :rules="[
                (val) => val > 0 || 'Doit être positif',
                (val) => val < thresholds.wind.marginal || 'Doit être < seuil marginal',
              ]"
              suffix="kts"
              @update:model-value="saveThresholds"
            />
          </div>
          <div class="col-6">
            <q-input
              v-model.number="thresholds.wind.marginal"
              type="number"
              label="Seuil marginal (orange → rouge)"
              outlined
              dense
              :rules="[
                (val) => val > 0 || 'Doit être positif',
                (val) => val > thresholds.wind.good || 'Doit être > seuil VFR',
              ]"
              suffix="kts"
              @update:model-value="saveThresholds"
            />
          </div>
        </div>
        <div class="row q-col-gutter-sm">
          <div class="col-4">
            <q-card flat bordered class="q-pa-xs bg-green-1 text-center">
              <div class="text-caption text-green-9 text-weight-bold">VFR</div>
              <div class="text-caption text-green-8">≤ {{ thresholds.wind.good }} kts</div>
            </q-card>
          </div>
          <div class="col-4">
            <q-card flat bordered class="q-pa-xs bg-orange-1 text-center">
              <div class="text-caption text-orange-9 text-weight-bold">Marginal</div>
              <div class="text-caption text-orange-8">≤ {{ thresholds.wind.marginal }} kts</div>
            </q-card>
          </div>
          <div class="col-4">
            <q-card flat bordered class="q-pa-xs bg-red-1 text-center">
              <div class="text-caption text-red-9 text-weight-bold">Défavorable</div>
              <div class="text-caption text-red-8">&gt; {{ thresholds.wind.marginal }} kts</div>
            </q-card>
          </div>
        </div>
      </div>

      <q-separator class="q-my-md" />

      <!-- Rafales -->
      <div class="q-mb-lg">
        <div class="text-subtitle1 text-weight-bold q-mb-sm flex items-center">
          <q-icon name="storm" size="sm" class="q-mr-sm text-primary" />
          Rafales (nœuds)
        </div>
        <div class="row q-col-gutter-md q-mb-sm">
          <div class="col-6">
            <q-input
              v-model.number="thresholds.gust.good"
              type="number"
              label="Seuil VFR (vert → orange)"
              outlined
              dense
              :rules="[
                (val) => val > 0 || 'Doit être positif',
                (val) => val < thresholds.gust.marginal || 'Doit être < seuil marginal',
              ]"
              suffix="kts"
              @update:model-value="saveThresholds"
            />
          </div>
          <div class="col-6">
            <q-input
              v-model.number="thresholds.gust.marginal"
              type="number"
              label="Seuil marginal (orange → rouge)"
              outlined
              dense
              :rules="[
                (val) => val > 0 || 'Doit être positif',
                (val) => val > thresholds.gust.good || 'Doit être > seuil VFR',
              ]"
              suffix="kts"
              @update:model-value="saveThresholds"
            />
          </div>
        </div>
        <div class="row q-col-gutter-sm">
          <div class="col-4">
            <q-card flat bordered class="q-pa-xs bg-green-1 text-center">
              <div class="text-caption text-green-9 text-weight-bold">VFR</div>
              <div class="text-caption text-green-8">≤ {{ thresholds.gust.good }} kts</div>
            </q-card>
          </div>
          <div class="col-4">
            <q-card flat bordered class="q-pa-xs bg-orange-1 text-center">
              <div class="text-caption text-orange-9 text-weight-bold">Marginal</div>
              <div class="text-caption text-orange-8">≤ {{ thresholds.gust.marginal }} kts</div>
            </q-card>
          </div>
          <div class="col-4">
            <q-card flat bordered class="q-pa-xs bg-red-1 text-center">
              <div class="text-caption text-red-9 text-weight-bold">Défavorable</div>
              <div class="text-caption text-red-8">&gt; {{ thresholds.gust.marginal }} kts</div>
            </q-card>
          </div>
        </div>
      </div>

      <q-separator class="q-my-md" />

      <!-- Vent traversier -->
      <div class="q-mb-lg">
        <div class="text-subtitle1 text-weight-bold q-mb-sm flex items-center">
          <q-icon name="flight_takeoff" size="sm" class="q-mr-sm text-primary" />
          Vent traversier (nœuds)
        </div>
        <div class="row q-col-gutter-md q-mb-sm">
          <div class="col-6">
            <q-input
              v-model.number="thresholds.crosswind.good"
              type="number"
              label="Seuil attention (vert → orange)"
              outlined
              dense
              :rules="[
                (val) => val > 0 || 'Doit être positif',
                (val) => val < thresholds.crosswind.marginal || 'Doit être < seuil critique',
              ]"
              suffix="kts"
              @update:model-value="saveThresholds"
            />
          </div>
          <div class="col-6">
            <q-input
              v-model.number="thresholds.crosswind.marginal"
              type="number"
              label="Seuil critique (orange → rouge)"
              outlined
              dense
              :rules="[
                (val) => val > 0 || 'Doit être positif',
                (val) => val > thresholds.crosswind.good || 'Doit être > seuil attention',
              ]"
              suffix="kts"
              @update:model-value="saveThresholds"
            />
          </div>
        </div>
        <div class="row q-col-gutter-sm">
          <div class="col-4">
            <q-card flat bordered class="q-pa-xs bg-green-1 text-center">
              <div class="text-caption text-green-9 text-weight-bold">Normal</div>
              <div class="text-caption text-green-8">≤ {{ thresholds.crosswind.good }} kts</div>
            </q-card>
          </div>
          <div class="col-4">
            <q-card flat bordered class="q-pa-xs bg-orange-1 text-center">
              <div class="text-caption text-orange-9 text-weight-bold">Attention</div>
              <div class="text-caption text-orange-8">
                ≤ {{ thresholds.crosswind.marginal }} kts
              </div>
            </q-card>
          </div>
          <div class="col-4">
            <q-card flat bordered class="q-pa-xs bg-red-1 text-center">
              <div class="text-caption text-red-9 text-weight-bold">Critique</div>
              <div class="text-caption text-red-8">
                &gt; {{ thresholds.crosswind.marginal }} kts
              </div>
            </q-card>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex justify-end q-mt-md">
        <q-btn
          outline
          size="sm"
          color="negative"
          icon="restart_alt"
          label="Restaurer les valeurs par défaut"
          @click="confirmReset"
        />
      </div>
    </q-card>
  </q-page>
</template>

<script setup>
import { useQuasar } from 'quasar'
import { useVfrThresholds } from '../composables/useVfrThresholds'

const $q = useQuasar()
const { thresholds, saveThresholds, resetToDefaults } = useVfrThresholds()

function confirmReset() {
  $q.dialog({
    title: 'Restaurer les valeurs par défaut',
    message: 'Tous les seuils VFR seront remis aux valeurs OACI standards. Continuer ?',
    cancel: { label: 'Annuler', flat: true },
    ok: { label: 'Restaurer', color: 'negative' },
    persistent: true,
  }).onOk(() => {
    resetToDefaults()
    $q.notify({
      type: 'positive',
      message: 'Seuils VFR restaurés aux valeurs par défaut',
      timeout: 2000,
    })
  })
}
</script>
