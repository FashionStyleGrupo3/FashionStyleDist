<script setup>
import { ref, computed, watch } from 'vue';
import { Plus, Trash2, X, Save, Loader2 } from 'lucide-vue-next';
import ModalBase from '@/components/comunes/ModalBase.vue';
import clienteApi from '@/services/clienteApi';
import { useFormatoMoneda } from '@/composables/useFormatoMoneda';
import { useNotificacion } from '@/composables/useNotificacion';
import { filtrarNumero } from '@/utils/validacionCampos';

const props = defineProps({
  abierto: { type: Boolean, default: false },
  productos: { type: Array, default: () => [] },
  materiasPrimas: { type: Array, default: () => [] },
  unidades: { type: Array, default: () => [] },
});

const emit = defineEmits(['cerrar', 'creada']);

const { formatearCOP } = useFormatoMoneda();
const { notificarExito, notificarError } = useNotificacion();

const productoId = ref('');
const notas = ref('');
const consumos = ref([]);
const guardando = ref(false);
const error = ref(null);

watch(() => props.abierto, (abierto) => {
  if (abierto) {
    productoId.value = '';
    notas.value = '';
    consumos.value = [crearConsumoVacio()];
    error.value = null;
  }
});

function crearConsumoVacio() {
  return {
    materia_prima_id: '',
    cantidad: 0,
    unidad_medida_id: '',
    costo_unitario_estimado: 0,
  };
}

function agregarConsumo() {
  consumos.value.push(crearConsumoVacio());
}

function eliminarConsumo(idx) {
  consumos.value.splice(idx, 1);
  if (!consumos.value.length) {
    consumos.value.push(crearConsumoVacio());
  }
}

function actualizarCantidad(consumo, evento) {
  const valor = filtrarNumero(evento.target.value, 4, 2);
  consumo.cantidad = valor;
  evento.target.value = valor;
}

function alCambiarMateriaPrima(consumo) {
  const insumo = props.materiasPrimas.find(m => String(m.id) === String(consumo.materia_prima_id));
  if (insumo) {
    consumo.costo_unitario_estimado = insumo.costo_unitario;
    const unidad = props.unidades.find(u =>
      u.nombre?.toLowerCase() === insumo.unidad?.toLowerCase() ||
      u.abreviatura?.toLowerCase() === insumo.unidad?.toLowerCase()
    );
    if (unidad) consumo.unidad_medida_id = unidad.id;
  }
}

// --- NUEVO: Filtro para evitar insumos duplicados ---
const materiasDisponibles = computed(() => {
  return (indiceActual) => {
    const idsSeleccionados = consumos.value
      .filter((c, idx) => idx !== indiceActual && c.materia_prima_id)
      .map(c => String(c.materia_prima_id));

    return props.materiasPrimas.filter(m => !idsSeleccionados.includes(String(m.id)));
  };
});

const costoMateriales = computed(() => {
  return consumos.value.reduce((total, c) => {
    return total + (Number(c.cantidad) || 0) * (Number(c.costo_unitario_estimado) || 0);
  }, 0);
});

const puedeGuardar = computed(() => {
  if (!productoId.value) return false;
  if (!consumos.value.length) return false;
  return consumos.value.every(c => {
    const cantidad = String(c.cantidad ?? '').trim();
    return c.materia_prima_id
      && /^\d{1,4}(?:\.\d{1,2})?$/.test(cantidad)
      && Number(cantidad) > 0
      && Number(cantidad) <= 1000;
  });
});

async function guardar() {
  if (!puedeGuardar.value) {
    error.value = 'Completa producto e insumo. La cantidad debe estar entre 0.01 y 1000, con mximo 2 decimales.';
    return;
  }

  error.value = null;
  guardando.value = true;

  try {
    const payload = {
      producto_id: productoId.value,
      notas: notas.value || null,
      consumos: consumos.value.map(c => ({
        materia_prima_id: c.materia_prima_id,
        cantidad: Number(c.cantidad),
        unidad_medida_id: c.unidad_medida_id || null,
        costo_unitario_estimado: Number(c.costo_unitario_estimado) || 0,
      })),
    };

    const res = await clienteApi.post('/formulas-produccion/lote', payload);
    notificarExito(res.data?.message || 'Frmula creada correctamente.');
    emit('creada', res.data?.data);
    emit('cerrar');
  } catch (e) {
    console.error('[ModalNuevaFormula] Error:', e);
    const msg = e.response?.data?.message
      || (e.response?.data?.errors && Object.values(e.response.data.errors).flat().join(' '))
      || 'No se pudo crear la frmula.';
    error.value = msg;
    notificarError(msg);
  } finally {
    guardando.value = false;
  }
}

function cerrar() {
  if (guardando.value) return;
  emit('cerrar');
}
</script>

