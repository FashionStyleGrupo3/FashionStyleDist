<script setup>
// -> Componente VistaClasificacion
import { onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { Sparkles } from 'lucide-vue-next';
import { useFiltrosStore } from '@/stores/filtros';
import MenuFiltros from '@/components/escaparate/MenuFiltros.vue';
import CuadriculaProductos from '@/components/escaparate/CuadriculaProductos.vue';

const route = useRoute();
const filtrosStore = useFiltrosStore();

function actualizarCategoria(id) {
  filtrosStore.establecerCategoria(id);
}

function actualizarCatalogo(id) {
  filtrosStore.establecerCatalogo(id);
}

onMounted(() => {
  if (route.query.categoria) {
    filtrosStore.establecerCategoria(Number(route.query.categoria));
  }
  if (route.query.catalogo) {
    filtrosStore.establecerCatalogo(Number(route.query.catalogo));
  }
});
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
    <div class="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <div class="flex items-center gap-2 mb-1">
          <span class="p-1.5 rounded-lg bg-pink-100 text-corporativo-rosa">
            <Sparkles class="w-4 h-4" />
          </span>
          <h1 class="text-2xl sm:text-3xl font-extrabold font-titulos text-gray-900 tracking-tight">
            Catálogo & Clasificación
          </h1>
        </div>
        <p class="text-xs sm:text-sm text-gray-500">
          Explora las colecciones exclusivas y clasificaciones textiles de FashionStyle.
        </p>
      </div>
    </div>

    <!-- Barra de filtros interactiva -->
    <div class="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
      <MenuFiltros
        :categoria-seleccionada="filtrosStore.categoriaId"
        :catalogo-seleccionado="filtrosStore.catalogoId"
        @cambiar-categoria="actualizarCategoria"
        @cambiar-catalogo="actualizarCatalogo"
      />
    </div>

    <!-- Cuadrícula reactiva de productos filtrados -->
    <CuadriculaProductos
      :categoria-id="filtrosStore.categoriaId"
      :catalogo-id="filtrosStore.catalogoId"
      :busqueda="filtrosStore.busqueda"
      :orden="filtrosStore.orden"
      @limpiar-filtros="filtrosStore.limpiarFiltros()"
    />
  </div>
</template>
