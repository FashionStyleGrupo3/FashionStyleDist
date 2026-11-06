<script setup>
import { computed, ref, watch } from 'vue';
import { Ruler, ShoppingBag, Tag } from 'lucide-vue-next';
import { usePromociones } from '@/composables/usePromociones';
import GaleriaProducto from '@/components/escaparate/GaleriaProducto.vue';
import SelectorTallas from '@/components/escaparate/SelectorTallas.vue';
import SelectorColores from '@/components/escaparate/SelectorColores.vue';
import SelectorCantidad from '@/components/escaparate/SelectorCantidad.vue';
import ModalGuiaMedidas from '@/components/escaparate/ModalGuiaMedidas.vue';
import { useCarritoStore } from '@/stores/carrito';
import { useFormatoMoneda } from '@/composables/useFormatoMoneda';
import { useNotificacion } from '@/composables/useNotificacion';

const props = defineProps({
  producto: { type: Object, required: true },
  // Versiones de la prenda en otros colores: [{ id, color, disponible }]
  colores: { type: Array, default: () => [] }
});

const carritoStore = useCarritoStore();
const { formatearCOP } = useFormatoMoneda();
const { notificarExito, notificarError } = useNotificacion();

const varianteSeleccionada = ref(null);
const imagenActiva = ref(null);
const cantidadDeseada = ref(1);
const guiaAbierta = ref(false);

const variantes = computed(() => Array.isArray(props.producto?.variantes) ? props.producto.variantes : []);
const imagenes = computed(() => Array.isArray(props.producto?.imagenes) ? props.producto.imagenes : []);
const stockDisponible = computed(() => Math.max(0, Number(varianteSeleccionada.value?.stock) || 0));

const precioUnitario = computed(() => {
  const precio = varianteSeleccionada.value?.precio_venta ??
    varianteSeleccionada.value?.precio ??
    props.producto?.precio_venta ??
    props.producto?.precio_base;
  return Number(precio) || 0;
});

const productoRef = computed(() => props.producto);
const { infoPrecio, tieneDescuento } = usePromociones(productoRef, precioUnitario);
const precioFinal = computed(() => infoPrecio.value.precioFinal);

const totalLinea = computed(() => precioFinal.value * cantidadDeseada.value);

const etiquetaCategoria = computed(() => {
  if (!props.producto) return 'Colección FashionStyle';
  const cat = props.producto.categoria;
  const catalogo = props.producto.catalogo;
  const nombreCat = typeof cat === 'object' ? cat?.nombre : cat;
  const nombreCatalogo = typeof catalogo === 'object' ? catalogo?.nombre : catalogo;
  return [nombreCat, nombreCatalogo].filter(Boolean).join(' · ') || 'Colección FashionStyle';
});

function reiniciarSeleccion() {
  varianteSeleccionada.value = variantes.value.find(variante => Number(variante.stock) > 0) || variantes.value[0] || null;
  imagenActiva.value = imagenes.value.find(imagen => imagen?.es_principal) || imagenes.value[0] || null;
  cantidadDeseada.value = 1;
}

watch(
  () => props.producto?.id_producto || props.producto?.id,
  reiniciarSeleccion,
  { immediate: true }
);

watch(
  () => variantes.value.map(variante => `${variante.id_variante || variante.id}:${variante.talla}:${variante.stock}`).join('|'),
  () => {
    const idActual = varianteSeleccionada.value?.id_variante || varianteSeleccionada.value?.id;
    const varianteActualizada = variantes.value.find(
      variante => (variante.id_variante || variante.id) === idActual
    );

    if (varianteActualizada) {
      varianteSeleccionada.value = varianteActualizada;
      if (Number(varianteActualizada.stock) > 0) {
        cantidadDeseada.value = Math.min(cantidadDeseada.value, Number(varianteActualizada.stock));
      }
    } else if (variantes.value.length) {
      varianteSeleccionada.value = variantes.value.find(variante => Number(variante.stock) > 0) || variantes.value[0];
      cantidadDeseada.value = 1;
    }
  },
  { immediate: true }
);

function alCambiarTalla(variante) {
  varianteSeleccionada.value = variante;
  cantidadDeseada.value = 1;
}

