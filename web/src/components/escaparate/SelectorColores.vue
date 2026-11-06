<script setup>
// Selector de color del detalle de prenda. Cada color que se registra en
// Gestión de Prendas es una prenda con el mismo nombre y su propio inventario:
// elegir otro color lleva a esa prenda (con sus tallas y existencias).
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { Check } from 'lucide-vue-next';
import { fondoMuestra, mismoColor } from '@/utils/coloresPrenda';

const props = defineProps({
  // [{ id, color, disponible }] incluye la prenda actual
  opciones: { type: Array, default: () => [] },
  idActual: { type: [Number, String], required: true },
});

const router = useRouter();

const actual = computed(() => props.opciones.find((o) => String(o.id) === String(props.idActual)));

function elegir(opcion) {
  if (String(opcion.id) === String(props.idActual)) return;
  router.push({ name: 'detalle-producto', params: { id: opcion.id } });
}
</script>

<template>
  <fieldset v-if="opciones.length">
    <legend class="mb-3 text-sm font-semibold text-gray-800">
      Color: <span class="font-normal text-gray-600">{{ actual?.color || 'Único' }}</span>
    </legend>
    <div class="flex flex-wrap gap-3">
      <button
        v-for="opcion in opciones"
        :key="opcion.id"
        type="button"
        class="group relative grid h-10 w-10 place-items-center rounded-full border transition focus:outline-none focus:ring-2 focus:ring-tienda-negro focus:ring-offset-2"
        :class="String(opcion.id) === String(idActual) ? 'border-tienda-negro ring-1 ring-tienda-negro' : 'border-tienda-borde hover:border-tienda-negro'"
        :title="`${opcion.color}${opcion.disponible ? '' : ' · agotado'}`"
        :aria-label="`Color ${opcion.color}${opcion.disponible ? '' : ', agotado'}`"
        :aria-pressed="String(opcion.id) === String(idActual)"
        @click="elegir(opcion)"
      >
        <span class="h-7 w-7 rounded-full border border-black/10" :style="{ background: fondoMuestra(opcion.color) }"></span>
        <Check
          v-if="String(opcion.id) === String(idActual)"
          class="absolute h-3.5 w-3.5"
          :class="mismoColor(opcion.color, 'blanco') || mismoColor(opcion.color, 'marfil') || mismoColor(opcion.color, 'crema') ? 'text-tienda-negro' : 'text-white'"
        />
        <span v-if="!opcion.disponible" class="pointer-events-none absolute h-px w-9 rotate-45 bg-tienda-rojo"></span>
      </button>
    </div>
  </fieldset>
</template>
