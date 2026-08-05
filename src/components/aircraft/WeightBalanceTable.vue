<template>
  <div>
    <q-markup-table flat dense class="wb-table">
      <thead>
        <tr>
          <th class="text-left">Poste</th>
          <th class="text-right">Masse (kg)</th>
          <th class="text-right">Bras (mm)</th>
          <th class="text-right">Moment (kg·mm)</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="row.id">
          <td class="text-left">{{ row.label }}</td>
          <td class="text-right">{{ fmt(row.mass) }}</td>
          <td class="text-right">{{ fmt(row.arm, 0) }}</td>
          <td class="text-right">{{ fmt(row.moment, 0) }}</td>
        </tr>
      </tbody>
      <tfoot>
        <tr class="wb-total" :class="overWeight ? 'bg-red-1 text-red-9' : 'bg-grey-2'">
          <td class="text-left text-weight-bold">Total</td>
          <td class="text-right text-weight-bold">
            {{ fmt(totalWeight) }}
            <span v-if="maxTakeoffWeight" class="text-caption text-grey-7">
              / {{ fmt(maxTakeoffWeight) }}
            </span>
          </td>
          <td class="text-right text-weight-bold">{{ cg != null ? fmt(cg, 0) : '—' }}</td>
          <td class="text-right text-weight-bold">{{ fmt(totalMoment, 0) }}</td>
        </tr>
      </tfoot>
    </q-markup-table>
  </div>
</template>

<script setup>
defineProps({
  rows: { type: Array, default: () => [] },
  totalWeight: { type: Number, default: 0 },
  totalMoment: { type: Number, default: 0 },
  cg: { type: Number, default: null },
  maxTakeoffWeight: { type: Number, default: null },
  overWeight: { type: Boolean, default: false },
})

function fmt(v, decimals = 1) {
  if (v == null || Number.isNaN(v)) return '—'
  return Number(v).toLocaleString('fr-FR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}
</script>

<style scoped>
.wb-table {
  font-variant-numeric: tabular-nums;
}
.wb-total td {
  border-top: 2px solid rgba(0, 0, 0, 0.15);
}
</style>
