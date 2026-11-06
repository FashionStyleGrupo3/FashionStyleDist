<script setup>
// -> Componente TablaPedidosAdmin con facturacion automática integrada
import { ref } from 'vue';
import { Truck, PackageSearch, Loader2, MapPin, Eye, ChevronDown } from 'lucide-vue-next';
import { useFormatoMoneda } from '@/composables/useFormatoMoneda';
import { ESTADOS_PEDIDO, infoEstadoPedido } from '@/services/pedidoServicio';

defineProps({
  pedidos: { type: Array, default: () => [] },
  cargando: { type: Boolean, default: false },
  filtroEstado: { type: String, default: '' }
});

const emit = defineEmits([
  'cambiar-filtro',
  'gestionar',
  'ver-factura'
]);

const { formatearCOP } = useFormatoMoneda();
const FLUJO_PEDIDO = ['Pendiente_Pago', 'Pagado', 'En_Preparacion', 'Enviado', 'Entregado'];
const pedidoAbierto = ref(null);

function formatearFecha(valor) {
  if (!valor) return '—';
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return valor;
  return fecha.toLocaleString('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}

function totalPrendas(pedido) {
  return (pedido.detalles || []).reduce((acc, d) => acc + (d.cantidad || 0), 0);
}

function alternarSeguimiento(id) {
  pedidoAbierto.value = pedidoAbierto.value === id ? null : id;
}

function pasoActual(estado) {
  return FLUJO_PEDIDO.indexOf(estado);
}
</script>

<template>
  <section class="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
    <!-- Filtro rápido por estado -->
    <div class="flex flex-wrap items-center gap-2 border-b border-gray-100 bg-gray-50 px-5 py-3">
      <button
        type="button"
        class="rounded-full border px-3 py-1 text-xs font-semibold transition"
        :class="filtroEstado === '' ? 'border-corporativo-rosa bg-corporativo-rosa text-white' : 'border-gray-300 bg-white text-gray-600 hover:border-corporativo-rosa hover:text-corporativo-rosa'"
        @click="emit('cambiar-filtro', '')"
      >
        Todos
      </button>
      <button
        v-for="estado in ESTADOS_PEDIDO"
        :key="estado.valor"
        type="button"
        class="rounded-full border px-3 py-1 text-xs font-semibold transition"
        :class="filtroEstado === estado.valor ? 'border-corporativo-rosa bg-corporativo-rosa text-white' : 'border-gray-300 bg-white text-gray-600 hover:border-corporativo-rosa hover:text-corporativo-rosa'"
        @click="emit('cambiar-filtro', estado.valor)"
      >
        {{ estado.etiqueta }}
      </button>
    </div>

    <div v-if="cargando" class="flex flex-col items-center justify-center py-16 text-gray-500">
      <Loader2 class="h-8 w-8 animate-spin text-corporativo-rosa" />
      <p class="mt-3 text-sm">Cargando pedidos...</p>
    </div>

    <div v-else-if="!pedidos.length" class="flex flex-col items-center justify-center py-16 text-center">
      <PackageSearch class="h-12 w-12 text-gray-300" />
      <p class="mt-3 font-semibold text-gray-700">No hay pedidos para mostrar.</p>
      <p class="mt-1 text-xs text-gray-500">Prueba con otro estado o término de búsqueda.</p>
    </div>

    <div v-else class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-500">
            <th class="px-5 py-3 font-semibold">Pedido</th>
            <th class="px-5 py-3 font-semibold">Cliente / Destino</th>
            <th class="px-5 py-3 font-semibold text-right">Total</th>
            <th class="px-5 py-3 font-semibold">Estado</th>
            <th class="px-5 py-3 font-semibold">Despacho</th>
            <th class="px-5 py-3 font-semibold text-right">Acciones</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <template v-for="pedido in pedidos" :key="pedido.id">
          <tr class="transition hover:bg-gray-50">
            <td class="px-5 py-3">
              <p class="font-bold text-gray-900">#{{ pedido.id }}</p>
              <p class="font-mono text-[11px] text-gray-500">{{ pedido.referencia }}</p>
              <p class="mt-0.5 text-[11px] text-gray-400">{{ formatearFecha(pedido.fecha) }}</p>
            </td>
            <td class="px-5 py-3">
              <p class="font-medium text-gray-900">{{ pedido.cliente.nombre }}</p>
              <p v-if="pedido.cliente.correo" class="text-xs text-gray-500">{{ pedido.cliente.correo }}</p>
              <p v-if="pedido.ciudad" class="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
                <MapPin class="h-3 w-3" /> {{ pedido.ciudad }}<span v-if="pedido.departamento">, {{ pedido.departamento }}</span>
              </p>
            </td>
            <td class="px-5 py-3 text-right">
              <p class="font-bold text-gray-900">{{ formatearCOP(pedido.total) }}</p>
              <p v-if="pedido.detalles?.length" class="text-[11px] text-gray-500">{{ totalPrendas(pedido) }} prenda(s)</p>
            </td>
            <td class="px-5 py-3">
              <span
                class="inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold"
                :class="infoEstadoPedido(pedido.estado).clases"
              >
                {{ infoEstadoPedido(pedido.estado).etiqueta }}
              </span>
            </td>
            <td class="px-5 py-3">
              <template v-if="pedido.numeroGuia">
                <p class="text-xs font-semibold text-gray-800">{{ pedido.empresaTransportadora || 'Transportadora' }}</p>
                <p class="font-mono text-[11px] text-gray-500">{{ pedido.numeroGuia }}</p>
              </template>
              <span v-else class="text-xs text-gray-400">Sin guía asignada</span>
            </td>
            <td class="px-5 py-3">
              <div class="flex justify-end items-center gap-2">
                <!-- Gestionar Despacho -->
                <button
                  type="button"
                  class="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-gray-800"
                  @click="emit('gestionar', pedido)"
                >
                  <Truck class="h-3.5 w-3.5" /> Despacho
                </button>

                <button
                  type="button"
                  class="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 shadow-sm transition hover:border-corporativo-rosa hover:text-corporativo-rosa"
                  :aria-expanded="pedidoAbierto === pedido.id"
                  :aria-label="pedidoAbierto === pedido.id ? 'Ocultar seguimiento' : 'Ver seguimiento del pedido'"
                  @click="alternarSeguimiento(pedido.id)"
                >
                  <Eye class="h-3.5 w-3.5" /> Seguimiento
                  <ChevronDown class="h-3.5 w-3.5 transition-transform" :class="{ 'rotate-180': pedidoAbierto === pedido.id }" />
                </button>

                <!-- Ver / Descargar Factura automática -->
                <button
                  v-if="pedido.facturaId"
                  type="button"
                  class="inline-flex items-center gap-1.5 rounded-lg border border-pink-200 bg-pink-50 px-3 py-1.5 text-xs font-bold text-corporativo-rosa shadow-sm transition hover:bg-pink-100"
                  title="Ver factura generada automáticamente y descargar PDF"
                  @click="emit('ver-factura', pedido)"
                >
                  <Eye class="h-3.5 w-3.5" /> Ver Factura
                </button>
              </div>
            </td>
          </tr>
          <tr v-if="pedidoAbierto === pedido.id" :key="`${pedido.id}-seguimiento`" class="bg-gray-50/70">
            <td colspan="6" class="px-5 py-5">
              <div class="mx-auto max-w-5xl space-y-4">
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 class="text-sm font-bold text-gray-900">Seguimiento del pedido #{{ pedido.id }}</h3>
                    <p class="text-xs text-gray-500">Estado visible también en el historial del cliente.</p>
                  </div>
                  <span class="rounded-full border px-3 py-1 text-xs font-semibold" :class="infoEstadoPedido(pedido.estado).clases">
                    {{ infoEstadoPedido(pedido.estado).etiqueta }}
                  </span>
                </div>
                <div v-if="pedido.estado === 'Cancelado'" class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
                  Este pedido fue cancelado.
                </div>
                <ol v-else class="grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-5">
                  <li v-for="(paso, i) in FLUJO_PEDIDO" :key="paso" class="text-center">
                    <div class="h-1.5 rounded-full" :class="i <= pasoActual(pedido.estado) ? 'bg-corporativo-rosa' : 'bg-gray-200'"></div>
                    <span class="mt-1.5 block text-[11px] font-semibold" :class="i <= pasoActual(pedido.estado) ? 'text-gray-900' : 'text-gray-400'">
                      {{ infoEstadoPedido(paso).etiqueta }}
                    </span>
                  </li>
                </ol>
                <div v-if="pedido.empresaTransportadora || pedido.numeroGuia" class="rounded-xl border border-gray-200 bg-white px-4 py-3 text-xs text-gray-600">
                  <span v-if="pedido.empresaTransportadora" class="font-semibold text-gray-800">{{ pedido.empresaTransportadora }}</span>
                  <span v-if="pedido.empresaTransportadora && pedido.numeroGuia"> · </span>
                  <span v-if="pedido.numeroGuia">Guía {{ pedido.numeroGuia }}</span>
                </div>
              </div>
            </td>
          </tr>
          </template>
        </tbody>
      </table>
    </div>

    <slot name="pie" />
  </section>
</template>
