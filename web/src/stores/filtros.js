// -> Almacen de estado de filtros de prendas
import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useFiltrosStore = defineStore('filtros', () => {
  const categoriaId = ref(null);
  const catalogoId = ref(null);
  const busqueda = ref('');
  const orden = ref('recientes');

  function establecerCategoria(id) {
    categoriaId.value = id;
  }

  function establecerCatalogo(id) {
    catalogoId.value = id;
  }

  function establecerBusqueda(texto) {
    busqueda.value = texto;
  }

  function establecerOrden(nuevoOrden) {
    orden.value = nuevoOrden;
  }

  function limpiarFiltros() {
    categoriaId.value = null;
    catalogoId.value = null;
    busqueda.value = '';
    orden.value = 'recientes';
  }

  return {
    categoriaId,
    catalogoId,
    busqueda,
    orden,
    establecerCategoria,
    establecerCatalogo,
    establecerBusqueda,
    establecerOrden,
    limpiarFiltros
  };
});