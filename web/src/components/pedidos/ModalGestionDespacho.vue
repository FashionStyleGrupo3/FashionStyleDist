<script setup>
// -> Componente ModalGestionDespacho
import { ref, computed, watch } from 'vue';
import { X, Truck, Save, Loader2, MapPin, Phone, AlertTriangle } from 'lucide-vue-next';
import ModalBase from '@/components/comunes/ModalBase.vue';
import { useFormatoMoneda } from '@/composables/useFormatoMoneda';
import { useNotificacion } from '@/composables/useNotificacion';
import { obtenerMensajeError } from '@/services/clienteApi';
import {
  ESTADOS_PEDIDO,
  ESTADOS_CON_GUIA,
  TRANSPORTADORAS_SUGERIDAS,
  infoEstadoPedido,
  actualizarDespacho
} from '@/services/pedidoServicio';

const props = defineProps({
  abierto: { type: Boolean, default: false },
  pedido: { type: Object, default: null }
});

const emit = defineEmits(['cerrar', 'guardado']);

const { formatearCOP } = useFormatoMoneda();
const { notificarExito, notificarError, confirmarAccion } = useNotificacion();

const formulario = ref({ estado: '', empresaTransportadora: '', numeroGuia: '' });
const guardando = ref(false);
const errorFormulario = ref('');

watch(
  () => [props.abierto, props.pedido],
  ([abierto, pedido]) => {
    if (!abierto || !pedido) return;
    formulario.value = {
      estado: pedido.estado,
      empresaTransportadora: pedido.empresaTransportadora || '',
      numeroGuia: pedido.numeroGuia || ''
    };
    errorFormulario.value = '';
  },
  { immediate: true }
);

const requiereGuia = computed(() => ESTADOS_CON_GUIA.includes(formulario.value.estado));

const huboCambios = computed(() => {
  if (!props.pedido) return false;
  return (
    formulario.value.estado !== props.pedido.estado
    || formulario.value.empresaTransportadora.trim() !== (props.pedido.empresaTransportadora || '')
    || formulario.value.numeroGuia.trim() !== (props.pedido.numeroGuia || '')
  );
});

function validar() {
  if (!formulario.value.estado) return 'Selecciona un estado.';
  if (requiereGuia.value) {
    if (!formulario.value.empresaTransportadora.trim()) return 'Indica la empresa transportadora para marcar el pedido como enviado.';
    if (!formulario.value.numeroGuia.trim()) return 'Indica el número de guá para marcar el pedido como enviado.';
  }
  if (formulario.value.numeroGuia && !/^[A-Za-z0-9-]{4,40}$/.test(formulario.value.numeroGuia.trim())) {
    return 'El número de guá solo admite letras, números y guiones (4 a 40 caracteres).';
  }
  return '';
}

async function guardar() {
  errorFormulario.value = validar();
  if (errorFormulario.value) return;

  if (formulario.value.estado === 'Cancelado' && props.pedido.estado !== 'Cancelado') {
    const confirmado = await confirmarAccion({
      titulo: 'Cancelar pedido',
      texto: `¿Seguro que deseas cancelar el pedido #${props.pedido.id}? El backend revertirá el stock reservado.`,
      textoBotonConfirmar: 'Sí, cancelar pedido'
    });
    if (!confirmado) return;
  }

  guardando.value = true;
  try {
    const actualizado = await actualizarDespacho(props.pedido.id, formulario.value);
    notificarExito(`Pedido #${props.pedido.id} actualizado.`);
    emit('guardado', actualizado);
    emit('cerrar');
  } catch (error) {
    const mensaje = obtenerMensajeError(error, 'No se pudo actualizar el pedido.');
    errorFormulario.value = mensaje;
    notificarError(mensaje);
  } finally {
    guardando.value = false;
  }
}
</script>

