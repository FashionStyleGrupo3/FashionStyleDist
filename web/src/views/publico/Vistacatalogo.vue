<script setup>
// -> página del catálogo: /catalogo?categoria=3&catalogo=1
import { ref, computed, watch, onMounted } from 'vue';
import { useRecargaAutomatica } from '@/composables/useRecargaAutomatica';
import { useRoute, useRouter, RouterLink } from 'vue-router';
import { X } from 'lucide-vue-next';
import { useFiltrosStore } from '@/stores/filtros';
import { useFavoritosStore } from '@/stores/favoritos';
import { obtenerProductos } from '@/services/productoServicio';
import { obtenerCategorias, obtenerCatalogos } from '@/services/clasificacionServicio';
import MenuFiltros from '@/components/escaparate/MenuFiltros.vue';
import CuadriculaProductos from '@/components/escaparate/CuadriculaProductos.vue';

const route = useRoute();
const router = useRouter();
const filtrosStore = useFiltrosStore();
const favoritosStore = useFavoritosStore();

const todos = ref([]);
const categorias = ref([]);
const colecciones = ref([]);
const totalEncontrados = ref(0);

// La URL manda: /catalogo?categoria=2 → filtra por esa categoría
watch(
  () => route.query,
  (q) => {
    filtrosStore.establecerCategoria(q.categoria ? Number(q.categoria) : null);
    filtrosStore.establecerCatalogo(q.catalogo ? Number(q.catalogo) : null);
  },
  { immediate: true }
);

// Al tocar un filtro se actualiza la URL (as se puede compartir el enlace)
function cambiarFiltro(clave, id) {
  const query = { ...route.query };
  if (id) query[clave] = id;
  else delete query[clave];
  router.push({ name: 'catalogo', query });
}

// Conteo de prendas por categoría y por colección
const conteos = computed(() => {
  const cat = {};
  const col = {};
  for (const p of todos.value) {
    const idCat = p.id_categoria ?? p.categoria_id ?? p.categoria?.id_categoria ?? p.categoria?.id;
    const idCol = p.id_catalogo ?? p.catalogo_id ?? p.catalogo?.id_catalogo ?? p.catalogo?.id;
    if (idCat) cat[idCat] = (cat[idCat] || 0) + 1;
    if (idCol) col[idCol] = (col[idCol] || 0) + 1;
  }
  return { categorias: cat, catalogos: col, total: todos.value.length };
});

const buscarNombre = (lista, campo, id) =>
  lista.find((x) => Number(x[campo] || x.id) === Number(id))?.nombre || '';

const nombreCategoria = computed(() => buscarNombre(categorias.value, 'id_categoria', filtrosStore.categoriaId));
const nombreColeccion = computed(() => buscarNombre(colecciones.value, 'id_catalogo', filtrosStore.catalogoId));

const titulo = computed(() => {
  if (favoritosStore.soloFavoritos) return 'Mis favoritos';
  return nombreCategoria.value || nombreColeccion.value || 'Todo el catálogo';
});

function limpiarTodo() {
  filtrosStore.limpiarFiltros();
  favoritosStore.soloFavoritos = false;
  router.push({ name: 'catalogo' });
}

// Carga de productos, categorías y colecciones (también se usa para recargar
// cuando el admin cambia algo en otra pestaña o el cliente vuelve a la pestaña)
async function cargarDatosTienda() {
  try {
    const [prods, cats, cols] = await Promise.all([obtenerProductos(), obtenerCategorias(), obtenerCatalogos()]);
    todos.value = prods;
    categorias.value = Array.isArray(cats) ? cats : [];
    colecciones.value = Array.isArray(cols) ? cols : [];
  } catch (e) {
    console.warn('No se pudieron cargar los conteos del catálogo:', e);
  }
}

onMounted(cargarDatosTienda);
useRecargaAutomatica(cargarDatosTienda, { recursos: ['productos', 'categorias', 'catalogos', 'promociones', 'inventarios', 'ventas', 'pedidos', 'ordenes-produccion'] });
</script>

<template>
  <div id="catalogo" style="scroll-margin-top: 130px">
    <!-- Cabecera de la página -->
    <section class="fs-cabecera">
      <div class="fs-contenedor">
        <nav class="fs-migas">
          <RouterLink to="/">Inicio</RouterLink> /
          <RouterLink :to="{ name: 'catalogo' }">Catálogo</RouterLink>
          <template v-if="titulo !== 'Todo el catálogo'"> / <span>{{ titulo }}</span></template>
        </nav>
        <h1>{{ titulo }}</h1>
        <p v-if="nombreCategoria && nombreColeccion">coleccion {{ nombreColeccion }}</p>
        <p v-else>Descubre tu estilo perfecto</p>
      </div>
    </section>

    <div class="fs-contenedor">
      <MenuFiltros
        :categoria-seleccionada="filtrosStore.categoriaId"
        :catalogo-seleccionado="filtrosStore.catalogoId"
        :conteos="conteos"
        @cambiar-categoria="(id) => cambiarFiltro('categoria', id)"
        @cambiar-catalogo="(id) => cambiarFiltro('catalogo', id)"
      >
        <!-- Lado derecho de la barra: orden y total -->
        <span class="fs-total">{{ totalEncontrados }} productos</span>
        <select
          class="fs-select"
          :value="filtrosStore.orden"
          @change="filtrosStore.establecerOrden($event.target.value)"
        >
          <option value="recientes">Mís recientes</option>
          <option value="precio-asc">Menor precio</option>
          <option value="precio-desc">Mayor precio</option>
          <option value="nombre-az">Nombre A-Z</option>
        </select>
      </MenuFiltros>

      <!-- Filtros activos que se pueden quitar -->
      <div v-if="filtrosStore.busqueda || favoritosStore.soloFavoritos" class="fs-activos">
        <button v-if="filtrosStore.busqueda" type="button" @click="filtrosStore.establecerBusqueda('')">
          Bísqueda: “{{ filtrosStore.busqueda }}” <X class="w-3.5 h-3.5" />
        </button>
        <button v-if="favoritosStore.soloFavoritos" type="button" @click="favoritosStore.soloFavoritos = false">
          Solo favoritos <X class="w-3.5 h-3.5" />
        </button>
      </div>

      <CuadriculaProductos
        :categoria-id="filtrosStore.categoriaId"
        :catalogo-id="filtrosStore.catalogoId"
        :busqueda="filtrosStore.busqueda"
        :orden="filtrosStore.orden"
        @total-actualizado="totalEncontrados = $event"
        @limpiar-filtros="limpiarTodo"
      />
    </div>
  </div>
</template>