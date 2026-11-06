<script setup>
// -> Componente VistaDetallePrenda
import { ref, computed, onMounted, watch } from 'vue';
import { useRecargaAutomatica } from '@/composables/useRecargaAutomatica';
import { useRoute, useRouter } from 'vue-router';
import { obtenerProducto, obtenerProductos } from '@/services/productoServicio';
import { claveNombrePrenda } from '@/utils/coloresPrenda';
import VisorDetalleProducto from '@/components/escaparate/VisorDetalleProducto.vue';

const route = useRoute();
const router = useRouter();

const producto = ref(null);
const cargando = ref(false);
const error = ref(null);
const catalogo = ref([]);

// Cada color registrado en Gestión de Prendas es una prenda con el mismo nombre.
const opcionesColor = computed(() => {
  if (!producto.value) return [];
  const clave = claveNombrePrenda(producto.value.nombre);
  const hermanas = catalogo.value.filter(
    (p) => claveNombrePrenda(p.nombre) === clave && String(p.id_producto) !== String(producto.value.id_producto)
  );
  return [producto.value, ...hermanas]
    .filter((p) => String(p.color || '').trim())
    .map((p) => ({
      id: p.id_producto,
      color: String(p.color).trim(),
      disponible: (p.variantes || []).some((v) => Number(v.stock) > 0),
    }));
});

async function cargarColores() {
  try {
    catalogo.value = await obtenerProductos();
  } catch {
    catalogo.value = [];
  }
}

async function cargarProducto(id) {
  cargando.value = true;
  error.value = null;
  producto.value = null;

  try {
    const dato = await obtenerProducto(id);
    if (!dato) {
      error.value = 'Prenda no encontrada.';
      return;
    }
    producto.value = dato;
  } catch (e) {
    console.error('Error al cargar prenda:', e);
    error.value = 'No se pudo cargar la prenda solicitada desde el servidor.';
  } finally {
    cargando.value = false;
  }
}

onMounted(() => {
  cargarColores();
  const id = route.params.id;
  if (id) {
    cargarProducto(id);
  } else {
    error.value = 'Identificador no especificado en la ruta.';
  }
});

// Recarga silenciosa (precio, stock, imágenes) sin vaciar la vista
async function refrescarProducto() {
  const id = route.params.id;
  if (!id || cargando.value) return;
  try {
    const dato = await obtenerProducto(id);
    if (dato) producto.value = dato;
  } catch (e) {
    console.warn('No se pudo refrescar la prenda:', e);
  }
}

useRecargaAutomatica(refrescarProducto, { recursos: ['productos', 'categorias', 'catalogos', 'promociones', 'inventarios', 'ventas', 'pedidos', 'ordenes-produccion'] });

watch(
  () => route.params.id,
  (nuevoId) => {
    if (nuevoId) cargarProducto(nuevoId);
  }
);
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 py-10">
    <div v-if="cargando" class="flex flex-col items-center justify-center py-24 text-gray-500">
      <div class="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-corporativo-rosa"></div>
      <p class="mt-4 text-sm">Cargando prenda desde el servidor...</p>
    </div>

    <div v-else-if="error" class="flex flex-col items-center justify-center py-24 text-center">
      <p class="text-lg font-semibold text-red-500">{{ error }}</p>
      <button
        type="button"
        class="mt-6 rounded-lg bg-corporativo-rosa px-5 py-2.5 text-sm font-semibold text-white hover:bg-corporativo-rosa-hover"
        @click="router.push({ name: 'inicio' })"
      >
        Volver al inicio
      </button>
    </div>

    <VisorDetalleProducto v-else-if="producto" :producto="producto" :colores="opcionesColor" />
  </div>
</template>