<template>
  <div class="space-y-6">
    <!-- Encabezado Principal del Módulo de Gestión de Prendas -->
    <div class="flex flex-col justify-between gap-4 border-b border-gray-200 pb-5 md:flex-row md:items-end">
      <div>
        <div class="flex items-center gap-2">
          <span class="inline-flex items-center gap-1 rounded-full bg-pink-50 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[0.2em] text-corporativo-rosa border border-pink-100">
            Catálogo Comercial & Moda
          </span>
        </div>
        <h1 class="mt-2 text-2xl sm:text-3xl font-extrabold font-titulos text-gray-900 tracking-tight">
          Administración de Prendas
        </h1>
        <p class="mt-1 text-sm text-gray-500 max-w-2xl">
          Crea, edita y controla existencias, variantes de tallas y visibilidad de tus colecciones en tienda.
        </p>
      </div>

      <!-- Botones de Acción Superiores -->
      <div class="flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          class="inline-flex items-center justify-center gap-2 rounded-xl border border-pink-200 bg-pink-50/50 px-4 py-2.5 text-sm font-bold text-corporativo-rosa shadow-sm hover:bg-pink-50 active:scale-95 transition"
          @click="modalPromocionesAbierto = true"
        >
          <Tag class="h-4 w-4" />
          <span>Promociones</span>
        </button>

        <button
          type="button"
          :disabled="cargandoProductos"
          class="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 shadow-sm hover:bg-gray-50 active:scale-95 disabled:opacity-50 transition"
          @click="cargarProductos"
        >
          <RefreshCw
            class="h-4 w-4"
            :class="{ 'animate-spin': cargandoProductos }"
          />
          <span>Actualizar</span>
        </button>

        <button
          type="button"
          class="inline-flex items-center justify-center gap-2 rounded-xl bg-corporativo-rosa px-4 py-2.5 text-sm font-bold text-white shadow-sm shadow-pink-500/20 hover:opacity-95 active:scale-95 transition"
          @click="abrirNuevaPrenda"
        >
          <Plus class="h-4 w-4" />
          <span>Nueva prenda</span>
        </button>
      </div>
    </div>

    <!-- Resumen de Métricas Ejecutivas y Buscador -->
    <ResumenEstadisticas
      :productos="productos"
      :busqueda="busqueda"
      @update:busqueda="busqueda = $event"
    />

    <!-- Estado de Carga -->
    <div
      v-if="cargandoProductos"
      class="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-gray-200/90 bg-white shadow-sm"
    >
      <div class="h-8 w-8 animate-spin rounded-full border-2 border-corporativo-rosa border-t-transparent"></div>
      <p class="mt-3 text-sm font-semibold text-gray-700">Cargando catálogo de prendas...</p>
      <p class="text-xs text-gray-400">Sincronizando fotos, inventario y variantes</p>
    </div>

    <!-- Estado de Error -->
    <div
      v-else-if="errorCargaProductos"
      class="flex items-center justify-between rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800 shadow-sm"
      role="alert"
    >
      <div class="flex items-center gap-2.5">
        <AlertCircle class="h-5 w-5 text-red-600 shrink-0" />
        <span>{{ errorCargaProductos }}</span>
      </div>
      <button
        type="button"
        class="inline-flex items-center gap-1 text-xs font-bold underline hover:text-red-900 transition"
        @click="cargarProductos"
      >
        Reintentar
      </button>
    </div>

    <!-- Estado Vacío -->
    <div
      v-else-if="productosFiltrados.length === 0"
      class="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-gray-200/90 bg-white shadow-sm"
    >
      <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-pink-50 text-corporativo-rosa">
        <Shirt class="h-7 w-7" />
      </div>
      <p class="mt-3 text-base font-bold text-gray-800">
        {{ productos.length ? 'No se encontraron prendas' : 'Todavía no hay prendas registradas' }}
      </p>
      <p class="mt-1 max-w-sm text-xs text-gray-500">
        {{ productos.length ? 'Intenta modificar los términos de búsqueda para encontrar lo que necesitas.' : 'Empieza agregando tu primera prenda con variantes de talla y fotos de alta calidad.' }}
      </p>
      <button
        v-if="!productos.length"
        type="button"
        class="mt-4 inline-flex items-center gap-2 rounded-xl bg-corporativo-rosa px-4 py-2 text-xs font-bold text-white shadow-sm hover:opacity-95 transition"
        @click="abrirNuevaPrenda"
      >
        <Plus class="h-4 w-4" />
        <span>Agregar primera prenda</span>
      </button>
    </div>

    <!-- Cuadrícula de Prendas -->
    <section v-else class="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      <ProductoCard
        v-for="p in productosFiltrados"
        :key="p.id_producto || p.id"
        :producto="p"
        @toggle-active="cambiarEstadoActivo(p, $event)"
        @toggle-published="cambiarEstadoPublicado(p, $event)"
        @open="abrirModal"
      />
    </section>

    <!-- Modal de Detalle de Prenda -->
    <ModalDetallePrenda
      :visible="mostrarModal"
      :producto="productoActual"
      :eliminando="eliminandoProducto"
      @close="cerrarModal"
      @edit="editarProducto"
      @delete="borrarProducto"
    />

    <!-- Modal Formulario de Creación / Edición de Prenda -->
    <ModalFormularioPrenda
      :visible="mostrarModalEditar"
      :modo="modoFormulario"
      :formulario="formulario"
      :categorias="categorias"
      :catalogos="catalogos"
      :permitir-crear-opciones="modoFormulario === 'crear'"
      :creando-categoria="creandoCategoria"
      :creando-catalogo="creandoCatalogo"
      :variantes="variantes"
      :imagenes="imagenes"
      :error-imagenes="errorImagenes"
      :error-opciones-formulario="errorOpcionesFormulario"
      :error-formulario="errorFormulario"
      :guardando="guardando"
      :reintentando-imagenes="Boolean(productoPendienteImagenesId)"
      @close="cerrarModalEditar"
      @drop-archivos="agregarArchivos($event)"
      @select-archivos="elegirArchivos"
      @marcar-portada="marcarPortada"
      @quitar-imagen="quitarImagen"
      @agregar-variante="agregarVariante"
      @quitar-variante="quitarVariante"
      @guardar="guardarPrenda"
      @reintentar-imagenes="reintentarGuardadoImagenes"
      @refresh-categorias="cargarOpcionesFormulario"
      @crear-categoria="crearCategoria"
      @crear-catalogo="crearCatalogo"
      @update:formulario="formulario = $event"
    />

    <!-- Modal de Promociones -->
    <ModalPromociones
      :abierto="modalPromocionesAbierto"
      :productos="productos"
      @cerrar="modalPromocionesAbierto = false"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { Tag, Plus, RefreshCw, Shirt, AlertCircle } from 'lucide-vue-next';
