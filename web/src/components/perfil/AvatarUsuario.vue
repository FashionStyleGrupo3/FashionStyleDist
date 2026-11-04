<script setup>
import { computed, ref, watch } from 'vue';
import { useImagenStorage } from '@/composables/useImagenStorage';

const props = defineProps({
  nombre: { type: String, default: '' },
  foto: { type: String, default: '' },
  clases: { type: String, default: 'h-10 w-10 text-sm' }
});

const { resolverUrlImagen } = useImagenStorage();
const fallo = ref(false);

watch(() => props.foto, () => { fallo.value = false; });

const src = computed(() => (props.foto && !fallo.value ? resolverUrlImagen(props.foto) : ''));
const inicial = computed(() => (props.nombre || 'U').trim().charAt(0).toUpperCase());
</script>

<template>
  <span
    class="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-pink-100 font-bold text-corporativo-rosa"
    :class="clases"
  >
    <img
      v-if="src"
      :src="src"
      :alt="nombre"
      referrerpolicy="no-referrer"
      class="h-full w-full object-cover"
      @error="fallo = true"
    />
    <template v-else>{{ inicial }}</template>
  </span>
</template>