<script setup>
defineProps({
  paginaActual: { type: Number, default: 1 },
  totalPaginas: { type: Number, default: 1 },
  totalRegistros: { type: Number, default: 0 }
});
const emit = defineEmits(['cambiar-pagina']);
</script>

<template>
  <div class="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200">
    <div class="text-sm text-gray-500">
      Total registros: <span class="font-semibold text-gray-700">{{ totalRegistros }}</span>
    </div>
    <div class="flex items-center gap-2">
      <button
        :disabled="paginaActual <= 1"
        @click="emit('cambiar-pagina', paginaActual - 1)"
        class="px-3 py-1.5 text-xs font-medium rounded border hover:bg-gray-50 disabled:opacity-40"
      >
        Anterior
      </button>
      <span class="text-xs text-gray-600">Página {{ paginaActual }} de {{ totalPaginas }}</span>
      <button
        :disabled="paginaActual >= totalPaginas"
        @click="emit('cambiar-pagina', paginaActual + 1)"
        class="px-3 py-1.5 text-xs font-medium rounded border hover:bg-gray-50 disabled:opacity-40"
      >
        Siguiente
      </button>
    </div>
  </div>
</template>
