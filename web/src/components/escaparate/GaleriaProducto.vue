<script setup>
// -> Componente GaleriaProducto
import { computed, ref, watch } from 'vue';
import { Image as ImageIcon, Shirt } from 'lucide-vue-next';
import { useImagenStorage } from '@/composables/useImagenStorage';

const props = defineProps({
  imagenes: { type: Array, default: () => [] },
  modelValue: { type: Object, default: null },
  nombreProducto: { type: String, default: 'Prenda' }
});

const emit = defineEmits(['update:modelValue']);
const { resolverUrlImagen, IMAGEN_RESPALDO } = useImagenStorage();
const fotoActiva = ref(null);
const errorImagenActiva = ref(false);
const miniaturasFallidas = ref({});

function marcarMiniaturaFallida(url) {
  if (url) {
    miniaturasFallidas.value = { ...miniaturasFallidas.value, [url]: true };
  }
}

const imagenesNormalizadas = computed(() => {
  return (Array.isArray(props.imagenes) ? props.imagenes : [])
    .map((imagen, indice) => {
      if (typeof imagen === 'string') {
        const url = resolverUrlImagen(imagen);
        return { url, es_principal: indice === 0, alt: `${props.nombreProducto}, imagen ${indice + 1}` };
      }
      if (!imagen) return null;
      const urlOrigen = imagen.url || imagen.ruta;
      const url = resolverUrlImagen(urlOrigen || imagen);
      return {
        ...imagen,
        url,
        alt: imagen.alt || `${props.nombreProducto}, imagen ${indice + 1}`
      };
    })
    .filter(Boolean);
});

const imagenPrincipal = computed(() =>
  imagenesNormalizadas.value.find(imagen => imagen.es_principal) || imagenesNormalizadas.value[0] || null
);

watch(
  () => props.imagenes,
  () => {
    miniaturasFallidas.value = {};
    errorImagenActiva.value = false;
    fotoActiva.value = props.modelValue || imagenPrincipal.value;
    emit('update:modelValue', fotoActiva.value);
  },
  { deep: true, immediate: true }
);

watch(
  () => props.modelValue,
  (nuevo) => {
    if (nuevo) {
      fotoActiva.value = nuevo;
      errorImagenActiva.value = Boolean(miniaturasFallidas.value[nuevo.url]);
    } else if (!fotoActiva.value) {
      fotoActiva.value = imagenPrincipal.value;
    }
  }
);

function seleccionarImagen(imagen) {
  fotoActiva.value = imagen;
  errorImagenActiva.value = Boolean(miniaturasFallidas.value[imagen?.url]);
  emit('update:modelValue', imagen);
}

function manejarErrorImagen() {
  errorImagenActiva.value = true;
  if (fotoActiva.value?.url) {
    marcarMiniaturaFallida(fotoActiva.value.url);
  }
}
</script>

<template>
  <section class="w-full" aria-label="Galería de imágenes del producto">
    <div class="relative flex aspect-[4/5] max-h-[620px] items-center justify-center overflow-hidden rounded-2xl bg-gray-100">
      <img
        v-if="fotoActiva?.url && !errorImagenActiva"
        :key="fotoActiva.url"
        :src="fotoActiva.url"
        :alt="fotoActiva.alt || nombreProducto"
        class="h-full w-full object-contain"
        @error="manejarErrorImagen"
      />
      <div v-else class="flex flex-col items-center gap-3 p-8 text-center text-gray-400">
        <Shirt class="h-28 w-28" :stroke-width="1.1" aria-hidden="true" />
        <p class="text-sm">Imagen no disponible</p>
      </div>
      <span
        v-if="fotoActiva?.es_principal"
        class="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-gray-700 shadow"
      >
        Foto principal
      </span>
    </div>

    <div v-if="imagenesNormalizadas.length" class="mt-4 flex gap-3 overflow-x-auto pb-2" aria-label="Miniaturas del producto">
      <button
        v-for="(imagen, indice) in imagenesNormalizadas"
        :key="imagen.id_imagen || imagen.id || imagen.url || indice"
        type="button"
        class="flex h-20 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border-2 bg-gray-100 transition sm:h-24 sm:w-20"
        :class="fotoActiva?.url === imagen.url ? 'border-corporativo-rosa ring-2 ring-pink-100' : 'border-transparent hover:border-gray-300'"
        :aria-label="`Ver imagen ${indice + 1} de ${nombreProducto}`"
        :aria-pressed="fotoActiva?.url === imagen.url"
        @click="seleccionarImagen(imagen)"
        @mouseenter="seleccionarImagen(imagen)"
      >
        <img
          v-if="!miniaturasFallidas[imagen.url]"
          :src="imagen.url"
          :alt="imagen.alt"
          class="h-full w-full object-cover"
          @error="marcarMiniaturaFallida(imagen.url)"
        />
        <Shirt v-else class="h-6 w-6 text-gray-400" :stroke-width="1.3" aria-hidden="true" />
        <span class="sr-only">{{ imagen.alt }}</span>
      </button>
    </div>
    <div v-else class="mt-4 flex gap-3" aria-label="Miniaturas del producto">
      <div
        v-for="indice in 3"
        :key="indice"
        class="flex h-20 w-16 shrink-0 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 text-gray-400 sm:h-24 sm:w-20"
        :title="`Vista ${indice}`"
      >
        <ImageIcon class="h-6 w-6" aria-hidden="true" />
      </div>
    </div>
  </section>
</template>
