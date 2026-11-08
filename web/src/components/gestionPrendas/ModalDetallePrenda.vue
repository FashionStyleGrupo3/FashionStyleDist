<script setup>
import { computed, ref, watch } from 'vue';
import { useImagenStorage } from '@/composables/useImagenStorage';
import {
  X,
  Pencil,
  Trash2,
  Package,
  Layers,
  Globe,
  EyeOff,
  CheckCircle2,
  XCircle,
  Tag,
  Loader2
} from 'lucide-vue-next';
import { hexDeColor } from '@/utils/coloresPrenda';

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

const imagenSeleccionada = ref(null);

watch(
  () => props.producto,
  (nuevo) => {
    imagenSeleccionada.value = null;
  }
);

function esPublicado(p) {
  return p?.publicado === true || p?.publicado === 1 || p?.publicado === '1';
}

function esActivo(p) {
  return p?.activo === true || p?.activo === 1 || p?.activo === '1';
}

function obtenerPrimeraImagen(producto) {
  if (!producto) return null;
  if (imagenSeleccionada.value) return imagenSeleccionada.value;
  if (producto.imagen) return producto.imagen;
  if (producto.imagenes && producto.imagenes.length > 0) {
    const primera = producto.imagenes.find((img) => img.es_principal) || producto.imagenes[0];
    return primera?.url || primera?.ruta || null;
  }
  return null;
}

function precioDesde(producto) {
  const precios = (producto?.variantes || [])
    .map((variante) => Number(variante.precio_venta))
    .filter((precio) => Number.isFinite(precio) && precio >= 0);

  return precios.length ? Math.min(...precios).toLocaleString('es-CO') : null;
}

function stockTotal(producto) {
  return (producto?.variantes || []).reduce(
    (total, variante) => total + Number(variante.stock || 0),
    0
  );
}

const colorMuestra = computed(() => {
  return hexDeColor(props.producto?.color) || '#333333';
});
</script>

