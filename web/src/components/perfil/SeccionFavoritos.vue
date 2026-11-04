<script setup>
import { computed, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { Heart, AlertCircle } from 'lucide-vue-next';
import TarjetaProducto from '@/components/escaparate/TarjetaProducto.vue';
import { useFavoritosStore } from '@/stores/favoritos';
import { obtenerProductos } from '@/services/productoServicio';

const favoritosStore = useFavoritosStore();

const catalogo = ref([]);
const cargando = ref(true);
const error = ref('');

const disponibles = computed(() =>
  catalogo.value.filter((p) => favoritosStore.esFavorito(p.id_producto))
);

// Favoritos cuya prenda ya no está publicada o activa
const noDisponibles = computed(() =>
  cargando.value ? 0 : Math.max(0, favoritosStore.total - disponibles.value.length)
);

function limpiarNoDisponibles() {
  const vigentes = new Set(catalogo.value.map((p) => Number(p.id_producto)));
  favoritosStore.ids
    .filter((id) => !vigentes.has(id))
    .forEach((id) => favoritosStore.alternar(id));
}

async function cargar() {
  cargando.value = true;
  error.value = '';
  try {
    catalogo.value = await obtenerProductos();
  } catch {
    error.value = 'No se pudieron cargar tus favoritos.';
  } finally {
    cargando.value = false;
  }
}

onMounted(cargar);
</script>

<template>
  <section class="space-y-5">
    <div>
      <h2 class="text-lg font-bold text-gray-900">Mis favoritos</h2>
      <p class="text-xs text-gray-500">Las prendas que guardaste para ver o comprar despuís.</p>
    </div>

    <div v-if="cargando" class="rounded-2xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500 shadow-sm">
      Cargando tus favoritos...
    </div>

    <div v-else-if="error" class="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
      <AlertCircle class="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
      <div class="flex-1">
        <p class="font-medium">{{ error }}</p>
        <button type="button" class="mt-2 text-xs font-bold underline" @click="cargar">Reintentar</button>
      </div>
    </div>

    <template v-else>
      <div v-if="noDisponibles > 0"
        class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        <span class="font-medium">{{ noDisponibles }} de tus favoritos ya no está(n) disponible(s).</span>
        <button type="button" class="text-xs font-bold underline" @click="limpiarNoDisponibles">Quitarlos</button>
      </div>

      <div v-if="disponibles.length === 0"
        class="rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm">
        <Heart class="mx-auto h-10 w-10 text-gray-300" />
        <h3 class="mt-3 text-base font-bold text-gray-900">Año no tienes favoritos</h3>
        <p class="mt-1 text-sm text-gray-500">Toca el Corazon en cualquier prenda para guardarla aquí.</p>
        <RouterLink to="/catalogo"
          class="mt-5 inline-flex rounded-xl bg-corporativo-rosa px-5 py-2.5 text-sm font-bold text-white shadow-md hover:bg-pink-700">
          Explorar el catálogo
        </RouterLink>
      </div>

      <div v-else class="fs-grid">
        <TarjetaProducto v-for="p in disponibles" :key="p.id_producto" :producto="p" />
      </div>
    </template>
  </section>
</template>