<template>
  <ModalBase :abierto="abierto" titulo="Gestionar despacho" @cerrar="emit('cerrar')">
    <div v-if="pedido">
      <!-- Encabezado -->
      <header class="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-4">
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-corporativo-rosa text-white">
            <Truck class="h-5 w-5" />
          </div>
          <div>
            <h2 class="text-lg font-bold text-gray-900">Pedido #{{ pedido.id }}</h2>
            <p class="font-mono text-xs text-gray-500">{{ pedido.referencia }}</p>
          </div>
        </div>
        <button type="button" class="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700" @click="emit('cerrar')">
          <X class="h-5 w-5" />
        </button>
      </header>

      <div class="grid grid-cols-1 gap-6 px-6 py-5 md:grid-cols-2">
        <!-- Resumen del pedido -->
        <section class="space-y-4">
          <div class="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm">
            <p class="text-xs font-semibold uppercase tracking-wide text-gray-500">Destino</p>
            <p class="mt-1 font-semibold text-gray-900">{{ pedido.cliente.nombre }}</p>
            <p class="mt-1 flex items-start gap-1.5 text-gray-600">
              <MapPin class="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{{ pedido.direccion || 'Sin dirección' }}<span v-if="pedido.ciudad">, {{ pedido.ciudad }}</span><span v-if="pedido.departamento"> ({{ pedido.departamento }})</span></span>
            </p>
            <p v-if="pedido.telefono" class="mt-1 flex items-center gap-1.5 text-gray-600">
              <Phone class="h-3.5 w-3.5" /> {{ pedido.telefono }}
            </p>
            <p v-if="pedido.notas" class="mt-2 text-xs italic text-gray-500">"{{ pedido.notas }}"</p>
          </div>

          <div class="rounded-xl border border-gray-200">
            <p class="border-b border-gray-100 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Prendas
            </p>
            <ul v-if="pedido.detalles.length" class="max-h-48 divide-y divide-gray-100 overflow-y-auto text-sm">
              <li v-for="(d, idx) in pedido.detalles" :key="d.id ?? idx" class="flex justify-between gap-3 px-4 py-2">
                <span class="text-gray-800">
                  {{ d.nombre }} <span v-if="d.talla" class="text-xs text-gray-500">· {{ d.talla }}</span>
                  <span class="text-xs text-gray-500"> ×{{ d.cantidad }}</span>
                </span>
                <span class="font-semibold text-gray-900">{{ formatearCOP(d.subtotal) }}</span>
              </li>
            </ul>
            <p v-else class="px-4 py-3 text-xs text-gray-500">El backend no envió el detalle de prendas.</p>
            <div class="flex justify-between border-t border-gray-100 px-4 py-2 text-sm">
              <span class="font-bold text-gray-700">Total</span>
              <span class="font-extrabold text-corporativo-rosa">{{ formatearCOP(pedido.total) }}</span>
            </div>
          </div>
        </section>

        <!-- Formulario de despacho -->
        <form class="space-y-4" @submit.prevent="guardar">
          <div>
            <label class="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
              Estado actual:
              <span class="ml-1 rounded-full border px-2 py-0.5 normal-case" :class="infoEstadoPedido(pedido.estado).clases">
                {{ infoEstadoPedido(pedido.estado).etiqueta }}
              </span>
            </label>
            <select
              v-model="formulario.estado"
              class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-medium text-gray-900 focus:border-corporativo-rosa focus:outline-none focus:ring-2 focus:ring-pink-100"
            >
              <option v-for="estado in ESTADOS_PEDIDO" :key="estado.valor" :value="estado.valor">
                {{ estado.etiqueta }}
              </option>
            </select>
          </div>

          <div>
            <label class="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
              Empresa transportadora <span v-if="requiereGuia" class="text-corporativo-rosa">*</span>
            </label>
            <input
              v-model="formulario.empresaTransportadora"
              list="lista-transportadoras"
              type="text"
              maxlength="80"
              placeholder="Ej. Servientrega"
              class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-corporativo-rosa focus:outline-none focus:ring-2 focus:ring-pink-100"
            />
            <datalist id="lista-transportadoras">
              <option v-for="t in TRANSPORTADORAS_SUGERIDAS" :key="t" :value="t" />
            </datalist>
          </div>

          <div>
            <label class="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
              número de guá <span v-if="requiereGuia" class="text-corporativo-rosa">*</span>
            </label>
            <input
              v-model="formulario.numeroGuia"
              type="text"
              maxlength="40"
              pattern="[A-Za-z0-9-]+"
              placeholder="Ej. 2034567890"
              class="w-full rounded-lg border border-gray-300 px-3 py-2.5 font-mono text-sm text-gray-900 focus:border-corporativo-rosa focus:outline-none focus:ring-2 focus:ring-pink-100"
            />
          </div>

          <div
            v-if="formulario.estado === 'Cancelado' && pedido.estado !== 'Cancelado'"
            class="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800"
          >
            <AlertTriangle class="mt-0.5 h-4 w-4 shrink-0" />
            Al cancelar, se deberan revertir las salidas de inventario del pedido.
          </div>

          <p v-if="errorFormulario" class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
            {{ errorFormulario }}
          </p>

          <div class="flex justify-end gap-2 pt-2">
            <button
              type="button"
              class="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              @click="emit('cerrar')"
            >
              Cancelar
            </button>
            <button
              type="submit"
              :disabled="guardando || !huboCambios"
              class="inline-flex items-center gap-2 rounded-xl bg-corporativo-rosa px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-pink-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Loader2 v-if="guardando" class="h-4 w-4 animate-spin" />
              <Save v-else class="h-4 w-4" />
              Guardar cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  </ModalBase>
</template>

