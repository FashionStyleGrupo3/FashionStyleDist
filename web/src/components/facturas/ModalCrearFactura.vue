<script setup>
// -> Componente ModalCrearFactura con seleccion inteligente y autocompletado
import { ref, computed, watch } from 'vue';
import { X, FilePlus2, Loader2, Save, CheckCircle2 } from 'lucide-vue-next';
import ModalBase from '@/components/comunes/ModalBase.vue';
import { useNotificacion } from '@/composables/useNotificacion';
import { useFormatoMoneda } from '@/composables/useFormatoMoneda';
import clienteApi, { obtenerMensajeError } from '@/services/clienteApi';
import { crearFactura } from '@/services/facturaServicio';

const props = defineProps({
  abierto: { type: Boolean, default: false },
  pedidoPreseleccionado: { type: Object, default: null },
  ventaPreseleccionada: { type: Object, default: null }
});

const emit = defineEmits(['cerrar', 'creada']);

const { notificarExito, notificarError } = useNotificacion();
const { formatearCOP } = useFormatoMoneda();

const hoy = () => new Date().toISOString().slice(0, 10);

const formulario = ref({
  origen: 'pedido',
  referenciaId: '',
  fechaEmision: hoy(),
  clienteDocumento: '',
  notas: ''
});

const guardando = ref(false);
const errorFormulario = ref('');
const modoManual = ref(false);

const cargandoOperaciones = ref(false);
const listaOperaciones = ref([]);

const operacionSeleccionada = computed(() => {
  return listaOperaciones.value.find((op) => String(op.id) === String(formulario.value.referenciaId)) || null;
});

async function cargarOperaciones() {
  cargandoOperaciones.value = true;
  listaOperaciones.value = [];
  try {
    const endpoint = formulario.value.origen === 'pedido' ? '/pedidos' : '/ventas';
    const res = await clienteApi.get(endpoint);
    const datos = res.data?.data ?? res.data ?? [];
    const registros = Array.isArray(datos) ? datos : datos.data || [];

    if (formulario.value.origen === 'pedido') {
      listaOperaciones.value = registros.map((p) => {
        const id = p.id ?? p.id_pedido;
        const nombreCliente = p.cliente?.nombre || p.nombre_cliente || 'Cliente';
        const total = Number(p.monto_total ?? p.total ?? 0);
        return {
          id,
          etiqueta: `Pedido #${id} — ${nombreCliente} (${formatearCOP(total)})`,
          subtexto: `Ref: ${p.referencia || p.referencia_pasarela || 'Sin ref'} · Estado: ${p.estado || 'Activo'}`,
          cliente: nombreCliente,
          documento: p.cliente?.documento || p.cliente?.numero_documento || '',
          monto: total,
          notas: `Facturación de pedido #${id} (${p.referencia || p.referencia_pasarela || ''})`.trim()
        };
      });
    } else {
      listaOperaciones.value = registros.map((v) => {
        const id = v.id ?? v.id_venta;
        const nombreCliente = v.cliente?.nombre || v.cliente_nombre || 'Mostrador';
        const total = Number(v.monto_total ?? v.total ?? 0);
        return {
          id,
          etiqueta: `Venta POS #${id} — ${nombreCliente} (${formatearCOP(total)})`,
          subtexto: `Medio: ${v.medio_pago || 'POS'} · Estado: ${v.estado || 'Activa'}`,
          cliente: nombreCliente,
          documento: v.cliente?.documento || '',
          monto: total,
          notas: `Facturación de venta POS #${id}`
        };
      });
    }
  } catch (e) {
    // Si falla la carga remota, se habilita el modo manual automáticamente
    modoManual.value = true;
  } finally {
    cargandoOperaciones.value = false;
  }
}

function cambiarOrigen(nuevoOrigen) {
  if (formulario.value.origen === nuevoOrigen) return;
  formulario.value.origen = nuevoOrigen;
  formulario.value.referenciaId = '';
  formulario.value.clienteDocumento = '';
  formulario.value.notas = '';
  cargarOperaciones();
}

