<template>
  <q-card flat bordered :class="['q-mb-lg', `q-pa-${padding}`, bgClass]">
    <div
      class="flex items-center q-mb-md"
      :class="[
        dense ? 'text-h6' : 'text-h5',
        'text-weight-bold',
        `text-${titleColor}`,
        hasActions ? 'justify-between' : '',
      ]"
    >
      <span
        class="flex items-center"
        :class="to ? 'cursor-pointer' : ''"
        @click="to && router.push(to)"
      >
        <q-icon v-if="icon" :name="icon" :size="iconSize" class="q-mr-sm" />
        {{ title }}
        <q-icon v-if="to" name="chevron_right" size="sm" class="q-ml-xs" />
      </span>
      <slot name="header-actions" />
    </div>
    <slot />
  </q-card>
</template>

<script setup>
import { computed, useSlots } from 'vue'
import { useRouter } from 'vue-router'

const slots = useSlots()
const hasActions = computed(() => !!slots['header-actions'])
const router = useRouter()

defineProps({
  title: {
    type: String,
    required: true,
  },
  icon: {
    type: String,
    default: null,
  },
  titleColor: {
    type: String,
    default: 'primary',
  },
  iconSize: {
    type: String,
    default: 'md',
  },
  padding: {
    type: String,
    default: 'md',
  },
  dense: {
    type: Boolean,
    default: false,
  },
  bgClass: {
    type: String,
    default: null,
  },
  to: {
    type: String,
    default: null,
  },
})
</script>