function agregarAMiSeleccion() {
  if (!varianteSeleccionada.value) {
    notificarError('Selecciona una talla para continuar.');
    return;
  }

  if (stockDisponible.value < 1) {
    notificarError('La talla seleccionada está agotada.');
    return;
  }

  const cantidadFinal = Math.min(
    stockDisponible.value,
    Math.max(1, Math.floor(Number(cantidadDeseada.value) || 1))
  );

  const agregarItem = carritoStore.agregarItem || carritoStore.agregarPrenda;
  if (typeof agregarItem !== 'function') {
    notificarError('No se encontró la accion para agregar productos al carrito.');
    return;
  }

  const varianteParaCarrito = {
    ...varianteSeleccionada.value,
    precio_original: precioUnitario.value,
    precio_venta: precioFinal.value,
    id_promocion: infoPrecio.value.promocion?.id ?? null
  };

  const agregado = agregarItem.call(carritoStore, props.producto, varianteParaCarrito, cantidadFinal);
  if (agregado === false) {
    notificarError('No fue posible agregar la prenda. Verifica el stock disponible.');
    return;
  }

  notificarExito(`${props.producto.nombre}${props.producto.color ? ` · ${props.producto.color}` : ''} (talla ${varianteSeleccionada.value.talla}) se añadió a tu bolsa.`);
}
</script>

<template>
  <section v-if="producto"
    class="mx-auto grid w-full min-w-0 max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-12 lg:px-8">
    <GaleriaProducto class="min-w-0" v-model="imagenActiva" :imagenes="imagenes" :nombre-producto="producto.nombre" />

    <div class="flex min-w-0 flex-col justify-center">
      <p class="text-xs font-bold uppercase tracking-[0.18em] text-corporativo-rosa [overflow-wrap:anywhere]">
        {{ etiquetaCategoria }}
      </p>
      <h1 class="mt-2 text-3xl font-extrabold tracking-tight text-gray-900 [overflow-wrap:anywhere] sm:text-4xl">
        {{ producto.nombre }}
      </h1>
      <p v-if="producto.descripcion" class="mt-4 leading-7 text-gray-600 [overflow-wrap:anywhere]">
        {{ producto.descripcion }}
      </p>

      <div class="mt-5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <p class="text-2xl font-extrabold" :class="tieneDescuento ? 'text-corporativo-rosa' : 'text-gray-900'">
          {{ formatearCOP(precioFinal) }}
        </p>
        <p v-if="tieneDescuento" class="text-base text-gray-400 line-through">{{ formatearCOP(precioUnitario) }}</p>
        <span v-if="tieneDescuento"
          class="rounded-full bg-corporativo-rosa px-2 py-0.5 text-xs font-bold text-white">-{{ infoPrecio.porcentaje }}%</span>
        <span class="text-xs text-gray-500">Precio por unidad</span>
      </div>
      <p v-if="tieneDescuento" class="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
        <Tag class="h-4 w-4" />
        {{ infoPrecio.promocion?.nombre || 'Promoción' }}: ahorras {{ formatearCOP(infoPrecio.ahorro) }} por unidad
      </p>

      <div v-if="colores.length" class="mt-7">
        <SelectorColores :opciones="colores" :id-actual="producto.id_producto || producto.id" />
      </div>

      <div class="mt-7">
        <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
          <span class="text-sm font-semibold text-gray-800">Talla</span>
          <button type="button"
            class="inline-flex items-center gap-1.5 text-sm font-semibold text-corporativo-rosa hover:underline"
            @click="guiaAbierta = true">
            <Ruler class="h-4 w-4" /> Guía de medidas
          </button>
        </div>
        <SelectorTallas v-model="varianteSeleccionada" :variantes="variantes" @cambio-talla="alCambiarTalla" />
      </div>

      <div class="mt-6 grid gap-5 sm:grid-cols-[auto_1fr] sm:items-end">
        <SelectorCantidad v-model="cantidadDeseada" :stock-maximo="stockDisponible" />
        <p class="text-sm text-gray-500 sm:pb-3">
          <template v-if="varianteSeleccionada && stockDisponible > 0">
            Stock disponible para {{ varianteSeleccionada.talla }}: <strong class="text-gray-800">{{ stockDisponible
              }}</strong>
          </template>
          <template v-else>
            Selecciona una talla disponible.
          </template>
        </p>
      </div>

      <div class="mt-6 rounded-xl bg-gray-50 p-4">
        <div class="flex items-center justify-between gap-4 text-sm">
          <span class="text-gray-600">Subtotal de la selección</span>
          <strong class="text-base text-gray-900">{{ formatearCOP(totalLinea) }}</strong>
        </div>
      </div>

      <button type="button" :disabled="!varianteSeleccionada || stockDisponible < 1"
        class="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-corporativo-rosa px-5 py-3.5 font-bold text-white shadow-md transition hover:bg-corporativo-rosa-hover focus:outline-none focus:ring-2 focus:ring-pink-300 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        @click="agregarAMiSeleccion">
        <ShoppingBag class="h-5 w-5" /> Añadir a mi bolsa
      </button>

      <p class="mt-3 text-xs leading-5 text-gray-500">
        La cantidad no puede superar el stock disponible de la talla seleccionada.
      </p>
    </div>

    <ModalGuiaMedidas :abierto="guiaAbierta" @cerrar="guiaAbierta = false" />
  </section>
</template>