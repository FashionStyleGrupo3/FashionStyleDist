<script setup>
import { useImagenStorage } from '@/composables/useImagenStorage';

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  producto: {
    type: Object,
    default: null
  },
  eliminando: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['close', 'edit', 'delete']);
const { resolverUrlImagen } = useImagenStorage();

function obtenerPrimeraImagen(producto) {
  if (!producto) return null;
  if (producto.imagen) return producto.imagen;
  if (producto.imagenes && producto.imagenes.length > 0) {
    const primera = producto.imagenes.find(imagen => imagen.es_principal) || producto.imagenes[0];
    return primera?.url || primera?.ruta || null;
  }
  return null;
}

function resolverRuta(item) {
  if (!item) return '/img/prenda-respaldo.svg';
  const ruta = typeof item === 'object' ? (item.url || item.ruta) : item;
  if (!ruta) return '/img/prenda-respaldo.svg';
  if (ruta.startsWith('data:') || ruta.startsWith('http')) return ruta;
  const limpia = ruta.replace(/^\/?storage\//, '').replace(/^\/+/, '');
  const baseStorage = import.meta.env.VITE_STORAGE_BASE_URL || '/storage';
  return `${baseStorage}/${limpia}`;
}

function precioDesde(producto) {
  const precios = (producto?.variantes || [])
    .map(variante => Number(variante.precio_venta))
    .filter(precio => Number.isFinite(precio) && precio >= 0);

  return precios.length ? Math.min(...precios).toLocaleString('es-CO') : null;
}

function stockTotal(producto) {
  return (producto?.variantes || []).reduce(
    (total, variante) => total + Number(variante.stock || 0),
    0
  );
}
</script>

<template>
  <div v-if="visible" class="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-slate-950/60 p-2 backdrop-blur-sm sm:p-5">
    <div role="dialog" aria-modal="true" :aria-label="`Detalle de ${producto?.nombre || 'la prenda'}`" class="relative mx-auto my-2 w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl sm:my-8 sm:rounded-3xl">
      <button type="button" aria-label="Cerrar detalle de la prenda" class="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-lg text-slate-500 transition hover:bg-slate-200 hover:text-slate-700 sm:right-4 sm:top-4" @click="emit('close')">✕</button>

      <div v-if="producto" class="grid gap-0 md:grid-cols-2">
        <div class="bg-slate-50 p-6">
          <div class="overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <img
              v-if="obtenerPrimeraImagen(producto)"
              :src="resolverUrlImagen(obtenerPrimeraImagen(producto))"
              :alt="producto.nombre"
              class="h-64 w-full rounded-xl object-cover sm:h-[420px]"
              @error="$event.target.src = '/img/prenda-respaldo.svg'"
            />
            <img v-else src="/img/prenda-respaldo.svg" alt="Prenda sin imagen" class="h-64 w-full rounded-xl bg-slate-100 object-cover sm:h-[420px]" />
          </div>
        </div>

        <div class="p-6 sm:p-8">
          <h2 class="text-3xl font-bold text-slate-900">{{ producto.nombre }}</h2>
          <div class="mt-4 flex flex-wrap gap-3">
            <span class="rounded-full bg-pink-50 px-3 py-1 text-sm font-semibold text-pink-700">Desde ${{ precioDesde(producto) }}</span>
            <span class="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
              <span class="h-3 w-3 rounded-full" :style="{ backgroundColor: producto.color || '#16171b' }"></span>
              {{ producto.color || 'Sin color' }}
            </span>
          </div>

          <div class="mt-6">
            <p class="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Variantes</p>
            <div class="flex flex-wrap gap-2">
              <div v-for="variante in producto.variantes || []" :key="variante.id_variante" class="min-w-[110px] rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                <strong class="block text-slate-900">{{ variante.talla }}</strong>
                <small class="block text-slate-500">{{ variante.sku }}</small>
                <small class="block">${{ Number(variante.precio_venta).toLocaleString('es-CO') }}</small>
                <small class="block">{{ variante.stock }} uds</small>
              </div>
            </div>
          </div>

          <p class="mt-6 text-sm leading-6 text-slate-600">{{ producto.descripcion }}</p>

          <div class="mt-6 flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
            <span class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Stock total</span>
            <strong class="text-lg font-bold text-slate-900">{{ stockTotal(producto) }} unidades</strong>
          </div>

          <div class="mt-6 flex flex-col gap-3 sm:flex-row">
            <button type="button" class="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-pink-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-pink-500" @click="emit('edit')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
              </svg>
              Editar producto
            </button>
            <button type="button" :disabled="eliminando" class="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60" @click="emit('delete')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
              {{ eliminando ? 'Eliminando...' : 'Eliminar producto' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
|