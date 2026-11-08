<script setup>
import { computed } from 'vue';
import { useImagenStorage } from '@/composables/useImagenStorage';
import {
  Globe,
  EyeOff,
  ArrowUpRight,
  Package,
  Layers
} from 'lucide-vue-next';
import { hexDeColor } from '@/utils/coloresPrenda';

const props = defineProps({
  producto: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['open', 'toggle-active', 'toggle-published']);
const { resolverUrlImagen } = useImagenStorage();

function onToggleActive(event) {
  emit('toggle-active', event.target.checked);
}

function onTogglePublished(event) {
  emit('toggle-published', event.target.checked);
}

function esPublicado(producto) {
  return producto?.publicado === true || producto?.publicado === 1 || producto?.publicado === '1';
}

function esActivo(producto) {
  return producto?.activo === true || producto?.activo === 1 || producto?.activo === '1';
}

function obtenerPrimeraImagen(producto) {
  if (!producto) return null;
  if (producto.imagen) return producto.imagen;
  if (producto.imagenes && producto.imagenes.length > 0) {
    const primera = producto.imagenes.find((imagen) => imagen.es_principal) || producto.imagenes[0];
    return primera?.url || primera?.ruta || null;
  }
  return null;
}

function precioDesde(producto) {
  const precios = (producto.variantes || [])
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

const tallasDisponibles = computed(() => {
  return (props.producto?.variantes || [])
    .map((v) => v.talla)
    .filter(Boolean)
    .slice(0, 5);
});

const colorMuestra = computed(() => {
  return hexDeColor(props.producto?.color) || '#333333';
});
</script>

<template>
  <article class="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-gray-200/90 bg-white shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
    <!-- Barra Superior de Control de Estados (Publicación y Activación) -->
    <div class="flex items-center justify-between gap-2 border-b border-gray-100 bg-gray-50/60 px-4 py-2.5">
      <!-- Switch Publicado en Tienda -->
      <div class="flex items-center gap-2">
        <label class="relative inline-flex h-5 w-9 cursor-pointer items-center">
          <input
            :checked="esPublicado(producto)"
            type="checkbox"
            :aria-label="esPublicado(producto) ? 'Ocultar de la tienda' : 'Publicar en la tienda'"
            class="peer sr-only"
            @change="onTogglePublished"
          />
          <span
            class="h-5 w-9 rounded-full bg-gray-300 transition peer-checked:bg-pink-500 peer-focus-visible:ring-2 peer-focus-visible:ring-pink-500"
            aria-hidden="true"
          ></span>
          <span
            class="absolute left-0.5 h-4 w-4 rounded-full bg-white shadow transition peer-checked:translate-x-4"
            aria-hidden="true"
          ></span>
        </label>
        <span
          class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
          :class="esPublicado(producto)
            ? 'bg-pink-50 text-corporativo-rosa border border-pink-200/60'
            : 'bg-gray-100 text-gray-500 border border-gray-200'"
        >
          <Globe v-if="esPublicado(producto)" class="h-3 w-3" />
          <EyeOff v-else class="h-3 w-3" />
          <span>{{ esPublicado(producto) ? 'En tienda' : 'Oculto' }}</span>
        </span>
      </div>

      <!-- Switch Activo / Inactivo -->
      <div class="flex items-center gap-2">
        <span
          class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
          :class="esActivo(producto)
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
            : 'bg-rose-50 text-rose-700 border border-rose-200/60'"
        >
          <span
            class="h-1.5 w-1.5 rounded-full"
            :class="esActivo(producto) ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'"
          ></span>
          <span>{{ esActivo(producto) ? 'Activo' : 'Inactivo' }}</span>
        </span>
        <label class="relative inline-flex h-5 w-9 cursor-pointer items-center">
          <input
            :checked="esActivo(producto)"
            type="checkbox"
            :aria-label="esActivo(producto) ? 'Desactivar prenda' : 'Activar prenda'"
            class="peer sr-only"
            @change="onToggleActive"
          />
          <span
            class="h-5 w-9 rounded-full bg-gray-300 transition peer-checked:bg-emerald-500 peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-500"
            aria-hidden="true"
          ></span>
          <span
            class="absolute left-0.5 h-4 w-4 rounded-full bg-white shadow transition peer-checked:translate-x-4"
            aria-hidden="true"
          ></span>
        </label>
      </div>
    </div>

    <!-- Contenedor Principal Clickeable para Abrir Detalle -->
    <button
      type="button"
      class="flex w-full flex-1 flex-col p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-corporativo-rosa cursor-pointer"
      @click="emit('open', producto.id_producto || producto.id)"
    >
      <!-- Imagen de la Prenda con Badges Superpuestos -->
      <div class="relative mb-3.5 h-64 w-full overflow-hidden rounded-2xl bg-gray-100 border border-gray-100">
        <img
          v-if="obtenerPrimeraImagen(producto)"
          :src="resolverUrlImagen(obtenerPrimeraImagen(producto))"
          :alt="producto.nombre"
          class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          @error="$event.target.src = '/img/prenda-respaldo.svg'"
        />
        <img
          v-else
          src="/img/prenda-respaldo.svg"
          alt="Prenda sin imagen"
          class="h-full w-full object-cover bg-gray-100 opacity-60"
        />

        <!-- Badge de Color Superpuesto Arriba a la Izquierda -->
        <div class="absolute left-2.5 top-2.5 flex items-center gap-1.5 rounded-full bg-white/95 backdrop-blur-sm px-2.5 py-1 shadow-sm border border-gray-100">
          <span
            class="h-3 w-3 rounded-full border border-gray-300/60 shadow-inner shrink-0"
            :style="{ backgroundColor: colorMuestra }"
          ></span>
          <span class="text-[11px] font-bold text-gray-800 capitalize truncate max-w-[100px]">
            {{ producto.color || 'Sin color' }}
          </span>
        </div>

        <!-- Badge de Stock Superpuesto Arriba a la Derecha -->
        <div
          class="absolute right-2.5 top-2.5 flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold shadow-sm backdrop-blur-sm"
          :class="stockTotal(producto) > 5
            ? 'bg-emerald-500/90 text-white'
            : (stockTotal(producto) > 0 ? 'bg-amber-500/90 text-white' : 'bg-rose-500/90 text-white')"
        >
          <Package class="h-3 w-3" />
          <span>{{ stockTotal(producto) }} uds</span>
        </div>
      </div>

      <!-- Información de la Prenda -->
      <div class="flex flex-1 flex-col">
        <!-- Categoría / Tipo -->
        <p v-if="producto.categoria?.nombre || producto.tipo_producto" class="text-[10px] font-black uppercase tracking-wider text-gray-400 truncate">
          {{ producto.categoria?.nombre || producto.tipo_producto }}
        </p>

        <!-- Título de la Prenda -->
        <h3 class="mt-1 text-base sm:text-lg font-bold text-gray-900 group-hover:text-corporativo-rosa transition line-clamp-1">
          {{ producto.nombre }}
        </h3>

        <!-- Tallas Disponibles -->
        <div v-if="tallasDisponibles.length" class="mt-2 flex flex-wrap items-center gap-1">
          <span
            v-for="talla in tallasDisponibles"
            :key="talla"
            class="rounded-lg bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-600"
          >
            {{ talla }}
          </span>
          <span
            v-if="(producto.variantes || []).length > 5"
            class="text-[10px] font-semibold text-gray-400 ml-0.5"
          >
            +{{ (producto.variantes || []).length - 5 }}
          </span>
        </div>

        <!-- Pie de Tarjeta: Precio y Botón de Detalle -->
        <div class="mt-auto flex w-full items-center justify-between gap-2 pt-3 border-t border-gray-100">
          <div>
            <span class="text-[10px] font-semibold uppercase tracking-wider text-gray-400 block">
              Precio venta
            </span>
            <span v-if="precioDesde(producto) !== null" class="text-base sm:text-lg font-black text-corporativo-rosa tracking-tight">
              ${{ precioDesde(producto) }}
            </span>
            <span v-else class="text-xs italic text-gray-400">Sin precio fijado</span>
          </div>

          <div class="flex h-8 w-8 items-center justify-center rounded-xl bg-gray-100 text-gray-600 group-hover:bg-corporativo-rosa group-hover:text-white transition-all shadow-sm">
            <ArrowUpRight class="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </div>
        </div>
      </div>
    </button>
  </article>
</template>
