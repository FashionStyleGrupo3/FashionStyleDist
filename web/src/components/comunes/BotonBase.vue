<script setup>
defineProps({
  variante: { type: String, default: 'primario' },
  cargando: { type: Boolean, default: false },
  deshabilitado: { type: Boolean, default: false }
});
</script>

<template>
  <button
    :disabled="deshabilitado || cargando"
    class="inline-flex items-center justify-center px-4 py-2 rounded-lg font-medium text-sm transition-all focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
    :class="{
      'bg-corporativo-rosa text-white hover:bg-corporativo-rosa-hover': variante === 'primario',
      'bg-gray-100 text-gray-700 hover:bg-gray-200': variante === 'secundario',
      'bg-red-600 text-white hover:bg-red-700': variante === 'peligro'
    }"
  >
    <svg v-if="cargando" class="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
    <slot />
  </button>
</template>
