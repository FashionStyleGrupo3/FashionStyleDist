<script setup>
// -> Componente SelectorTallas
const props = defineProps({
  variantes: { type: Array, default: () => [] },
  modelValue: { type: Object, default: null }
});

const emit = defineEmits(['update:modelValue', 'cambio-talla']);

function seleccionar(variante) {
  if (!variante || Number(variante.stock) <= 0) return;
  emit('update:modelValue', variante);
  emit('cambio-talla', variante);
}

function esSeleccionada(variante) {
  if (!props.modelValue) return false;
  if (props.modelValue.id_variante && variante.id_variante) {
    return props.modelValue.id_variante === variante.id_variante;
  }
  return props.modelValue.talla === variante.talla;
}
</script>

<template>
  <fieldset>
    <legend class="mb-3 text-sm font-semibold text-gray-800">Selecciona una talla</legend>
    <div class="flex flex-wrap gap-2">
      <button
        v-for="variante in variantes"
        :key="variante.id_variante || variante.sku || variante.talla"
        type="button"
        :disabled="Number(variante.stock) <= 0"
        :aria-pressed="esSeleccionada(variante)"
        :title="Number(variante.stock) <= 0 ? `Talla ${variante.talla} agotada` : `${variante.stock} unidades disponibles`"
        class="relative min-w-12 rounded-lg border px-4 py-3 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-pink-200 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400 disabled:line-through"
        :class="esSeleccionada(variante) ? 'border-corporativo-rosa bg-pink-50 text-corporativo-rosa' : 'border-gray-300 bg-white text-gray-700 hover:border-corporativo-rosa'"
        @click="seleccionar(variante)"
      >
        {{ variante.talla }}
      </button>
    </div>
    <p v-if="modelValue" class="mt-2 text-xs text-gray-500">
      {{ Number(modelValue.stock) > 0 ? `${modelValue.stock} unidades disponibles` : 'Sin existencias' }}
    </p>
  </fieldset>
</template>
