<script setup>
// -> Componente ListaCotizacion
import { useCarritoStore } from '@/stores/carrito';
import { useFormatoMoneda } from '@/composables/useFormatoMoneda';

const carritoStore = useCarritoStore();
const { formatearCOP } = useFormatoMoneda();
</script>

<template>
  <div class="lista-cotizacion space-y-3">
    <div
      v-for="item in carritoStore.items"
      :key="item.varianteId"
      class="flex items-center justify-between gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100"
    >
      <div class="flex items-center gap-3">
        <img
          :src="item.imagen || '/img/prenda-respaldo.svg'"
          :alt="item.nombre"
          class="w-12 h-12 rounded-lg object-cover bg-white border border-gray-200"
          @error="$event.target.src = '/img/prenda-respaldo.svg'"
        />
        <div>
          <p class="font-medium text-sm text-gray-900 leading-tight">{{ item.nombre }}</p>
          <p class="text-xs text-gray-500 mt-0.5">Talla: <span class="font-semibold text-gray-700">{{ item.talla }}</span></p>
          <p class="text-xs font-bold text-corporativo-rosa mt-0.5">{{ formatearCOP(item.precio) }}</p>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <span class="text-xs text-gray-600 bg-white px-2 py-1 border rounded font-semibold">
          x{{ item.cantidad }}
        </span>
        <button
          type="button"
          @click="carritoStore.eliminarPrenda(item.varianteId)"
          class="text-xs text-red-500 hover:text-red-700 font-medium px-1"
          title="Quitar"
        >
          Quitar
        </button>
      </div>
    </div>
  </div>
</template>
