<script setup>
// -> Componente MenuFiltros
// Arriba: pestañas de categorías. Abajo: colecciones + lo que pongas en el <slot> (orden, total...)
import { ref, onMounted } from 'vue';
import { useRecargaAutomatica } from '@/composables/useRecargaAutomatica';
import { obtenerCategorias, obtenerCatalogos } from '@/services/clasificacionServicio';

const props = defineProps({
  categoriaSeleccionada: { type: [Number, String, null], default: null },
  catalogoSeleccionado: { type: [Number, String, null], default: null },
  // { categorias: { id: total }, catalogos: { id: total }, total }
  conteos: { type: Object, default: () => ({ categorias: {}, catalogos: {} }) }
});

const emit = defineEmits(['cambiar-categoria', 'cambiar-catalogo']);

const categorias = ref([]);
const catalogos = ref([]);

async function cargarFiltros() {
  try {
    const [cats, cols] = await Promise.all([obtenerCategorias(), obtenerCatalogos()]);
    categorias.value = Array.isArray(cats) ? cats : [];
    catalogos.value = Array.isArray(cols) ? cols : [];
  } catch (e) {
    console.error('Error al cargar clasificaciones de catálogo:', e);
  }
}

const idDe = (item, campo) => item[campo] || item.id;
const esCategoria = (id) => Number(props.categoriaSeleccionada) === Number(id);
const esColeccion = (id) => Number(props.catalogoSeleccionado) === Number(id);

function seleccionarCategoria(cat) {
  const id = cat ? idDe(cat, 'id_categoria') : null;
  emit('cambiar-categoria', id, cat?.nombre || '');
}

// Tocar una colección activa la desactiva
function seleccionarCatalogo(col) {
  const id = idDe(col, 'id_catalogo');
  emit('cambiar-catalogo', esColeccion(id) ? null : id, esColeccion(id) ? '' : col.nombre);
}

onMounted(cargarFiltros);
useRecargaAutomatica(cargarFiltros, { recursos: ['categorias', 'catalogos', 'productos'] });
</script>

<template>
  <div class="fs-filtros">
    <!-- Pestañas de categorías -->
    <div class="fs-tabs" role="tablist">
      <button
        type="button"
        class="fs-tab"
        :class="{ activo: categoriaSeleccionada === null }"
        @click="seleccionarCategoria(null)"
      >
        Todo <small v-if="conteos.total">{{ conteos.total }}</small>
      </button>
      <button
        v-for="cat in categorias"
        :key="idDe(cat, 'id_categoria')"
        type="button"
        class="fs-tab"
        :class="{ activo: esCategoria(idDe(cat, 'id_categoria')) }"
        @click="seleccionarCategoria(cat)"
      >
        {{ cat.nombre }}
        <small v-if="conteos.categorias?.[idDe(cat, 'id_categoria')]">
          {{ conteos.categorias[idDe(cat, 'id_categoria')] }}
        </small>
      </button>
    </div>

    <!-- Colecciones + orden -->
    <div class="fs-barra">
      <div class="fs-colecciones">
        <span v-if="catalogos.length" class="fs-barra__etiqueta">colección</span>
        <button
          v-for="col in catalogos"
          :key="idDe(col, 'id_catalogo')"
          type="button"
          class="fs-pill"
          :class="{ activo: esColeccion(idDe(col, 'id_catalogo')) }"
          @click="seleccionarCatalogo(col)"
        >
          {{ col.nombre }}
        </button>
      </div>
      <div class="fs-barra__derecha">
        <slot />
      </div>
    </div>
  </div>
</template>