function alSeleccionarOperacion(e) {
  const idSeleccionado = e.target.value;
  formulario.value.referenciaId = idSeleccionado;
  const encontrada = listaOperaciones.value.find((op) => String(op.id) === String(idSeleccionado));
  if (encontrada) {
    if (encontrada.documento) {
      formulario.value.clienteDocumento = encontrada.documento;
    }
    formulario.value.notas = encontrada.notas;
  }
}

watch(
  () => [props.abierto, props.pedidoPreseleccionado, props.ventaPreseleccionada],
  ([abierto, pedido, venta]) => {
    if (!abierto) return;
    errorFormulario.value = '';
    modoManual.value = false;

    if (pedido?.id) {
      formulario.value = {
        origen: 'pedido',
        referenciaId: String(pedido.id),
        fechaEmision: hoy(),
        clienteDocumento: pedido.cliente?.documento || pedido.cliente?.numero_documento || '',
        notas: `Facturación de pedido #${pedido.id} (${pedido.referencia || ''})`.trim()
      };
      cargarOperaciones();
    } else if (venta?.id) {
      formulario.value = {
        origen: 'venta',
        referenciaId: String(venta.id),
        fechaEmision: hoy(),
        clienteDocumento: venta.cliente?.documento || '',
        notas: `Facturación de venta POS #${venta.id}`
      };
      cargarOperaciones();
    } else {
      formulario.value = {
        origen: 'pedido',
        referenciaId: '',
        fechaEmision: hoy(),
        clienteDocumento: '',
        notas: ''
      };
      cargarOperaciones();
    }
  },
  { immediate: true }
);

async function enviar() {
  errorFormulario.value = '';
  const idNum = Number(formulario.value.referenciaId);
  if (!Number.isInteger(idNum) || idNum <= 0) {
    errorFormulario.value = `Selecciona o ingresa un ${formulario.value.origen === 'pedido' ? 'pedido' : 'venta'} válido.`;
    return;
  }

  guardando.value = true;
  try {
    const creada = await crearFactura(formulario.value);
    notificarExito(`Factura ${creada.numero || ''} emitida correctamente.`);
    emit('creada', creada);
    emit('cerrar');
  } catch (error) {
    const mensaje = obtenerMensajeError(error, 'No se pudo emitir la factura.');
    errorFormulario.value = mensaje;
    notificarError(mensaje);
  } finally {
    guardando.value = false;
  }
}
</script>