<template>
  <div
    v-if="visible"
    class="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm p-3 sm:p-6 flex items-center justify-center animate-fadeIn"
    @click.self="emit('close')"
  >
    <div
      role="dialog"
      aria-modal="true"
      :aria-label="`Detalle de ${producto?.nombre || 'la prenda'}`"
      class="relative w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl border border-gray-100 my-6 transition-all"
    >
      <!-- Botón de Cierre -->
      <button
        type="button"
        aria-label="Cerrar detalle"
        class="absolute right-4 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-gray-500 shadow-md backdrop-blur-sm transition hover:bg-white hover:text-gray-800"
        @click="emit('close')"
      >
        <X class="h-5 w-5" />
      </button>

      <div v-if="producto" class="grid gap-0 md:grid-cols-2">
        <!-- Columna Izquierda: Imagen Principal y Miniaturas -->
        <div class="bg-gray-50/70 p-6 flex flex-col justify-between border-b md:border-b-0 md:border-r border-gray-100">
          <div class="space-y-3">
            <div class="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm">
              <img
                v-if="obtenerPrimeraImagen(producto)"
                :src="resolverUrlImagen(obtenerPrimeraImagen(producto))"
                :alt="producto.nombre"
                class="h-72 w-full object-cover sm:h-[400px]"
                @error="$event.target.src = '/img/prenda-respaldo.svg'"
              />
              <img
                v-else
                src="/img/prenda-respaldo.svg"
                alt="Prenda sin imagen"
                class="h-72 w-full object-cover bg-gray-100 opacity-60 sm:h-[400px]"
              />
            </div>

            <!-- Tira de Miniaturas si hay múltiples fotos -->
            <div
              v-if="(producto.imagenes || []).length > 1"
              class="flex items-center gap-2 overflow-x-auto pb-1"
            >
              <button
                v-for="(img, idx) in producto.imagenes"
                :key="img.id || idx"
                type="button"
                class="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border-2 transition"
                :class="(imagenSeleccionada || obtenerPrimeraImagen(producto)) === (img.url || img.ruta)
                  ? 'border-corporativo-rosa ring-2 ring-pink-500/20'
                  : 'border-gray-200 hover:border-gray-300 opacity-70 hover:opacity-100'"
                @click="imagenSeleccionada = (img.url || img.ruta)"
              >
                <img
                  :src="resolverUrlImagen(img.url || img.ruta)"
                  class="h-full w-full object-cover"
                />
              </button>
            </div>
          </div>

          <!-- Total de Stock en almacén -->
          <div class="mt-4 flex items-center justify-between rounded-2xl bg-white border border-gray-200/80 p-4 shadow-sm">
            <div class="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-500">
              <Package class="h-4 w-4 text-corporativo-rosa" />
              <span>Stock Total Almacén</span>
            </div>
            <span class="text-lg font-black text-gray-900">
              {{ stockTotal(producto) }} unidades
            </span>
          </div>
        </div>

        <!-- Columna Derecha: Información Detallada y Variantes -->
        <div class="p-6 sm:p-8 flex flex-col justify-between space-y-6">
          <div class="space-y-4">
            <!-- Badges Superiores -->
            <div class="flex flex-wrap items-center gap-2">
              <span
                v-if="producto.categoria?.nombre || producto.tipo_producto"
                class="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-gray-600"
              >
                {{ producto.categoria?.nombre || producto.tipo_producto }}
              </span>

              <!-- Badge Publicado -->
              <span
                class="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wider"
                :class="esPublicado(producto)
                  ? 'bg-pink-50 text-corporativo-rosa border border-pink-200/80'
                  : 'bg-gray-100 text-gray-500 border border-gray-200'"
              >
                <Globe v-if="esPublicado(producto)" class="h-3 w-3" />
                <EyeOff v-else class="h-3 w-3" />
                <span>{{ esPublicado(producto) ? 'En tienda' : 'Oculto' }}</span>
              </span>

              <!-- Badge Activo -->
              <span
                class="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wider"
                :class="esActivo(producto)
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                  : 'bg-rose-50 text-rose-700 border border-rose-200/80'"
              >
                <span
                  class="h-1.5 w-1.5 rounded-full"
                  :class="esActivo(producto) ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'"
                ></span>
                <span>{{ esActivo(producto) ? 'Activo' : 'Inactivo' }}</span>
              </span>
            </div>

            <!-- Título de la Prenda -->
            <div>
              <h2 class="text-2xl sm:text-3xl font-extrabold text-gray-900 font-titulos tracking-tight">
                {{ producto.nombre }}
              </h2>
              <div class="mt-2 flex items-center gap-3">
                <span class="text-2xl font-black text-corporativo-rosa tracking-tight">
                  Desde ${{ precioDesde(producto) }}
                </span>
                <span class="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700">
                  <span
                    class="h-3 w-3 rounded-full border border-gray-300 shadow-inner"
                    :style="{ backgroundColor: colorMuestra }"
                  ></span>
                  {{ producto.color || 'Sin color' }}
                </span>
              </div>
            </div>

            <!-- Descripción -->
            <p v-if="producto.descripcion" class="text-sm leading-relaxed text-gray-600 bg-gray-50/60 p-3.5 rounded-2xl border border-gray-100">
              {{ producto.descripcion }}
            </p>

            <!-- Grid de Variantes y Tallas -->
            <div>
              <div class="flex items-center justify-between mb-2">
                <span class="text-xs font-black uppercase tracking-wider text-gray-500">
                  Tallas y Variantes de Stock
                </span>
                <span class="text-xs text-gray-400 font-semibold">
                  {{ (producto.variantes || []).length }} variante{{ (producto.variantes || []).length === 1 ? '' : 's' }}
                </span>
              </div>

              <div class="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto pr-1">
                <div
                  v-for="variante in producto.variantes || []"
                  :key="variante.id_variante || variante.sku"
                  class="rounded-xl border border-gray-200/80 bg-white p-3 shadow-xs"
                >
                  <div class="flex items-center justify-between">
                    <span class="text-sm font-black text-gray-900">Talla {{ variante.talla }}</span>
                    <span
                      class="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                      :class="Number(variante.stock || 0) > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'"
                    >
                      {{ variante.stock }} uds
                    </span>
                  </div>
                  <p class="font-mono text-[10px] text-gray-400 mt-1 truncate">
                    SKU: {{ variante.sku }}
                  </p>
                  <p class="text-xs font-extrabold text-corporativo-rosa mt-0.5">
                    ${{ Number(variante.precio_venta).toLocaleString('es-CO') }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- Acciones Inferiores -->
          <div class="flex flex-col sm:flex-row gap-2.5 pt-4 border-t border-gray-100">
            <button
              type="button"
              class="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-corporativo-rosa px-4 py-3 text-sm font-bold text-white shadow-sm shadow-pink-500/20 hover:opacity-95 active:scale-95 transition"
              @click="emit('edit')"
            >
              <Pencil class="h-4 w-4" />
              <span>Editar Prenda</span>
            </button>

            <button
              type="button"
              :disabled="eliminando"
              class="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700 hover:bg-rose-100 active:scale-95 disabled:opacity-50 transition"
              @click="emit('delete')"
            >
              <Loader2 v-if="eliminando" class="h-4 w-4 animate-spin" />
              <Trash2 v-else class="h-4 w-4" />
              <span>{{ eliminando ? 'Eliminando...' : 'Eliminar' }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