import ResumenEstadisticas from '@/components/gestionPrendas/ResumenEstadisticas.vue';
import ProductoCard from '@/components/gestionPrendas/ProductoCard.vue';
import ModalDetallePrenda from '@/components/gestionPrendas/ModalDetallePrenda.vue';
import ModalFormularioPrenda from '@/components/gestionPrendas/ModalFormularioPrenda.vue';
import ModalPromociones from '@/components/admin/ModalPromociones.vue';
import { useGestionPrendas } from '@/composables/useGestionPrendas';

const modalPromocionesAbierto = ref(false);

const {
  productos,
  categorias,
  catalogos,
  creandoCategoria,
  creandoCatalogo,
  cargandoProductos,
  errorCargaProductos,
  mostrarModal,
  mostrarModalEditar,
  modoFormulario,
  guardando,
  eliminandoProducto,
  errorFormulario,
  productoPendienteImagenesId,
  errorOpcionesFormulario,
  productoActual,
  busqueda,
  imagenes,
  errorImagenes,
  variantes,
  formulario,
  productosFiltrados,
  abrirSelectorArchivos,
  agregarArchivos,
  elegirArchivos,
  marcarPortada,
  quitarImagen,
  agregarVariante,
  quitarVariante,
  cerrarModal,
  abrirNuevaPrenda,
  cerrarModalEditar,
  editarProducto,
  stockTotal,
  borrarProducto,
  guardarPrenda,
  reintentarGuardadoImagenes,
  crearCategoria,
  crearCatalogo,
  obtenerPrimeraImagen,
  precioDesde,
  cargarProductos,
  cambiarEstadoActivo,
  cambiarEstadoPublicado,
  cargarOpcionesFormulario,
  abrirModal,
  resolverRuta
} = useGestionPrendas();
</script>
