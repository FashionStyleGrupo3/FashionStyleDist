<template>
  <div class="min-h-screen bg-[#fbf9f9] text-slate-900 antialiased">
    <main class="p-6 sm:p-8 xl:p-10">
      <div class="space-y-6">
        <div class="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h1 class="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">ADMINISTRAR PRENDAS</h1>
            <p class="mt-2 text-sm text-slate-500">Crea, edita y controla qué prendas están disponibles en tu catálogo.</p>
          </div>

          <div class="flex flex-wrap gap-3">
            <button
              type="button"
              class="inline-flex items-center justify-center gap-2 rounded-xl border border-pink-600 bg-white px-5 py-3 text-sm font-semibold text-pink-600 shadow-sm transition hover:bg-pink-50"
              @click="modalPromocionesAbierto = true"
            >
              <Tag class="h-4 w-4" />
              Promociones
            </button>

            <button
              type="button"
              class="inline-flex items-center justify-center rounded-xl bg-pink-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-pink-500"
              @click="abrirNuevaPrenda"
            >
              + agregar producto
            </button>
          </div>
        </div>

        <ResumenEstadisticas
          :productos="productos"
          :busqueda="busqueda"
          @update:busqueda="busqueda = $event"
        />

        <p v-if="cargandoProductos" class="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600" role="status">Cargando prendas...</p>
        <div v-else-if="errorCargaProductos" class="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          <p>{{ errorCargaProductos }}</p>
          <button type="button" class="mt-2 font-semibold underline" @click="cargarProductos">Reintentar</button>
        </div>
        <p v-else-if="productosFiltrados.length === 0" class="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
          {{ productos.length ? 'No hay prendas que coincidan con la búsqueda.' : 'Todavá no hay prendas registradas.' }}
        </p>

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
      </div>
    </main>

    <ModalDetallePrenda
      :visible="mostrarModal"
      :producto="productoActual"
      :eliminando="eliminandoProducto"
      @close="cerrarModal"
      @edit="editarProducto"
      @delete="borrarProducto"
    />

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

    <ModalPromociones
      :abierto="modalPromocionesAbierto"
      :productos="productos"
      @cerrar="modalPromocionesAbierto = false"
    />
  </div>
</template>
<script setup>
import { ref } from 'vue';
import { Tag } from 'lucide-vue-next';
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