<template>
  <ModalBase :abierto="abierto" titulo="Nueva frmula de produccion" @cerrar="cerrar">
    <div class="p-6">
      <div class="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 class="text-xl font-extrabold text-gray-900 font-titulos">Nueva frmula de produccion</h2>
          <p class="mt-1 text-sm text-gray-500">
            Define la prenda y los insumos que requiere. Despuís podrís calcular sus costos.
          </p>
        </div>
        <button
          type="button"
          class="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition"
          :disabled="guardando"
          @click="cerrar"
        >
          <X class="h-5 w-5" />
        </button>
      </div>

      <div class="grid grid-cols-1 gap-4 mb-5">
        <div>
          <label class="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
            Producto *
          </label>
          <select
            v-model="productoId"
            class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-corporativo-rosa focus:outline-none focus:ring-2 focus:ring-pink-100"
          >
            <option value="">Selecciona un producto</option>
            <option v-for="p in productos" :key="p.id ?? p.id_producto" :value="p.id ?? p.id_producto">
              {{ p.nombre }}
            </option>
          </select>
        </div>
      </div>

      <div class="mb-5">
        <label class="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
          Notas (opcional)
        </label>
          <textarea
            v-model="notas"
            rows="2"
            maxlength="500"
            placeholder="Ej: Tela principal para la confección."
            class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-corporativo-rosa focus:outline-none focus:ring-2 focus:ring-pink-100"
            @input="(e)=>{ notas = String(e.target.value).slice(0,500); e.target.value = notas; }"
          ></textarea>
      </div>

      <div class="rounded-xl border border-gray-200 overflow-hidden mb-4">
        <div class="bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-center justify-between">
          <h3 class="text-sm font-bold uppercase tracking-wide text-gray-700">
            Insumos de la frmula
          </h3>
          <button
            type="button"
            class="inline-flex items-center gap-1.5 rounded-lg bg-corporativo-rosa px-3 py-1.5 text-xs font-bold text-white hover:bg-pink-700 transition"
            @click="agregarConsumo"
          >
            <Plus class="h-3.5 w-3.5" /> Aádir insumo
          </button>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-white">
              <tr class="text-left text-xs uppercase tracking-wide text-gray-500 border-b border-gray-100">
                <th class="px-3 py-2 font-semibold">Insumo *</th>
                <th class="px-3 py-2 font-semibold text-center">Cantidad *</th>
                <th class="px-3 py-2 font-semibold text-center">Unidad</th>
                <th class="px-3 py-2 font-semibold text-center">Desperdicio %</th>
                <th class="px-3 py-2 font-semibold text-right">Costo unit.</th>
                <th class="px-3 py-2 font-semibold text-right">Subtotal</th>
                <th class="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-for="(consumo, idx) in consumos" :key="idx">
                <td class="px-3 py-2">
                  <select
                    v-model="consumo.materia_prima_id"
                    class="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-corporativo-rosa focus:outline-none"
                    @change="alCambiarMateriaPrima(consumo)"
                  >
                    <option value="">Selecciona</option>
                    <!-- CAMBIO AQUÍ -->
                    <option v-for="m in materiasDisponibles(idx)" :key="m.id" :value="m.id">
                      {{ m.nombre }}
                    </option>
                  </select>
                </td>
                <td class="px-3 py-2 text-center">
                  <input
                    :value="consumo.cantidad"
                    type="text"
                    inputmode="decimal"
                    maxlength="7"
                    class="w-20 rounded-md border border-gray-300 px-2 py-1.5 text-center text-sm focus:border-corporativo-rosa focus:outline-none"
                    @input="actualizarCantidad(consumo, $event)"
                  />
                </td>
                <td class="px-3 py-2 text-center">
                  <select
                    v-model="consumo.unidad_medida_id"
                    class="rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-corporativo-rosa focus:outline-none"
                  >
                    <option value="">—</option>
                    <option v-for="u in unidades" :key="u.id" :value="u.id">
                      {{ u.abreviatura || u.nombre }}
                    </option>
                  </select>
                </td>
                <td class="px-3 py-2 text-center">
                  <span class="text-xs italic text-gray-400">automático</span>
                </td>
                <td class="px-3 py-2 text-right text-gray-700 whitespace-nowrap">
                  {{ formatearCOP(consumo.costo_unitario_estimado) }}
                </td>
                <td class="px-3 py-2 text-right font-semibold text-gray-900 whitespace-nowrap">
                  {{ formatearCOP((Number(consumo.cantidad) || 0) * (Number(consumo.costo_unitario_estimado) || 0)) }}
                </td>
                <td class="px-3 py-2 text-right">
                  <button
                    type="button"
                    class="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 transition"
                    title="Quitar insumo"
                    @click="eliminarConsumo(idx)"
                  >
                    <Trash2 class="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            </tbody>
            <tfoot class="bg-gray-50 border-t border-gray-200">
              <tr>
                <td colspan="5" class="px-3 py-2 text-right text-sm font-semibold text-gray-600">
                  Costo materiales (el desperdicio lo suma el sistema):
                </td>
                <td class="px-3 py-2 text-right font-bold text-corporativo-rosa whitespace-nowrap">
                  {{ formatearCOP(costoMateriales) }}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div
        v-if="error"
        class="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
      >
        {{ error }}
      </div>

      <div class="flex justify-end gap-3">
        <button
          type="button"
          class="px-4 py-2.5 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition"
          :disabled="guardando"
          @click="cerrar"
        >
          Cancelar
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-corporativo-rosa hover:bg-pink-700 rounded-xl shadow transition disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="!puedeGuardar || guardando"
          @click="guardar"
        >
          <Loader2 v-if="guardando" class="h-4 w-4 animate-spin" />
          <Save v-else class="h-4 w-4" />
          {{ guardando ? 'Guardando...' : 'Guardar frmula' }}
        </button>
      </div>
    </div>
  </ModalBase>
</template>
