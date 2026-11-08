<script setup>
import { computed } from 'vue';
import {
  Shirt,
  Globe,
  EyeOff,
  CheckCircle2,
  XCircle,
  Search,
  X
} from 'lucide-vue-next';

const props = defineProps({
  productos: {
    type: Array,
    default: () => []
  },
  busqueda: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['update:busqueda']);

function esActivo(p) {
  return p?.activo === true || p?.activo === 1 || p?.activo === '1';
}

function esPublicado(p) {
  return p?.publicado === true || p?.publicado === 1 || p?.publicado === '1';
}

const totalProductos = computed(() => props.productos.length);
const totalPublicados = computed(() => props.productos.filter((p) => esPublicado(p)).length);
const totalOcultos = computed(() => props.productos.filter((p) => !esPublicado(p)).length);
const totalActivos = computed(() => props.productos.filter((p) => esActivo(p)).length);
const totalInactivos = computed(() => props.productos.filter((p) => !esActivo(p)).length);
</script>

<template>
  <div class="space-y-4">
    <!-- Tarjetas de Métricas Ejecutivas (KPIs) -->
    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
      <!-- Total Prendas -->
      <div class="relative overflow-hidden rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm hover:shadow-md transition-all duration-200">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Colección Total</span>
          <div class="flex h-8 w-8 items-center justify-center rounded-xl bg-gray-100 text-gray-700">
            <Shirt class="h-4 w-4" />
          </div>
        </div>
        <p class="mt-2 text-2xl font-black text-gray-900 tracking-tight">{{ totalProductos }}</p>
        <p class="mt-0.5 text-xs text-gray-400">Prendas registradas</p>
      </div>

      <!-- Publicadas en Tienda -->
      <div class="relative overflow-hidden rounded-2xl border border-pink-100 bg-white p-4 shadow-sm hover:shadow-md transition-all duration-200">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-corporativo-rosa uppercase tracking-wider">En Tienda</span>
          <div class="flex h-8 w-8 items-center justify-center rounded-xl bg-pink-50 text-corporativo-rosa">
            <Globe class="h-4 w-4" />
          </div>
        </div>
        <p class="mt-2 text-2xl font-black text-corporativo-rosa tracking-tight">{{ totalPublicados }}</p>
        <p class="mt-0.5 text-xs text-pink-600/70">Visibles al cliente</p>
      </div>

      <!-- Ocultas / Borrador -->
      <div class="relative overflow-hidden rounded-2xl border border-amber-100 bg-white p-4 shadow-sm hover:shadow-md transition-all duration-200">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-amber-700 uppercase tracking-wider">Ocultas</span>
          <div class="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <EyeOff class="h-4 w-4" />
          </div>
        </div>
        <p class="mt-2 text-2xl font-black text-amber-700 tracking-tight">{{ totalOcultos }}</p>
        <p class="mt-0.5 text-xs text-amber-600/70">Solo catálogo interno</p>
      </div>

      <!-- Activas -->
      <div class="relative overflow-hidden rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm hover:shadow-md transition-all duration-200">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Activas</span>
          <div class="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <CheckCircle2 class="h-4 w-4" />
          </div>
        </div>
        <p class="mt-2 text-2xl font-black text-emerald-600 tracking-tight">{{ totalActivos }}</p>
        <p class="mt-0.5 text-xs text-emerald-600/70">Habilitadas para venta</p>
      </div>

      <!-- Inactivas -->
      <div class="relative overflow-hidden rounded-2xl border border-rose-100 bg-white p-4 shadow-sm hover:shadow-md transition-all duration-200">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-rose-700 uppercase tracking-wider">Inactivas</span>
          <div class="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
            <XCircle class="h-4 w-4" />
          </div>
        </div>
        <p class="mt-2 text-2xl font-black text-rose-600 tracking-tight">{{ totalInactivos }}</p>
        <p class="mt-0.5 text-xs text-rose-600/70">Deshabilitadas</p>
      </div>
    </div>

    <!-- Toolbar de Búsqueda -->
    <div class="flex items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-2xl border border-gray-200/90 shadow-sm">
      <div class="relative flex-1">
        <Search class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          :value="busqueda"
          type="text"
          maxlength="100"
          placeholder="Buscar por nombre de prenda, color, tipo o categoría..."
          aria-label="Buscar producto"
          class="w-full pl-10 pr-9 py-2 text-sm rounded-xl border border-gray-200 focus:border-corporativo-rosa focus:ring-2 focus:ring-corporativo-rosa/20 focus:outline-none transition"
          @input="emit('update:busqueda', $event.target.value)"
        />
        <button
          v-if="busqueda"
          type="button"
          class="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
          @click="emit('update:busqueda', '')"
        >
          <X class="h-3.5 w-3.5" />
        </button>
      </div>

      <div class="hidden sm:flex items-center text-xs font-semibold text-gray-500 whitespace-nowrap px-1">
        {{ productos.length }} prenda{{ productos.length === 1 ? '' : 's' }}
      </div>
    </div>
  </div>
</template>
