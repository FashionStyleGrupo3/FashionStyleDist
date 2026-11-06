<script setup>
// -> Detalle de un pago: factura, reparto del dinero y comprobante de reparto en PDF
import { ref, computed } from 'vue';
import {
  X,
  Receipt,
  Wallet,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  AlertCircle,
  Loader2
} from 'lucide-vue-next';
import html2pdf from 'html2pdf.js';
import ModalBase from '@/components/comunes/ModalBase.vue';
import { useFormatoMoneda } from '@/composables/useFormatoMoneda';
import { useNotificacion } from '@/composables/useNotificacion';
import { calcularReparto, validarCuentasParaReparto } from '@/services/pagoServicio';

const props = defineProps({
  abierto: { type: Boolean, default: false },
  pago: { type: Object, default: null },
  // Registro del reparto ya hecho para este pago (o null si está pendiente)
  dispersion: { type: Object, default: null },
  // Cuentas guardadas en la pantalla de reparto
  cuentas: { type: Array, default: () => [] }
});

const emit = defineEmits(['cerrar', 'ver-factura', 'repartir', 'ir-reparto']);

const { formatearCOP } = useFormatoMoneda();
const { notificarExito, notificarError } = useNotificacion();

const comprobanteRef = ref(null);
const generandoPdf = ref(false);

const problemas = computed(() => validarCuentasParaReparto(props.cuentas));
const repartido = computed(() => !!props.dispersion);
const filas = computed(() => {
  if (props.dispersion) return props.dispersion.cuentas;
  return props.pago ? calcularReparto(props.pago.monto, props.cuentas) : [];
});
const totalFilas = computed(() => filas.value.reduce((a, f) => a + f.monto_asignado, 0));

