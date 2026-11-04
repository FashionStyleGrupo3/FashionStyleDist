<script setup>
// -> Componente CuadriculaProductos
import { ref, computed, watch } from 'vue';
import { Shirt, RotateCcw, AlertCircle, ArrowLeft, ArrowRight } from 'lucide-vue-next';
import TarjetaProducto from './TarjetaProducto.vue';
import { obtenerProductos } from '@/services/productoServicio';
import { useRecargaAutomatica } from '@/composables/useRecargaAutomatica';
import { useFavoritosStore } from '@/stores/favoritos';

const props = defineProps({
  categoriaId: { type: [Number, String, null], default: null },
  catalogoId: { type: [Number, String, null], default: null },
  busqueda: { type: String, default: '' },
  orden: { type: String, default: 'recientes' },
  soloDisponibles: { type: Boolean, default: false },
  porPagina: { type: Number, default: 8 }
});

const emit = defineEmits(['total-actualizado', 'limpiar-filtros']);

const favoritosStore = useFavoritosStore();
const productosCrudos = ref([]);
const cargando = ref(true);
const error = ref('');
const pagina = ref(1);
let conservarPagina = false;

// Carga de productos desde el backend con los filtros activos
async function cargar() {
  cargando.value = true;
  error.value = '';
  try {
    productosCrudos.value = await obtenerProductos({
      categoriaId: props.categoriaId,
      catalogoId: props.catalogoId,
      busqueda: props.busqueda
    });
  } catch (e) {
    console.error('Error al cargar prendas en el escaparate:', e);
    error.value = 'No se pudieron cargar las prendas del escaparate. Por favor intenta de nuevo.';
  } finally {
    cargando.value = false;
  }
}

function obtenerPrecioMinimo(producto) {
  const precios = (producto.variantes || [])
    .map((v) => Number(v.precio_venta || v.precio || 0))
    .filter((p) => Number.isFinite(p) && p > 0);
  return precios.length > 0 ? Math.min(...precios) : 0;
}

function calcularStockTotal(producto) {
  return (producto.variantes || []).reduce((t, v) => t + Number(v.stock || v.stock_actual || 0), 0);
}

// Filtros extra (stock, favoritos) + ordenamiento
const productosProcesados = computed(() => {
  let lista = [...productosCrudos.value];

  if (props.soloDisponibles) lista = lista.filter((p) => calcularStockTotal(p) > 0);
  if (favoritosStore.soloFavoritos) lista = lista.filter((p) => favoritosStore.esFavorito(p.id_producto));

  if (props.orden === 'precio-asc') {
    lista.sort((a, b) => obtenerPrecioMinimo(a) - obtenerPrecioMinimo(b));
  } else if (props.orden === 'precio-desc') {
    lista.sort((a, b) => obtenerPrecioMinimo(b) - obtenerPrecioMinimo(a));
  } else if (props.orden === 'nombre-az') {
    lista.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
  } else {
    lista.sort((a, b) => {
      const fechaA = new Date(a.created_at || 0).getTime();
      const fechaB = new Date(b.created_at || 0).getTime();
      return (fechaB - fechaA) || ((b.id_producto || 0) - (a.id_producto || 0));
    });
  }
  return lista;
});

// Paginacion en el cliente
const totalPaginas = computed(() => Math.max(1, Math.ceil(productosProcesados.value.length / props.porPagina)));
const desde = computed(() => (pagina.value - 1) * props.porPagina);
const productosPagina = computed(() => productosProcesados.value.slice(desde.value, desde.value + props.porPagina));

function irAPagina(n) {
  pagina.value = Math.min(Math.max(1, n), totalPaginas.value);
  document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' });
}

watch(productosProcesados, (nuevos) => {
  if (conservarPagina) {
    conservarPagina = false;
    // Si la página actual ya no existe (se quitaron prendas), se ajusta
    const paginas = Math.max(1, Math.ceil(nuevos.length / props.porPagina));
    if (pagina.value > paginas) pagina.value = paginas;
  } else {
    pagina.value = 1;
  }
  emit('total-actualizado', nuevos.length);
}, { immediate: true });

watch(() => [props.categoriaId, props.catalogoId, props.busqueda], cargar, { immediate: true });

// Recarga silenciosa: sin spinner y sin volver a la página 1.
// Así el cliente ve los cambios del admin (precios, stock, prendas nuevas) sin recargar el navegador.
async function refrescarSilencioso() {
  if (cargando.value) return;
  try {
    const lista = await obtenerProductos({
      categoriaId: props.categoriaId,
      catalogoId: props.catalogoId,
      busqueda: props.busqueda
    });
    conservarPagina = true;
    productosCrudos.value = lista;
    error.value = '';
  } catch (e) {
    console.warn('No se pudo refrescar el escaparate:', e);
  }
}

useRecargaAutomatica(refrescarSilencioso, {
  recursos: ['productos', 'categorias', 'catalogos', 'promociones', 'inventarios', 'ventas', 'pedidos', 'ordenes-produccion']
});
</script>

<template>
  <section>
    <!-- Cargando -->
    <div v-if="cargando" class="fs-grid">
      <div v-for="n in porPagina" :key="n" class="fs-esqueleto"></div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="fs-estado">
      <AlertCircle class="w-12 h-12 mx-auto text-red-400" />
      <h3>{{ error }}</h3>
      <p>Verifica que el servicio backend está en ejecucion.</p>
      <button type="button" class="fs-btn-negro" @click="cargar">
        <RotateCcw class="w-4 h-4" /> Reintentar carga
      </button>
    </div>

    <!-- Sin resultados -->
    <div v-else-if="productosProcesados.length === 0" class="fs-estado">
      <Shirt class="w-12 h-12 mx-auto text-stone-400" />
      <h3>{{ favoritosStore.soloFavoritos ? 'Año no tienes favoritos aquí' : 'No se encontraron prendas' }}</h3>
      <p>No hay prendas que coincidan con los filtros o la búsqueda. Prueba con otra categoría o restablece los filtros.</p>
      <button
        type="button"
        class="fs-btn-negro"
        @click="favoritosStore.soloFavoritos = false; emit('limpiar-filtros')"
      >
        <RotateCcw class="w-4 h-4" /> Restablecer filtros
      </button>
    </div>

    <!-- Cuadrícula -->
    <template v-else>
      <div class="fs-grid">
        <TarjetaProducto v-for="p in productosPagina" :key="p.id_producto || p.id" :producto="p" />
      </div>

      <div v-if="totalPaginas > 1" class="fs-paginacion">
        <button type="button" class="flecha" :disabled="pagina === 1" @click="irAPagina(pagina - 1)">
          <ArrowLeft class="w-4 h-4" />
        </button>
        <button
          v-for="n in totalPaginas"
          :key="n"
          type="button"
          :class="{ activo: n === pagina }"
          @click="irAPagina(n)"
        >
          {{ n }}
        </button>
        <button type="button" class="flecha" :disabled="pagina === totalPaginas" @click="irAPagina(pagina + 1)">
          <ArrowRight class="w-4 h-4" />
        </button>
      </div>

      <p class="fs-resumen-pag">
        Mostrando {{ desde + 1 }}-{{ desde + productosPagina.length }} de {{ productosProcesados.length }} productos
      </p>
    </template>
  </section>
</template>