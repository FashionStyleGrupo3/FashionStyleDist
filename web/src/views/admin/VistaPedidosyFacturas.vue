<script setup>
// -> Componente VistaPedidosyFacturas: Despacho de Pedidos y Facturación automática
import { ref, computed, onMounted } from 'vue';
import { useRecargaAutomatica } from '@/composables/useRecargaAutomatica';
import { useRoute } from 'vue-router';
import {
  Truck,
  Receipt,
  Search,
  RefreshCw,
  PackageCheck,
  Clock,
  CheckCircle2
} from 'lucide-vue-next';
import TablaPedidosAdmin from '@/components/pedidos/TablaPedidosAdmin.vue';
import ModalGestionDespacho from '@/components/pedidos/ModalGestionDespacho.vue';
import TablaFacturas from '@/components/facturas/TablaFacturas.vue';
import VisorFacturaFashion from '@/components/facturas/VisorFacturaFashion.vue';
import PaginadorTabla from '@/components/comunes/PaginadorTabla.vue';
import { listarPedidos } from '@/services/pedidoServicio';
import { listarFacturas } from '@/services/facturaServicio';
import { useNotificacion } from '@/composables/useNotificacion';
import { obtenerMensajeError } from '@/services/clienteApi';

const route = useRoute();
const { notificarError } = useNotificacion();

const pestanaActiva = ref('pedidos');

// Estado de Pedidos Online
const pedidos = ref([]);
const cargandoPedidos = ref(false);
const filtroEstadoPedido = ref('');
const busquedaPedido = ref('');
const paginaPedidos = ref(1);
const totalPaginasPedidos = ref(1);
const totalRegistrosPedidos = ref(0);
const pedidoEnGestion = ref(null);
const modalDespachoAbierto = ref(false);

// Estado de Facturas
const facturas = ref([]);
const cargandoFacturas = ref(false);
const busquedaFactura = ref('');
const paginaFacturas = ref(1);
const totalPaginasFacturas = ref(1);
const totalRegistrosFacturas = ref(0);

// Visor de Factura PDF
const visorFacturaAbierto = ref(false);
const facturaParaVisor = ref(null);
const pedidoParaVisor = ref(null);

const resumenPedidos = computed(() => {
  const lista = pedidos.value;
  return {
    pendientesDespacho: lista.filter((p) => ['Pagado', 'En_Preparacion'].includes(p.estado)).length,
    enTransito: lista.filter((p) => p.estado === 'Enviado').length,
    entregados: lista.filter((p) => p.estado === 'Entregado').length
  };
});

async function cargarPedidos() {
  cargandoPedidos.value = true;
  try {
    const res = await listarPedidos({
      pagina: paginaPedidos.value,
      estado: filtroEstadoPedido.value,
      buscar: busquedaPedido.value.trim()
    });
    pedidos.value = res.lista;
    paginaPedidos.value = res.paginaActual;
    totalPaginasPedidos.value = res.totalPaginas;
    totalRegistrosPedidos.value = res.totalRegistros;
  } catch (error) {
    notificarError(obtenerMensajeError(error, 'No se pudieron cargar los pedidos online.'));
  } finally {
    cargandoPedidos.value = false;
  }
}

async function cargarFacturas() {
  cargandoFacturas.value = true;
  try {
    const res = await listarFacturas({
      pagina: paginaFacturas.value,
      buscar: busquedaFactura.value.trim()
    });
    facturas.value = res.lista;
    paginaFacturas.value = res.paginaActual;
    totalPaginasFacturas.value = res.totalPaginas;
    totalRegistrosFacturas.value = res.totalRegistros;
  } catch (error) {
    notificarError(obtenerMensajeError(error, 'No se pudieron cargar las facturas.'));
  } finally {
    cargandoFacturas.value = false;
  }
}

function cambiarFiltroEstado(nuevoEstado) {
  filtroEstadoPedido.value = nuevoEstado;
  paginaPedidos.value = 1;
  cargarPedidos();
}

