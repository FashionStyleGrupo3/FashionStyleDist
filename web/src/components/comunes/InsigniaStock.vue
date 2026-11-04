<script setup>
import { computed } from 'vue';

const props = defineProps({
  cantidad: { type: Number, required: true },
  umbralMinimo: { type: Number, default: 5 }
});

const estado = computed(() => {
  if (props.cantidad <= 0) return { texto: 'Agotado', clase: 'bg-red-100 text-red-700 border-red-200' };
  if (props.cantidad <= props.umbralMinimo) return { texto: 'Pocas Unidades', clase: 'bg-amber-100 text-amber-700 border-amber-200' };
  return { texto: 'Disponible', clase: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
});
</script>

<template>
  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border" :class="estado.clase">
    {{ estado.texto }}
  </span>
</template>
