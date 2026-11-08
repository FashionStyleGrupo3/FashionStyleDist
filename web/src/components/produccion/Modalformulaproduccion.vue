<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { X, Loader2, ChevronDown } from 'lucide-vue-next';
import { formulasProduccionApi, unidadDe, mensajeError } from '@/services/Produccionservicio';
import { useFormatoMoneda } from '@/composables/useFormatoMoneda';
import { useNotificacion } from '@/composables/useNotificacion';

const props = defineProps({
  formula: { type: Object, default: null },
  productoId: { type: [Number, String], required: true },
  materias: { type: Array, default: () => [] },
  proveedores: { type: Array, default: () => [] },
  unidades: { type: Array, default: () => [] },
  insumosEnReceta: { type: Array, default: () => [] },
});
const emit = defineEmits(['cerrar', 'guardado']);

const { formatearCOP } = useFormatoMoneda();
const { notificarExito, notificarError } = useNotificacion();

const vacio = () => ({ materia_prima_id: '', cantidad: 1, desperdicio_porcentaje: 0, proveedor_id: '' });

const form = ref(vacio());
const guardando = ref(false);
const esEdicion = computed(() => !!props.formula);

const dropdownProveedorAbierto = ref(false);
const dropdownRef = ref(null);

const cerrarDropdown = (e) => {
  if (dropdownRef.value && !dropdownRef.value.contains(e.target)) {
    dropdownProveedorAbierto.value = false;
  }
};

onMounted(() => document.addEventListener('click', cerrarDropdown));
onUnmounted(() => document.removeEventListener('click', cerrarDropdown));

const proveedorSeleccionadoNombre = computed(() => {
  if (!form.value.proveedor_id) return 'Sin proveedor asignado';
  const prov = props.proveedores.find(p => String(p.id) === String(form.value.proveedor_id));
  return prov ? prov.nombre : 'Sin proveedor asignado';
});

// --- CAMBIO AQUÍ: Validación segura para evitar el error de .some() ---
const materiasDisponibles = computed(() => {
  if (esEdicion.value) return props.materias;
  
  const receta = Array.isArray(props.insumosEnReceta) ? props.insumosEnReceta : [];
  
  return props.materias.filter(m => 
    !receta.some(c => String(c.materia_prima_id) === String(m.id_material))
  );
});

watch(
  () => props.formula,
  (f) => {
    form.value = f
      ? {
          materia_prima_id: f.materia_prima_id ?? '',
          cantidad: Number(f.cantidad ?? 1),
          desperdicio_porcentaje: Number(f.desperdicio_porcentaje ?? 0),
          proveedor_id: f.proveedor_id ?? '',
        }
      : vacio();
  },
  { immediate: true },
);

const materiaElegida = computed(() =>
  props.materias.find((m) => String(m.id_material) === String(form.value.materia_prima_id)),
);

const cantidadConDesperdicio = computed(
  () => Number(form.value.cantidad || 0) * (1 + Number(form.value.desperdicio_porcentaje || 0) / 100),
);

const costoEstimado = computed(
  () => cantidadConDesperdicio.value * Number(materiaElegida.value?.costo_unitario ?? 0),
);

async function guardar() {
  if (!form.value.materia_prima_id) {
    notificarError('Selecciona el insumo.');
    return;
  }
  const cantidad = String(form.value.cantidad ?? '').trim();
  if (!/^\d{1,4}(?:\.\d{1,4})?$/.test(cantidad) || Number(cantidad) < 0.0001 || Number(cantidad) > 1000) {
    notificarError('La cantidad debe estar entre 0,0001 y 1.000, con máximo 4 decimales.');
    return;
  }

  const payload = {
    producto_id: props.productoId,
    materia_prima_id: form.value.materia_prima_id,
    cantidad: Number(form.value.cantidad),
    unidad_medida_id: materiaElegida.value?.unidad_medida?.id ?? materiaElegida.value?.unidad_medida_id ?? null,
    costo_unitario_estimado: Number(materiaElegida.value?.costo_unitario ?? 0),
    proveedor_id: form.value.proveedor_id || null,
  };

  if (esEdicion.value && !props.formula.id_formula) {
    notificarError('La fórmula no trae id_formula.');
    return;
  }

  guardando.value = true;
  try {
    if (esEdicion.value) {
      await formulasProduccionApi.actualizar(props.formula.id_formula, payload);
      notificarExito('Insumo actualizado.');
    } else {
      await formulasProduccionApi.crear(payload);
      notificarExito('Insumo agregado.');
    }
    window.dispatchEvent(new CustomEvent('datos-actualizados'));
    emit('guardado');
  } catch (error) {
    notificarError(mensajeError(error, 'No se pudo guardar el insumo.'));
  } finally {
    guardando.value = false;
  }
}

