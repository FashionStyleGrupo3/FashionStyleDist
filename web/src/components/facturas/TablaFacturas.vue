<script setup>
// -> Componente TablaFacturas con Visor y PDF Fashion Style
import { ref } from 'vue';
import { Download, Eye, Loader2, ReceiptText } from 'lucide-vue-next';
import { useFormatoMoneda } from '@/composables/useFormatoMoneda';
import VisorFacturaFashion from '@/components/facturas/VisorFacturaFashion.vue';

defineProps({
  facturas: { type: Array, default: () => [] },
  cargando: { type: Boolean, default: false }
});

const { formatearCOP } = useFormatoMoneda();

const facturaActiva = ref(null);
const modalAbierto = ref(false);

function formatearFecha(valor) {
  if (!valor) return '—';
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return valor;
  return fecha.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

function abrirVistaPrevia(factura) {
  facturaActiva.value = factura;
  modalAbierto.value = true;
}
</script>

<template>
  <section class="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
    <div v-if="cargando" class="flex flex-col items-center justify-center py-16 text-gray-500">
      <Loader2 class="h-8 w-8 animate-spin text-corporativo-rosa" />
      <p class="mt-3 text-sm">Cargando facturas...</p>
    </div>

    <div v-else-if="!facturas.length" class="flex flex-col items-center justify-center py-16 text-center">
      <ReceiptText class="h-12 w-12 text-gray-300" />
      <p class="mt-3 font-semibold text-gray-700">No hay facturas registradas.</p>
      <p class="mt-1 text-xs text-gray-500">Emite una factura con 1-clic desde Pedidos Online o realiza una carga masiva.</p>
    </div>

    <div v-else class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-gray-100 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
            <th class="px-5 py-3 font-semibold">N.º Factura</th>
            <th class="px-5 py-3 font-semibold">Fecha</th>
            <th class="px-5 py-3 font-semibold">Cliente / Documento</th>
            <th class="px-5 py-3 font-semibold">Origen</th>
            <th class="px-5 py-3 font-semibold text-right">Subtotal / IVA</th>
            <th class="px-5 py-3 font-semibold text-right">Total</th>
            <th class="px-5 py-3 font-semibold text-right">Acciones</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr v-for="factura in facturas" :key="factura.id" class="transition hover:bg-gray-50">
            <td class="px-5 py-3">
              <p class="font-bold text-gray-900">{{ factura.numero }}</p>
              <span class="inline-flex rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                {{ factura.estado }}
              </span>
            </td>
            <td class="px-5 py-3 text-xs text-gray-600">
              {{ formatearFecha(factura.fecha) }}
            </td>
            <td class="px-5 py-3">
              <p class="font-medium text-gray-900">{{ factura.cliente.nombre }}</p>
              <p v-if="factura.cliente.documento" class="font-mono text-xs text-gray-500">
                Doc: {{ factura.cliente.documento }}
              </p>
            </td>
            <td class="px-5 py-3">
              <span
                v-if="factura.pedidoId"
                class="inline-flex items-center rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700"
              >
                Pedido #{{ factura.pedidoId }}
              </span>
              <span
                v-else-if="factura.ventaId"
                class="inline-flex items-center rounded-lg border border-purple-200 bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-700"
              >
                Venta POS #{{ factura.ventaId }}
              </span>
              <span v-else class="text-xs text-gray-400">Manual</span>
            </td>
            <td class="px-5 py-3 text-right text-xs text-gray-600">
              <p>Sub: {{ formatearCOP(factura.subtotal || factura.total) }}</p>
              <p v-if="factura.impuestos" class="text-gray-400">IVA: {{ formatearCOP(factura.impuestos) }}</p>
            </td>
            <td class="px-5 py-3 text-right font-extrabold text-gray-900">
              {{ formatearCOP(factura.total) }}
            </td>
            <td class="px-5 py-3">
              <div class="flex justify-end gap-2">
                <button
                  type="button"
                  class="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:border-corporativo-rosa hover:text-corporativo-rosa"
                  @click="abrirVistaPrevia(factura)"
                >
                  <Eye class="h-3.5 w-3.5" /> Vista previa
                </button>
                <button
                  type="button"
                  class="inline-flex items-center gap-1.5 rounded-lg bg-corporativo-rosa px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-pink-700"
                  @click="abrirVistaPrevia(factura)"
                >
                  <Download class="h-3.5 w-3.5" /> PDF Fashion
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <slot name="pie" />

    <!-- Visor de Factura Electronica Fashion Style con PDF Oficial y Wompi -->
    <VisorFacturaFashion
      :abierto="modalAbierto"
      :factura="facturaActiva"
      @cerrar="modalAbierto = false"
    />
  </section>
</template>
