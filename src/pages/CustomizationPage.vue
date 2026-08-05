<template>
  <q-page class="q-pa-md">
    <!-- Titre -->
    <div class="q-mt-lg q-mb-xl text-center">
      <div class="text-h3 text-white text-weight-bold">Personnalisation du Menu</div>
      <div class="text-subtitle2 text-white q-mt-xs">
        Choisissez les icônes à afficher dans la barre de navigation
      </div>
    </div>

    <!-- Message d'avertissement si aucun item -->
    <q-banner v-if="!isBottomMenuVisible" dense class="bg-warning text-dark q-mb-lg" rounded>
      <div class="row items-center">
        <q-icon name="warning" size="24px" class="q-mr-sm" />
        <div>
          Aucun élément sélectionné. La barre de navigation sera masquée. Vous pouvez toujours
          accéder à cette page via le menu latéral.
        </div>
      </div>
    </q-banner>

    <!-- Liste des items avec checkboxes -->
    <q-card flat bordered>
      <q-card-section>
        <div class="row items-center justify-between q-mb-md">
          <div class="text-h6 text-weight-bold text-primary">
            <q-icon name="tune" size="md" class="q-mr-sm" />
            Éléments du menu
          </div>

          <!-- Boutons d'action -->
          <div class="row q-gutter-xs">
            <q-btn
              size="sm"
              outline
              color="primary"
              icon="visibility"
              label="Tout afficher"
              @click="customizationStore.showAll()"
            />
            <q-btn
              size="sm"
              outline
              color="primary"
              icon="visibility_off"
              label="Tout masquer"
              @click="customizationStore.hideAll()"
            />
            <q-btn
              size="sm"
              color="secondary"
              icon="restore"
              label="Réinitialiser"
              @click="customizationStore.reset()"
            />
          </div>
        </div>

        <div class="text-caption text-grey-7 q-mb-md">
          <q-icon name="info" size="xs" class="q-mr-xs" />
          Glissez-déposez pour réorganiser les éléments
        </div>

        <q-list separator ref="listElement">
          <q-item
            v-for="item in orderedMenuItems"
            :key="item.id"
            class="draggable-item"
            :class="{ 'sub-item': item.parentId }"
          >
            <q-item-section avatar>
              <q-icon name="drag_indicator" color="grey-6" class="cursor-move" />
            </q-item-section>

            <q-item-section v-if="item.parentId" avatar class="sub-item-branch">
              <q-icon name="subdirectory_arrow_right" color="grey-5" size="sm" />
            </q-item-section>

            <q-item-section avatar>
              <q-checkbox
                :model-value="item.visible"
                @update:model-value="(val) => customizationStore.setItemVisibility(item.id, val)"
                color="primary"
                @click.stop
              />
            </q-item-section>

            <q-item-section avatar>
              <q-icon :name="item.icon" :color="item.visible ? 'primary' : 'grey'" />
            </q-item-section>

            <q-item-section>
              <q-item-label>{{ item.label }}</q-item-label>
              <q-item-label caption>{{ item.isExternal ? item.href : item.route }}</q-item-label>
            </q-item-section>

            <q-item-section side class="gt-xs">
              <q-chip
                v-if="item.parentId"
                size="sm"
                color="grey-6"
                text-color="white"
                dense
                icon="subdirectory_arrow_right"
              >
                Sous-menu
              </q-chip>
              <q-chip
                v-else-if="item.isExternal"
                size="sm"
                color="info"
                text-color="white"
                dense
                icon="open_in_new"
              >
                Lien externe
              </q-chip>
              <q-chip
                v-else-if="item.defaultVisible"
                size="sm"
                color="positive"
                text-color="white"
                dense
              >
                Par défaut
              </q-chip>
            </q-item-section>
          </q-item>
        </q-list>
      </q-card-section>
    </q-card>

    <!-- Aperçu du menu -->
    <q-card flat bordered class="q-mt-lg">
      <q-card-section>
        <div class="row items-center justify-between q-mb-md">
          <div class="text-h6 text-weight-bold text-primary">
            <q-icon name="preview" size="md" class="q-mr-sm" />
            Aperçu
          </div>

          <!-- Toggle pour afficher/masquer les labels -->
          <q-toggle v-model="showLabels" label="Afficher le texte" color="primary" size="sm" />
        </div>

        <div v-if="visibleMenuItems.length === 0" class="text-center text-grey-7 q-py-md">
          Aucun élément sélectionné. La barre de navigation sera masquée.
        </div>

        <div v-else class="preview-menu bg-accent text-dark q-pa-md rounded-borders">
          <div class="row no-wrap justify-around">
            <div
              v-for="item in visibleMenuItems"
              :key="item.id"
              class="col-auto flex flex-center column q-pa-xs"
            >
              <q-icon :name="item.icon" size="28px" color="dark" />
              <div v-if="showLabels" class="text-caption q-mt-xs">{{ item.label }}</div>
            </div>
          </div>
        </div>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { storeToRefs } from 'pinia'
import Sortable from 'sortablejs'
import { useCustomizationStore } from '../stores/customizationStore'

const customizationStore = useCustomizationStore()
const { visibleMenuItems, isBottomMenuVisible, orderedMenuItems, showLabels } =
  storeToRefs(customizationStore)

const listElement = ref(null)
let sortableInstance = null

const sortableConfig = {
  animation: 150,
  handle: '.cursor-move',
  ghostClass: 'sortable-ghost',
  chosenClass: 'sortable-chosen',
  dragClass: 'sortable-drag',
  forceFallback: true,
  fallbackClass: 'sortable-fallback',
  fallbackOnBody: true,
  fallbackTolerance: 3,
}

const handleReorder = (event) => {
  if (event.oldIndex !== event.newIndex) {
    customizationStore.reorderItems(event.oldIndex, event.newIndex)
  }
}

onMounted(() => {
  if (!listElement.value) return

  const el = listElement.value.$el || listElement.value
  sortableInstance = Sortable.create(el, {
    ...sortableConfig,
    onEnd: handleReorder,
  })
})

onBeforeUnmount(() => {
  sortableInstance?.destroy()
})
</script>

<style scoped>
.preview-menu {
  border: 2px dashed #ccc;
  min-height: 80px;
}

.cursor-move,
.draggable-item {
  cursor: move;
}

/* Onglets de Préparation : décalés + filet à gauche pour montrer la hiérarchie. */
.sub-item {
  padding-left: 24px;
  border-left: 3px solid var(--q-primary);
  background-color: rgba(25, 118, 210, 0.03);
}

.sub-item-branch {
  min-width: auto;
}

.sortable-ghost {
  opacity: 0.4;
  background-color: rgba(25, 118, 210, 0.1);
}

.sortable-chosen {
  background-color: rgba(25, 118, 210, 0.05);
}

.sortable-drag {
  opacity: 1;
}

.sortable-fallback {
  opacity: 0.9;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3);
  transform: scale(1.05);
}
</style>