function formatearFecha(valor) {
  if (!valor) return '—';
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return valor;
  return d.toLocaleString('es-CO', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Solo se muestran los últimos 4 dígitos de la cuenta
function enmascarar(numero) {
  const limpio = String(numero || '').replace(/\D/g, '');
  return limpio ? `•••• ${limpio.slice(-4)}` : 'Sin número';
}

async function descargarComprobante() {
  if (!comprobanteRef.value || !props.dispersion) return;
  generandoPdf.value = true;
  try {
    await html2pdf()
      .set({
        margin: [10, 10, 10, 10],
        filename: `Comprobante-${props.dispersion.comprobante}-FashionStyle.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      })
      .from(comprobanteRef.value)
      .save();
    notificarExito('Comprobante de reparto descargado');
  } catch {
    notificarError('No se pudo generar el PDF. Intenta de nuevo.');
  } finally {
    generandoPdf.value = false;
  }
}
</script>

<template>
  <ModalBase :abierto="abierto" titulo="Detalle del pago" anchoMax="max-w-3xl" @cerrar="emit('cerrar')">
    <div v-if="pago">
      <!-- Encabezado -->
      <header class="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-4">
        <div>
          <h2 class="text-lg font-extrabold text-gray-900">Pago {{ pago.id }}</h2>
          <p class="text-xs text-gray-500 mt-0.5">{{ pago.canal }} · {{ formatearFecha(pago.fecha) }}</p>
        </div>
        <button
          type="button"
          class="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition"
          aria-label="Cerrar"
          @click="emit('cerrar')"
        >
          <X class="w-5 h-5" />
        </button>
      </header>

      <div class="px-6 py-5 space-y-6">
        <!-- Los 3 pasos de este pago -->
        <ol class="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
          <li class="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-emerald-900">
            <CheckCircle2 class="w-4 h-4 text-emerald-600 shrink-0" />
            <span class="font-semibold">Pago recibido</span>
          </li>
          <li class="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-emerald-900">
            <CheckCircle2 class="w-4 h-4 text-emerald-600 shrink-0" />
            <span class="font-semibold">Factura emitida</span>
          </li>
          <li
            class="flex items-center gap-2 rounded-xl border px-3 py-2"
            :class="repartido ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-amber-50 border-amber-200 text-amber-900'"
          >
            <CheckCircle2 v-if="repartido" class="w-4 h-4 text-emerald-600 shrink-0" />
            <Clock v-else class="w-4 h-4 text-amber-600 shrink-0" />
            <span class="font-semibold">{{ repartido ? 'Dinero repartido' : 'Falta repartir' }}</span>
          </li>
        </ol>

        <!-- Datos del pago + factura -->
        <section class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="rounded-xl border border-gray-200 p-4">
            <div class="flex items-center gap-2 text-xs font-semibold text-gray-600 mb-3">
              <Wallet class="w-4 h-4" /> Datos del pago
            </div>
            <dl class="space-y-2 text-sm">
              <div class="flex justify-between gap-3"><dt class="text-gray-500">Cliente</dt><dd class="font-semibold text-gray-900 text-right">{{ pago.cliente }}</dd></div>
              <div class="flex justify-between gap-3"><dt class="text-gray-500">Medio de pago</dt><dd class="font-semibold text-gray-900 text-right">{{ pago.metodo_pago }}</dd></div>
              <div class="flex justify-between gap-3"><dt class="text-gray-500">Referencia</dt><dd class="font-mono text-xs text-gray-900 text-right break-all">{{ pago.referencia }}</dd></div>
              <div class="flex justify-between gap-3 pt-2 border-t border-gray-100"><dt class="text-gray-500">Valor</dt><dd class="font-extrabold text-gray-900">{{ formatearCOP(pago.monto) }}</dd></div>
            </dl>
          </div>

          <div class="rounded-xl border border-gray-200 p-4 flex flex-col">
            <div class="flex items-center gap-2 text-xs font-semibold text-gray-600 mb-3">
              <Receipt class="w-4 h-4" /> Factura de la venta
            </div>
            <p class="text-xl font-extrabold text-gray-900">{{ pago.factura_numero || 'Emitida' }}</p>
            <p class="text-xs text-gray-500 mt-1">Con las prendas, el IVA y los datos del cliente.</p>
            <div class="mt-auto pt-3">
              <button
                type="button"
                class="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-bold text-gray-900 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition"
                @click="emit('ver-factura')"
              >
                <Eye class="w-4 h-4" /> Ver factura completa
              </button>
            </div>
          </div>
        </section>

        <!-- Reparto: pendiente -->
        <section v-if="!repartido" class="rounded-xl border border-amber-200 bg-amber-50/60 p-4 space-y-4">
          <div>
            <h3 class="text-sm font-bold text-gray-900">Así se repartiría este dinero</h3>
            <p class="text-xs text-gray-600 mt-0.5">Usa los porcentajes guardados en «Reparto del dinero».</p>
          </div>

          <div v-if="problemas.length" class="flex gap-2 rounded-xl bg-white border border-amber-200 p-3 text-sm text-amber-900">
            <AlertCircle class="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
            <div>
              <p class="font-semibold">Todavía no se puede repartir</p>
              <ul class="list-disc pl-5 text-xs mt-1 space-y-0.5">
                <li v-for="p in problemas" :key="p">{{ p }}</li>
              </ul>
              <button type="button" class="mt-2 text-xs font-bold text-corporativo-rosa hover:underline" @click="emit('ir-reparto')">
                Ir a configurar el reparto
              </button>
            </div>
          </div>

          <ul v-else class="divide-y divide-amber-100 rounded-xl bg-white border border-amber-100">
            <li v-for="f in filas" :key="f.id" class="flex items-center justify-between gap-3 px-3 py-2.5">
              <div class="min-w-0">
                <p class="text-sm font-semibold text-gray-900 truncate">{{ f.concepto }}</p>
                <p class="text-xs text-gray-500">{{ f.porcentaje }}% · {{ f.banco }} {{ enmascarar(f.numero_cuenta) }}</p>
              </div>
              <p class="text-sm font-extrabold text-gray-900 whitespace-nowrap">{{ formatearCOP(f.monto_asignado) }}</p>
            </li>
          </ul>

          <button
            type="button"
            :disabled="problemas.length > 0"
            class="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold text-white bg-gray-900 rounded-xl hover:bg-black transition disabled:opacity-40 disabled:cursor-not-allowed"
            @click="emit('repartir')"
          >
            Repartir este dinero y generar comprobante
          </button>
        </section>

        <!-- Reparto: hecho (esto es el comprobante) -->
        <section v-else class="space-y-3">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <h3 class="text-sm font-bold text-gray-900">Comprobante de reparto</h3>
            <button
              type="button"
              :disabled="generandoPdf"
              class="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-bold text-white bg-gray-900 rounded-xl hover:bg-black transition disabled:opacity-50"
              @click="descargarComprobante"
            >
              <Loader2 v-if="generandoPdf" class="w-4 h-4 animate-spin" />
              <Download v-else class="w-4 h-4" />
              Descargar PDF
            </button>
          </div>

          <div ref="comprobanteRef" class="rounded-xl border border-gray-200 bg-white p-6 text-gray-900">
            <div class="flex items-start justify-between gap-4 pb-4 border-b border-gray-200">
              <div>
                <p class="text-lg font-extrabold">Fashion Style</p>
                <p class="text-xs text-gray-500">Comprobante de reparto del dinero</p>
              </div>
              <div class="text-right">
                <p class="text-lg font-extrabold">{{ dispersion.comprobante }}</p>
                <p class="text-xs text-gray-500">{{ formatearFecha(dispersion.fecha_reparto) }}</p>
              </div>
            </div>

            <dl class="grid grid-cols-2 gap-x-6 gap-y-2 py-4 text-sm">
              <div><dt class="text-xs text-gray-500">Pago</dt><dd class="font-semibold">{{ pago.id }}</dd></div>
              <div><dt class="text-xs text-gray-500">Factura de la venta</dt><dd class="font-semibold">{{ pago.factura_numero || 'Emitida' }}</dd></div>
              <div><dt class="text-xs text-gray-500">Cliente</dt><dd class="font-semibold">{{ pago.cliente }}</dd></div>
              <div><dt class="text-xs text-gray-500">Valor del pago</dt><dd class="font-semibold">{{ formatearCOP(dispersion.monto) }}</dd></div>
            </dl>

            <table class="w-full text-sm">
              <thead>
                <tr class="border-y border-gray-200 text-left text-xs text-gray-600">
                  <th class="py-2 pr-2 font-semibold">Cuenta</th>
                  <th class="py-2 px-2 font-semibold text-right">%</th>
                  <th class="py-2 pl-2 font-semibold text-right">Valor</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                <tr v-for="f in filas" :key="f.id">
                  <td class="py-2.5 pr-2">
                    <p class="font-semibold">{{ f.concepto }}</p>
                    <p class="text-xs text-gray-500">{{ f.banco }} · {{ f.tipo_cuenta }} {{ enmascarar(f.numero_cuenta) }}</p>
                    <p class="text-xs text-gray-500">Titular: {{ f.titular }}</p>
                  </td>
                  <td class="py-2.5 px-2 text-right">{{ f.porcentaje }}%</td>
                  <td class="py-2.5 pl-2 text-right font-bold whitespace-nowrap">{{ formatearCOP(f.monto_asignado) }}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr class="border-t border-gray-300">
                  <td class="py-2.5 font-extrabold">Total repartido</td>
                  <td class="py-2.5 px-2 text-right font-bold">100%</td>
                  <td class="py-2.5 pl-2 text-right font-extrabold whitespace-nowrap">{{ formatearCOP(totalFilas) }}</td>
                </tr>
              </tfoot>
            </table>

            <p class="mt-4 text-[11px] text-gray-500 leading-relaxed">
              Registro contable interno con los porcentajes vigentes al momento del reparto. No es una transferencia
              bancaria ni una factura electrónica ante la DIAN.
            </p>
          </div>
        </section>
      </div>
    </div>
  </ModalBase>
</template>