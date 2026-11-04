<script setup>
import { useImagenStorage } from '@/composables/useImagenStorage';

const props = defineProps({
  producto: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['open', 'toggle-active']);
const { resolverUrlImagen } = useImagenStorage();

function onToggleActive(event) {
  emit('toggle-active', event.target.checked);
}

function esActivo(producto) {
  return producto?.activo === true || producto?.activo === 1 || producto?.activo === '1';
}

function obtenerPrimeraImagen(producto) {
  if (!producto) return null;
  if (producto.imagen) return producto.imagen;
  if (producto.imagenes && producto.imagenes.length > 0) {
    const primera = producto.imagenes.find(imagen => imagen.es_principal) || producto.imagenes[0];
    return primera?.url || primera?.ruta || null;
  }
  return null;
}

function precioDesde(producto) {
  const precios = (producto.variantes || [])
    .map(variante => Number(variante.precio_venta))
    .filter(precio => Number.isFinite(precio) && precio >= 0);

  return precios.length ? Math.min(...precios).toLocaleString('es-CO') : null;
}
</script>

<template>
  <article class="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
    <div class="flex items-center justify-end gap-3 border-b border-slate-100 px-4 py-3">
      <div class="flex items-center gap-2">
        <span class="text-[10px] font-semibold uppercase tracking-[0.18em]"
          :class="esActivo(producto) ? 'text-emerald-700' : 'text-slate-500'">{{ esActivo(producto) ? 'Activo' :
          'Inactivo' }}</span>
        <label class="relative inline-flex h-6 w-11 cursor-pointer items-center">
          <input :checked="esActivo(producto)" type="checkbox"
            :aria-label="esActivo(producto) ? 'Desactivar prenda' : 'Activar prenda'" class="peer sr-only"
            @change="onToggleActive">
          <span
            class="h-6 w-11 rounded-full bg-slate-300 transition peer-checked:bg-emerald-500 peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-500 peer-focus-visible:ring-offset-2"
            aria-hidden="true"></span>
          <span
            class="absolute left-1 h-4 w-4 rounded-full bg-white shadow transition peer-checked:translate-x-5"
            aria-hidden="true"></span>
        </label>
      </div>
    </div>

    <button type="button"
      class="flex w-full flex-1 flex-col p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-pink-500"
      @click="emit('open', producto.id_producto || producto.id)">
      <img v-if="obtenerPrimeraImagen(producto)" :src="resolverUrlImagen(obtenerPrimeraImagen(producto))"
        :alt="producto.nombre" class="mb-4 h-64 w-full rounded-xl object-cover"
        @error="$event.target.src = '/img/prenda-respaldo.svg'" />
      <img v-else src="/img/prenda-respaldo.svg" alt="Prenda sin imagen"
        class="mb-4 h-64 w-full rounded-xl bg-slate-100 object-cover" />

      <span role="heading" aria-level="3" class="text-lg font-semibold text-slate-900">
        {{ producto.nombre }}
      </span>
      <span class="mt-auto flex w-full items-center justify-between gap-2 pt-3">
        <span v-if="precioDesde(producto) !== null" class="min-w-0 text-sm font-bold text-pink-600 sm:text-base">
          Desde ${{ precioDesde(producto) }}
        </span>
        <span class="inline-flex shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold text-slate-600">
          {{ producto.color || 'Sin color' }}
        </span>
      </span>
    </button>
  </article>
</template>
