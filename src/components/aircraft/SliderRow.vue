<template>
  <div class="row items-center no-wrap q-gutter-sm q-mb-xs">
    <span class="sr-label text-body2 text-weight-medium ellipsis">
      {{ label }}
      <q-tooltip>{{ label }}</q-tooltip>
    </span>
    <q-slider
      class="col"
      :model-value="modelValue"
      :min="min"
      :max="max"
      :step="step"
      dense
      :color="color"
      @update:model-value="(v) => emit('update:modelValue', Number(v) || 0)"
    />
    <q-input
      :model-value="modelValue"
      type="number"
      dense
      borderless
      input-class="text-right"
      class="sr-value"
      :suffix="suffix"
      :min="min"
      :max="max"
      @update:model-value="(v) => emit('update:modelValue', Number(v) || 0)"
    />
  </div>
</template>

<script setup>
/**
 * Ligne compacte « libellé + slider + valeur » réutilisée par les onglets
 * Centrage (chargement), Carburant (paramètres) et Tarif (déduction).
 */
defineProps({
  label: { type: String, required: true },
  modelValue: { type: Number, default: 0 },
  min: { type: Number, default: 0 },
  max: { type: Number, default: 100 },
  step: { type: Number, default: 1 },
  suffix: { type: String, default: '' },
  color: { type: String, default: 'primary' },
})

const emit = defineEmits(['update:modelValue'])
</script>

<style scoped>
.sr-label {
  flex: 0 0 96px;
  width: 96px;
}
.sr-value {
  flex: 0 0 70px;
  width: 70px;
}
</style>
