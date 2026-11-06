<script setup>
// -> Componente VistaConfiguracionPagos: Monitoreo automático de Recaudo (Wompi) y Dispersión Financiera
import { ref, computed, onMounted } from 'vue';
import { RouterLink } from 'vue-router';
import {
  Building2,
  AlertCircle,
  ArrowLeft,
  RefreshCw,
  DollarSign,
  ShoppingBag,
  CreditCard,
  Receipt
} from 'lucide-vue-next';
import {
  obtenerConfiguracionPasarela,
  calcularDispersionFondos,
  obtenerControlParaleloPagos
} from '@/services/pagoServicio';
import { filtrarCampo } from '@/utils/validacionCampos';
import { useFormatoMoneda } from '@/composables/useFormatoMoneda';
import { obtenerMensajeError } from '@/services/clienteApi';

  const { formatearCOP } = useFormatoMoneda();
  
  const configuracion = ref(obtenerConfiguracionPasarela());
  const cargandoControl = ref(false);
  const mensajeError = ref('');
  const totalPorcentajes = computed(() => {
    const cuentas = configuracion.value?.cuentas_bancarias || [];
    return cuentas.reduce((acc, c) => acc + (Number(c.porcentaje) || 0), 0);
  });
  const porcentajeRestante = computed(() => 100 - totalPorcentajes.value);
const controlParalelo = ref({
  recaudoWompiOnline: 0,
  cantidadPedidosPagados: 0,
  recaudoPosMostrador: 0,
  cantidadVentasPos: 0,
  recaudoTotalConsolidado: 0,
  facturasEmitidas: 0,
  transacciones: []
});

const porcentajeValido = computed(() => totalPorcentajes.value === 100);

function filtrarCuenta(cuenta, campo, tipo, limite, evento) {
  const valor = filtrarCampo(evento.target.value, tipo, limite);
  cuenta[campo] = valor;
  evento.target.value = valor;
}

  function agregarCuentaBancaria() {
    const cuentas = Array.isArray(configuracion.value?.cuentas_bancarias) ? configuracion.value.cuentas_bancarias : [];
    const nuevoId = cuentas.length > 0
      ? Math.max(...cuentas.map(c => c.id)) + 1
      : 1;

    if (!Array.isArray(configuracion.value.cuentas_bancarias)) {
      configuracion.value.cuentas_bancarias = [];
    }

    configuracion.value.cuentas_bancarias.push({
      id: nuevoId,
      banco: 'Bancolombia',
      tipo_cuenta: 'Ahorros',
      numero_cuenta: '',
      titular: '',
      concepto: 'Operaciones',
      porcentaje: 0,
      activa: true
    });
  }

  function eliminarCuenta(id) {
    if (!Array.isArray(configuracion.value?.cuentas_bancarias)) return;
    configuracion.value.cuentas_bancarias = configuracion.value.cuentas_bancarias.filter(c => c.id !== id);
  }

  async function cargarControlParalelo() {
    cargandoControl.value = true;
    mensajeError.value = '';
    try {
      controlParalelo.value = await obtenerControlParaleloPagos();
    } catch (error) {
      mensajeError.value = obtenerMensajeError(
        error,
        'No se pudo sincronizar el resumen de pagos con el servidor.'
      );
      if (!controlParalelo.value || typeof controlParalelo.value !== 'object') {
        controlParalelo.value = {
          recaudoWompiOnline: 0,
          cantidadPedidosPagados: 0,
          recaudoPosMostrador: 0,
          cantidadVentasPos: 0,
          recaudoTotalConsolidado: 0,
          facturasEmitidas: 0,
          transacciones: []
        };
      }
    } finally {
      cargandoControl.value = false;
    }
  }