function cambiarPaginaPedidos(nuevaPagina) {
  paginaPedidos.value = nuevaPagina;
  cargarPedidos();
}

function cambiarPaginaFacturas(nuevaPagina) {
  paginaFacturas.value = nuevaPagina;
  cargarFacturas();
}

function abrirModalDespacho(pedido) {
  pedidoEnGestion.value = pedido;
  modalDespachoAbierto.value = true;
}

function alGuardarDespacho() {
  cargarPedidos();
  cargarFacturas();
}

function manejarVerFacturaPedido(pedido) {
  pedidoParaVisor.value = pedido;
  facturaParaVisor.value = { id: pedido.facturaId };
  visorFacturaAbierto.value = true;
}

onMounted(() => {
  if (route.query.tab && ['pedidos', 'facturas'].includes(route.query.tab)) {
    pestanaActiva.value = route.query.tab;
  }
  cargarPedidos();
  cargarFacturas();
});
useRecargaAutomatica(() => Promise.all([cargarPedidos(), cargarFacturas()]));
</script>

<template>
  <div class="space-y-6 max-w-full 2xl:max-w-[1600px] mx-auto">
    <!-- Encabezado principal -->
    <div class="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
      <div>
        <h1 class="text-2xl sm:text-3xl font-extrabold font-titulos text-gray-900 tracking-tight">
          Pedidos Online y Facturación automática
        </h1>
        <p class="mt-0.5 text-xs sm:text-sm text-gray-500">
          Las facturas se emiten automáticamente cuando el cliente realiza la compra. aquí gestionas el despacho y consultas los comprobantes.
        </p>
      </div>
    </div>

    <!-- Tarjetas de resumen rápido -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm flex items-center justify-between">
        <div>
          <p class="text-xs font-semibold uppercase tracking-wide text-gray-500">Por despachar</p>
          <p class="mt-1 text-2xl font-extrabold text-amber-600">{{ resumenPedidos.pendientesDespacho }}</p>
        </div>
        <div class="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
          <Clock class="h-5 w-5" />
        </div>
      </div>

      <div class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm flex items-center justify-between">
        <div>
          <p class="text-xs font-semibold uppercase tracking-wide text-gray-500">En tránsito</p>
          <p class="mt-1 text-2xl font-extrabold text-indigo-600">{{ resumenPedidos.enTransito }}</p>
        </div>
        <div class="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
          <Truck class="h-5 w-5" />
        </div>
      </div>

      <div class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm flex items-center justify-between">
        <div>
          <p class="text-xs font-semibold uppercase tracking-wide text-gray-500">Entregados</p>
          <p class="mt-1 text-2xl font-extrabold text-emerald-600">{{ resumenPedidos.entregados }}</p>
        </div>
        <div class="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
          <CheckCircle2 class="h-5 w-5" />
        </div>
      </div>

      <div class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm flex items-center justify-between">
        <div>
          <p class="text-xs font-semibold uppercase tracking-wide text-gray-500">Facturas automáticas</p>
          <p class="mt-1 text-2xl font-extrabold text-corporativo-rosa">{{ totalRegistrosFacturas }}</p>
        </div>
        <div class="flex h-11 w-11 items-center justify-center rounded-xl bg-pink-50 text-corporativo-rosa">
          <PackageCheck class="h-5 w-5" />
        </div>
      </div>
    </div>

    <!-- Conmutador de pestañas y buscador -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="inline-flex rounded-2xl border border-gray-200 bg-white p-1 shadow-sm">
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition"
          :class="pestanaActiva === 'pedidos' ? 'bg-corporativo-rosa text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'"
          @click="pestanaActiva = 'pedidos'"
        >
          <Truck class="h-4 w-4" />
          Pedidos Online ({{ totalRegistrosPedidos }})
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition"
          :class="pestanaActiva === 'facturas' ? 'bg-corporativo-rosa text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'"
          @click="pestanaActiva = 'facturas'"
        >
          <Receipt class="h-4 w-4" />
          Facturas Emitidas ({{ totalRegistrosFacturas }})
        </button>
      </div>

      <!-- Barra de búsqueda contextual -->
      <div class="flex items-center gap-2">
        <div v-if="pestanaActiva === 'pedidos'" class="relative flex-1 sm:w-72">
          <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              v-model="busquedaPedido"
              type="search"
              maxlength="100"
              placeholder="Buscar por #pedido, guía o cliente..."
              class="w-full rounded-xl border border-gray-300 bg-white pl-9 pr-3 py-2 text-xs sm:text-sm focus:border-corporativo-rosa focus:outline-none focus:ring-2 focus:ring-pink-100"
              @keyup.enter="paginaPedidos = 1; cargarPedidos()"
              @input="(e)=>{ busquedaPedido = String(e.target.value).replace(/[^\p{L}\p{M}\p{N} 0-9_-]/gu,'').slice(0,100); e.target.value = busquedaPedido; }"
            />
        </div>

        <div v-else class="relative flex-1 sm:w-72">
          <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              v-model="busquedaFactura"
              type="search"
              maxlength="100"
              placeholder="Buscar por N.º factura o cliente..."
              class="w-full rounded-xl border border-gray-300 bg-white pl-9 pr-3 py-2 text-xs sm:text-sm focus:border-corporativo-rosa focus:outline-none focus:ring-2 focus:ring-pink-100"
              @keyup.enter="paginaFacturas = 1; cargarFacturas()"
              @input="(e)=>{ busquedaFactura = String(e.target.value).replace(/[^\p{L}\p{M}\p{N} 0-9_-]/gu,'').slice(0,100); e.target.value = busquedaFactura; }"
            />
        </div>

        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
          @click="pestanaActiva === 'pedidos' ? cargarPedidos() : cargarFacturas()"
        >
          <RefreshCw
            class="h-4 w-4"
            :class="{ 'animate-spin': pestanaActiva === 'pedidos' ? cargandoPedidos : cargandoFacturas }"
          />
          Actualizar
        </button>
      </div>
    </div>

    <!-- Pestaña 1: Pedidos Online -->
    <TablaPedidosAdmin
      v-if="pestanaActiva === 'pedidos'"
      :pedidos="pedidos"
      :cargando="cargandoPedidos"
      :filtro-estado="filtroEstadoPedido"
      @cambiar-filtro="cambiarFiltroEstado"
      @gestionar="abrirModalDespacho"
      @ver-factura="manejarVerFacturaPedido"
    >
      <template #pie>
        <PaginadorTabla
          :pagina-actual="paginaPedidos"
          :total-paginas="totalPaginasPedidos"
          :total-registros="totalRegistrosPedidos"
          @cambiar-pagina="cambiarPaginaPedidos"
        />
      </template>
    </TablaPedidosAdmin>

    <!-- Pestaña 2: Facturas -->
    <TablaFacturas
      v-else
      :facturas="facturas"
      :cargando="cargandoFacturas"
    >
      <template #pie>
        <PaginadorTabla
          :pagina-actual="paginaFacturas"
          :total-paginas="totalPaginasFacturas"
          :total-registros="totalRegistrosFacturas"
          @cambiar-pagina="cambiarPaginaFacturas"
        />
      </template>
    </TablaFacturas>

    <!-- Modales -->
    <ModalGestionDespacho
      :abierto="modalDespachoAbierto"
      :pedido="pedidoEnGestion"
      @cerrar="modalDespachoAbierto = false"
      @guardado="alGuardarDespacho"
    />

    <VisorFacturaFashion
      :abierto="visorFacturaAbierto"
      :factura="facturaParaVisor"
      :pedido="pedidoParaVisor"
      @cerrar="visorFacturaAbierto = false"
    />
  </div>
</template>