function actualizarCantidad(e) {
  form.value.cantidad = e.target.value;
}

const claseInput =
  'w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-corporativo-rosa/40 focus:border-corporativo-rosa';
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form class="w-full max-w-lg rounded-2xl bg-white border border-gray-200 shadow-xl p-6 space-y-4" @submit.prevent="guardar">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold text-gray-900">
            {{ esEdicion ? 'Editar insumo de la fórmula' : 'Agregar insumo a la fórmula' }}
          </h3>
          <button type="button" class="p-1 text-gray-400 hover:text-gray-600" @click="emit('cerrar')">
            <X class="h-5 w-5" />
          </button>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Insumo</label>
          <select v-model="form.materia_prima_id" :class="claseInput">
            <option value="" disabled>Selecciona un insumo</option>
            <option v-for="m in materiasDisponibles" :key="m.id_material" :value="m.id_material">
              {{ m.nombre }} ({{ unidadDe(m, unidades) || 'sin unidad' }})
            </option>
          </select>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Cantidad por prenda
              <span v-if="materiaElegida" class="text-gray-400">({{ unidadDe(materiaElegida, unidades) }})</span>
            </label>
            <input :value="form.cantidad" type="text" inputmode="decimal" maxlength="9" :class="claseInput" @input="actualizarCantidad" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Desperdicio (%)</label>
            <div class="flex h-[42px] items-center rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-500">
              <template v-if="esEdicion">{{ form.desperdicio_porcentaje }}% · automático</template>
              <template v-else>Se asigna automáticamente</template>
            </div>
          </div>
        </div>

        <div ref="dropdownRef" class="relative">
          <label class="block text-sm font-medium text-gray-700 mb-1">Proveedor (opcional)</label>
          <button type="button" class="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-left flex justify-between items-center bg-white focus:outline-none focus:ring-2 focus:ring-corporativo-rosa/40 focus:border-corporativo-rosa" @click="dropdownProveedorAbierto = !dropdownProveedorAbierto">
            <span :class="form.proveedor_id ? 'text-gray-900' : 'text-gray-500'">{{ proveedorSeleccionadoNombre }}</span>
            <ChevronDown class="h-4 w-4 text-gray-400 transition-transform" :class="{ 'rotate-180': dropdownProveedorAbierto }" />
          </button>
          <div v-if="dropdownProveedorAbierto" class="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto rounded-xl bg-white border border-gray-200 shadow-lg">
            <ul class="py-1 text-sm text-gray-700">
              <li>
                <button type="button" class="w-full text-left px-3 py-2 hover:bg-gray-100" :class="{ 'bg-gray-50 font-medium': !form.proveedor_id }" @click="form.proveedor_id = ''; dropdownProveedorAbierto = false">
                  Sin proveedor asignado
                </button>
              </li>
              <li v-for="p in proveedores" :key="p.id">
                <button type="button" class="w-full text-left px-3 py-2 hover:bg-gray-100" :class="{ 'bg-gray-50 font-medium': String(form.proveedor_id) === String(p.id) }" @click="form.proveedor_id = p.id; dropdownProveedorAbierto = false">
                  {{ p.nombre }}
                </button>
              </li>
            </ul>
          </div>
        </div>

        <div v-if="materiaElegida" class="rounded-xl bg-gray-50 border border-gray-200 px-4 py-3 text-sm text-gray-700">
          Consumo real por prenda:
          <strong>{{ cantidadConDesperdicio.toLocaleString('es-CO', { maximumFractionDigits: 4 }) }}</strong>
          {{ unidadDe(materiaElegida, unidades) }} · Costo estimado:
          <strong>{{ formatearCOP(costoEstimado) }}</strong>
        </div>

        <div class="flex justify-end gap-2 pt-2">
          <button type="button" class="rounded-xl border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50" @click="emit('cerrar')">
            Cancelar
          </button>
          <button type="submit" :disabled="guardando" class="inline-flex items-center gap-2 rounded-xl bg-corporativo-rosa px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60">
            <Loader2 v-if="guardando" class="h-4 w-4 animate-spin" />
            {{ esEdicion ? 'Guardar cambios' : 'Agregar' }}
          </button>
        </div>
      </form>
    </div>
  </Teleport>
</template>