function formatearFecha(valor) {
  if (!valor) return '—';
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return valor;
  return d.toLocaleString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

onMounted(() => {
  configuracion.value = obtenerConfiguracionPasarela();
  cargarControlParalelo();
});
</script>

<template>
    <div class="w-full max-w-none space-y-6">
    <!-- Encabezado -->
    <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-gray-200">
      <div>
        <h1 class="text-2xl sm:text-3xl font-extrabold font-titulos text-gray-900 tracking-tight">
          Control automático de Pagos y Dispersión
        </h1>
        <p class="text-xs sm:text-sm text-gray-500 mt-0.5">
          Los pagos aprobados en Wompi y las ventas se distribuyen y facturan automáticamente sin requerir acciones manuales.
        </p>
      </div>
    </div>
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="inline-flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition shadow-sm"
          @click="cargarControlParalelo"
        >
          <RefreshCw class="w-4 h-4" :class="{ 'animate-spin': cargandoControl }" />
          <span>Actualizar</span>
        </button>

        <RouterLink
          to="/admin"
          class="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition shadow-sm"
        >
          <ArrowLeft class="w-4 h-4" />
          <span>Volver al Panel</span>
        </RouterLink>
      </div>
    </div>

    <!-- Alertas -->
    <div v-if="mensajeError" class="p-4 rounded-xl bg-red-50 border border-red-200 flex items-center gap-3 text-sm text-red-800">
      <AlertCircle class="w-5 h-5 text-red-600 shrink-0" />
      <span>{{ mensajeError }}</span>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Columna Izquierda: Cuentas Bancarias y Regla de Dispersion (2 cols) -->
      <div class="lg:col-span-2 space-y-6">
        <div class="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-7">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-6 border-b border-gray-100 gap-3">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-pink-50 text-corporativo-rosa flex items-center justify-center font-bold">
                <Building2 class="w-5 h-5" />
              </div>
              <div>
                <h2 class="text-base sm:text-lg font-bold text-gray-900">
                  Cuentas Bancarias Receptoras (Split Payments)
                </h2>
                <p class="text-xs text-gray-500">
                  El recaudo de cada venta se repartirá automáticamente según estos porcentajes.
                </p>
              </div>
            </div>
          </div>

            <button
              type="button"
              @click="agregarCuentaBancaria"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-black transition shadow-sm"
            >
              <Plus class="w-3.5 h-3.5" />
              <span>Agregar Cuenta</span>
            </button>
          </div>

          <!-- Indicador de balance de dispersion -->
          <div
            class="mb-6 p-3.5 rounded-xl border flex items-center justify-between text-xs font-semibold"
            :class="porcentajeValido ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-800'"
          >
            <div class="flex items-center gap-2">
              <Percent class="w-4 h-4" />
              <span>Distribución total del pago:</span>
              <strong class="text-sm font-extrabold">{{ totalPorcentajes }}%</strong>
            </div>
            <span>{{ porcentajeValido ? 'Reparto balanceado (100%)' : 'Debe sumar 100%' }}</span>
          </div>

          <!-- Lista de cuentas bancarias -->
            <div class="space-y-4">
              <div
                v-for="cuenta in (configuracion.cuentas_bancarias || [])"
                :key="cuenta.id"
                class="p-4 rounded-xl border border-gray-200 bg-gray-50/60 space-y-3 relative group"
              >
              <div class="flex items-center justify-between border-b border-gray-200/60 pb-2">
                <div class="flex items-center gap-2">
                  <span class="text-xs font-bold text-gray-700">Cuenta de destino #{{ cuenta.id }}</span>
                  <input
                    v-model="cuenta.concepto"
                    type="text"
                    maxlength="50"
                    placeholder="Concepto (ej. confección, Tienda, Telas)"
                    class="px-2 py-0.5 text-xs bg-white border rounded font-semibold text-corporativo-rosa"
                    @input="filtrarCuenta(cuenta, 'concepto', 'comercial', 50, $event)"
                  />
                </div>

                <div class="flex items-center gap-2">
                  <label class="inline-flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
                    <input type="checkbox" v-model="cuenta.activa" class="rounded text-corporativo-rosa" />
                    <span>Activa</span>
                  </label>
                    <button
                      v-if="(configuracion.cuentas_bancarias || []).length > 1"
                      type="button"
                      @click="eliminarCuenta(cuenta.id)"
                      class="p-1 text-gray-400 hover:text-red-500 rounded"
                      title="Eliminar cuenta"
                    >
                      <Trash2 class="w-4 h-4" />
                    </button>
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <!-- Entidad bancaria -->
                <div>
                  <label class="block text-[11px] font-bold text-gray-500 uppercase mb-1">Banco</label>
                  <select
                    v-model="cuenta.banco"
                    class="w-full px-2.5 py-1.5 text-xs border rounded-lg bg-white focus:outline-none focus:border-corporativo-rosa font-medium"
                  >
                    <option v-for="banco in bancosDisponibles" :key="banco" :value="banco">{{ banco }}</option>
                  </select>
                </div>

                <!-- Tipo de cuenta -->
                <div>
                  <label class="block text-[11px] font-bold text-gray-500 uppercase mb-1">Tipo</label>
                  <select
                    v-model="cuenta.tipo_cuenta"
                    class="w-full px-2.5 py-1.5 text-xs border rounded-lg bg-white focus:outline-none focus:border-corporativo-rosa"
                  >
                    <option value="Ahorros">Ahorros</option>
                    <option value="Corriente">Corriente</option>
                  </select>
                </div>

                <!-- Numero de cuenta -->
                <div>
                  <label class="block text-[11px] font-bold text-gray-500 uppercase mb-1">número de Cuenta</label>
                  <input
                    v-model="cuenta.numero_cuenta"
                    type="text"
                    maxlength="30"
                    pattern="[A-Za-z0-9-]+"
                    placeholder="Ej. 245-891024-11"
                    class="w-full px-2.5 py-1.5 text-xs border rounded-lg bg-white focus:outline-none focus:border-corporativo-rosa font-mono"
                    @input="filtrarCuenta(cuenta, 'numero_cuenta', 'cuenta', 30, $event)"
                  />
                </div>

                <!-- Porcentaje de dispersion -->
                <div>
                  <label class="block text-[11px] font-bold text-gray-500 uppercase mb-1">% de Reparto</label>
                  <div class="relative">
                    <input
                      v-model.number="cuenta.porcentaje"
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      class="w-full px-2.5 py-1.5 text-xs border rounded-lg bg-white focus:outline-none focus:border-corporativo-rosa font-bold text-gray-900"
                    />
                    <span class="absolute right-2.5 top-1.5 text-xs text-gray-400 font-bold">%</span>
                  </div>
                </div>
              </div>

              <!-- Titular de la cuenta -->
              <div>
                <label class="block text-[11px] font-bold text-gray-500 uppercase mb-1">Titular / Razón Social</label>
                <input
                  v-model="cuenta.titular"
                  type="text"
                  maxlength="150"
                  placeholder="Nombre de la persona o empresa titular de la cuenta"
                  class="w-full px-3 py-1.5 text-xs border rounded-lg bg-white focus:outline-none focus:border-corporativo-rosa"
                  @input="filtrarCuenta(cuenta, 'titular', 'comercial', 150, $event)"
                />
              </div>
            </div>
          </div>

      <div class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm flex items-center justify-between">
        <div>
          <p class="text-xs font-semibold uppercase tracking-wide text-gray-500">Total Dispersado</p>
          <p class="mt-1 text-xl font-extrabold text-emerald-600">
            {{ formatearCOP(controlParalelo.recaudoTotalConsolidado) }}
          </p>
          <p class="text-[11px] text-emerald-700 mt-0.5 font-medium">
            100% distribuido en cuentas
          </p>
        </div>
        <div class="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
          <DollarSign class="h-5 w-5" />
        </div>
      </div>

      <div class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm flex items-center justify-between">
        <div>
          <p class="text-xs font-semibold uppercase tracking-wide text-gray-500">Facturas automáticas</p>
          <p class="mt-1 text-xl font-extrabold text-corporativo-rosa">
            {{ controlParalelo.facturasEmitidas }}
          </p>
          <p class="text-[11px] text-gray-500 mt-0.5">
            Emitidas al confirmar pago
          </p>
        </div>
        <div class="flex h-11 w-11 items-center justify-center rounded-xl bg-pink-50 text-corporativo-rosa">
          <Receipt class="h-5 w-5" />
        </div>
      </div>
    </div>

    <!-- Distribuccion automática por Rubro / Cuenta Bancaria (Solo lectura) -->
    <section class="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
      <div class="flex items-center gap-3 pb-4 mb-5 border-b border-gray-100">
        <div class="w-10 h-10 rounded-xl bg-pink-50 text-corporativo-rosa flex items-center justify-center font-bold">
          <Building2 class="w-5 h-5" />
        </div>
        <div>
          <h2 class="text-base sm:text-lg font-bold text-gray-900">
            Dispersión automática por Cuenta Destino
          </h2>
          <p class="text-xs text-gray-500">
            Distribución calculada automáticamente sobre cada compra confirmada en el sistema.
          </p>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          v-for="item in dispersionEnTiempoReal"
          :key="item.id"
          class="rounded-2xl border border-gray-200 bg-gray-50/70 p-5 flex flex-col justify-between"
        >
          <div>
            <div class="flex items-center justify-between gap-2">
              <span class="rounded-full bg-pink-100 px-2.5 py-0.5 text-xs font-extrabold text-corporativo-rosa">
                {{ item.porcentaje }}% del recaudo
              </span>
              <span class="text-xs font-semibold text-gray-500">{{ item.banco }} · {{ item.tipo_cuenta }}</span>
            </div>
            <h3 class="mt-3 text-sm font-bold text-gray-900">{{ item.concepto }}</h3>
            <p class="text-xs text-gray-600 mt-0.5">{{ item.titular }}</p>
            <p class="font-mono text-xs text-gray-400 mt-1">Cuenta N.º {{ item.numero_cuenta }}</p>
          </div>

          <div>
            <label class="block text-xs font-bold text-gray-600 uppercase mb-1.5">Llave pública (API Key)</label>
            <input
              v-model="configuracion.llave_publica"
              type="text"
              maxlength="255"
              class="w-full px-3 py-2 text-xs border rounded-xl bg-gray-50 font-mono text-gray-700 focus:bg-white focus:outline-none focus:border-corporativo-rosa"
            />
          </div>

          <div class="pt-3 border-t border-gray-100 flex items-center gap-2 text-xs text-gray-500">
            <ShieldCheck class="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Integración directa con el backend y Kárdex contable.</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Tabla de Transacciones Sincronizadas automáticamente -->
    <section class="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden w-full col-span-1 lg:col-span-3">
      <div class="px-6 py-4 border-b border-gray-100">
        <h3 class="text-base font-bold text-gray-900">Historial de Pagos y Facturación automática</h3>
        <p class="text-xs text-gray-500">
          Cada pago confirmado genera automáticamente su venta, su factura y su dispersión contable.
        </p>
      </div>

      <div v-if="!controlParalelo.transacciones.length" class="py-12 text-center text-sm text-gray-500">
        No hay movimientos de recaudo registrados todavía.
      </div>

      <div class="overflow-x-auto w-full -mx-0">
        <table class="min-w-full text-sm">
          <thead>
            <tr class="border-b border-gray-100 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <th class="px-5 py-3 font-semibold">Operación / Ref.</th>
              <th class="px-5 py-3 font-semibold">Canal</th>
              <th class="px-5 py-3 font-semibold">Cliente</th>
              <th class="px-5 py-3 font-semibold">Medio de Pago</th>
              <th class="px-5 py-3 font-semibold">Factura automática</th>
              <th class="px-5 py-3 font-semibold">Fecha</th>
              <th class="px-5 py-3 font-semibold text-right">Monto</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-for="tx in controlParalelo.transacciones" :key="tx.id" class="hover:bg-gray-50">
              <td class="px-5 py-3">
                <p class="font-bold text-gray-900">{{ tx.id }}</p>
                <p class="font-mono text-[11px] text-gray-500">{{ tx.referencia }}</p>
              </td>
              <td class="px-5 py-3 text-xs font-semibold text-gray-700">{{ tx.canal }}</td>
              <td class="px-5 py-3 text-gray-800">{{ tx.cliente }}</td>
              <td class="px-5 py-3 text-xs uppercase font-semibold text-gray-700">{{ tx.metodo_pago }}</td>
              <td class="px-5 py-3">
                <span
                  v-if="tx.factura_numero"
                  class="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-bold text-emerald-700"
                >
                  {{ tx.factura_numero }}
                </span>
                <span v-else class="text-xs text-emerald-700 font-semibold">Emitida</span>
              </td>
              <td class="px-5 py-3 text-xs text-gray-500">{{ formatearFecha(tx.fecha) }}</td>
              <td class="px-5 py-3 text-right font-extrabold text-gray-900">{{ formatearCOP(tx.monto) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>