<template>
  <ModalBase :abierto="abierto" titulo="Emitir factura legal" @cerrar="emit('cerrar')">
    <div>
      <header class="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-4">
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-corporativo-rosa text-white">
            <FilePlus2 class="h-5 w-5" />
          </div>
          <div>
            <h2 class="text-lg font-bold text-gray-900">Emitir Factura</h2>
            <p class="text-xs text-gray-500">Genera factura legal asociando automáticamente la información de la operación</p>
          </div>
        </div>
        <button type="button" class="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700" @click="emit('cerrar')">
          <X class="h-5 w-5" />
        </button>
      </header>

      <form class="space-y-4 px-6 py-5" @submit.prevent="enviar">
        <!-- Selector de origen -->
        <div>
          <label class="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
            Tipo de operación a facturar *
          </label>
          <div class="grid grid-cols-2 gap-3">
            <button
              type="button"
              class="rounded-xl border px-4 py-2.5 text-xs font-bold transition"
              :class="formulario.origen === 'pedido' ? 'border-corporativo-rosa bg-pink-50 text-corporativo-rosa' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'"
              @click="cambiarOrigen('pedido')"
            >
              Pedido Online (E-commerce)
            </button>
            <button
              type="button"
              class="rounded-xl border px-4 py-2.5 text-xs font-bold transition"
              :class="formulario.origen === 'venta' ? 'border-corporativo-rosa bg-pink-50 text-corporativo-rosa' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'"
              @click="cambiarOrigen('venta')"
            >
              Venta de Mostrador (POS)
            </button>
          </div>
        </div>

        <!-- Selector Inteligente de Pedido o Venta (sin ingresar IDs manualmente) -->
        <div>
          <div class="mb-1.5 flex items-center justify-between">
            <label class="block text-xs font-semibold uppercase tracking-wide text-gray-500">
              {{ formulario.origen === 'pedido' ? 'Pedido online a facturar' : 'Venta de mostrador a facturar' }} *
            </label>
            <button
              type="button"
              class="text-[11px] font-semibold text-corporativo-rosa hover:underline"
              @click="modoManual = !modoManual"
            >
              {{ modoManual ? 'Seleccionar de la lista de operaciones' : 'Ingresar ID numérico manualmente' }}
            </button>
          </div>

          <!-- MODO seleccion DE LISTA PRECARGADA -->
          <div v-if="!modoManual" class="space-y-2">
            <div class="relative">
              <select
                :value="formulario.referenciaId"
                :disabled="cargandoOperaciones"
                class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-corporativo-rosa focus:outline-none focus:ring-2 focus:ring-pink-100 disabled:bg-gray-100"
                @change="alSeleccionarOperacion"
              >
                <option value="">
                  {{ cargandoOperaciones ? 'Cargando operaciones disponibles...' : `-- Selecciona un ${formulario.origen === 'pedido' ? 'pedido' : 'venta'} existente --` }}
                </option>
                <option v-for="op in listaOperaciones" :key="op.id" :value="String(op.id)">
                  {{ op.etiqueta }}
                </option>
              </select>
            </div>

            <!-- Ficha resumen de la operación seleccionada -->
            <div v-if="operacionSeleccionada" class="flex items-start gap-2.5 rounded-xl border border-pink-100 bg-pink-50/70 p-3 text-xs">
              <CheckCircle2 class="mt-0.5 h-4 w-4 shrink-0 text-corporativo-rosa" />
              <div>
                <p class="font-bold text-gray-900">{{ operacionSeleccionada.etiqueta }}</p>
                <p class="text-gray-600">{{ operacionSeleccionada.subtexto }}</p>
              </div>
            </div>
          </div>

          <!-- MODO INGRESO MANUAL ALTERNATIVO -->
          <div v-else>
            <input
              v-model="formulario.referenciaId"
              type="number"
              min="1"
              max="2147483647"
              step="1"
              inputmode="numeric"
              required
              :placeholder="formulario.origen === 'pedido' ? 'Ej. 15' : 'Ej. 8'"
              class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-corporativo-rosa focus:outline-none focus:ring-2 focus:ring-pink-100"
            />
          </div>
        </div>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label class="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
              Fecha de emisión
            </label>
            <input
              v-model="formulario.fechaEmision"
              type="date"
              class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-corporativo-rosa focus:outline-none focus:ring-2 focus:ring-pink-100"
            />
          </div>

          <div>
            <label class="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
              Documento / NIT del cliente (opcional)
            </label>
            <input
              v-model="formulario.clienteDocumento"
              type="text"
              maxlength="30"
              pattern="[A-Za-z0-9.-]+"
              placeholder="Ej. 1020304050 o 900123456-1"
              class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-corporativo-rosa focus:outline-none focus:ring-2 focus:ring-pink-100"
            />
          </div>
        </div>

        <div>
          <label class="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
            Notas u observaciones
          </label>
          <textarea
            v-model="formulario.notas"
            rows="2"
            maxlength="250"
            placeholder="Observaciones adicionales para la factura..."
            class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-corporativo-rosa focus:outline-none focus:ring-2 focus:ring-pink-100"
          />
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
            :disabled="guardando || (!formulario.referenciaId && !modoManual)"
            class="inline-flex items-center gap-2 rounded-xl bg-corporativo-rosa px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-pink-700 disabled:opacity-40"
          >
            <Loader2 v-if="guardando" class="h-4 w-4 animate-spin" />
            <Save v-else class="h-4 w-4" />
            Emitir factura
          </button>
        </div>
      </form>
    </div>
  </ModalBase>
</template>
