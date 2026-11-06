<script setup>
import { ref, computed, watch } from 'vue';
import { X, Loader2 } from 'lucide-vue-next';
import { materiasPrimasApi, mensajeError } from '@/services/Produccionservicio';
import { useNotificacion } from '@/composables/useNotificacion';
import { filtrarCampo, filtrarNumero } from '@/utils/validacionCampos';

const props = defineProps({
  materia: { type: Object, default: null }, // null = crear
  unidades: { type: Array, default: () => [] },
});
const emit = defineEmits(['cerrar', 'guardado']);

const { notificarExito, notificarError } = useNotificacion();

const LIMITE_STOCK = 1000000;
const LIMITE_COSTO = 10000000;

const vacio = () => ({
  codigo: '',
  nombre: '',
  unidad_medida_id: '',
  stock: 0,
  stock_min: 0,
  costo_unitario: 0,
});

const form = ref(vacio());
const guardando = ref(false);
const esEdicion = computed(() => !!props.materia);

function filtrarFormulario(campo, tipo, limite, evento) {
  const valor = filtrarCampo(evento.target.value, tipo, limite);
  form.value[campo] = valor;
  evento.target.value = valor;
}

function actualizarNumero(campo, maxEnteros, maxDecimales, evento) {
  const valor = filtrarNumero(evento.target.value, maxEnteros, maxDecimales);
  form.value[campo] = valor;
  evento.target.value = valor;
}

watch(
  () => props.materia,
  (m) => {
    form.value = m
      ? {
          codigo: m.codigo ?? '',
          nombre: m.nombre ?? '',
          unidad_medida_id: m.unidad_medida_id ?? m.unidad_medida?.id ?? m.unidad?.id ?? '',
          stock: Number(m.stock ?? 0),
          stock_min: Number(m.stock_min ?? 0),
          costo_unitario: Number(m.costo_unitario ?? 0),
        }
      : vacio();
  },
  { immediate: true },
);

async function guardar() {
  if (!form.value.codigo.trim() || !form.value.nombre.trim() || !form.value.unidad_medida_id) {
    notificarError('Completa el código, el nombre y la unidad de medida.');
    return;
  }

  const { stock, stock_min, costo_unitario } = form.value;
  if ([stock, stock_min].some((v) => !Number.isInteger(Number(v)) || Number(v) < 0 || Number(v) > LIMITE_STOCK)) {
    notificarError(`El stock debe ser un número entero entre 0 y ${LIMITE_STOCK.toLocaleString('es-CO')}.`);
    return;
  }
  if (Number(costo_unitario) < 0 || Number(costo_unitario) > LIMITE_COSTO) {
    notificarError(`El costo unitario debe estar entre 0 y ${LIMITE_COSTO.toLocaleString('es-CO')}.`);
    return;
  }

  const payload = {
    codigo: form.value.codigo.trim(),
    nombre: form.value.nombre.trim(),
    unidad_medida_id: form.value.unidad_medida_id,
    stock: parseInt(form.value.stock, 10),
    stock_min: parseInt(form.value.stock_min, 10),
    costo_unitario: Number(form.value.costo_unitario),
    ...(esEdicion.value ? {} : { activo: true }),
  };

  guardando.value = true;
  try {
    if (esEdicion.value) {
      await materiasPrimasApi.actualizar(props.materia.id_material, payload);
      notificarExito('Materia prima actualizada correctamente.');
    } else {
      await materiasPrimasApi.crear(payload);
      notificarExito('Materia prima creada correctamente.');
    }
    emit('guardado');
  } catch (error) {
    notificarError(mensajeError(error, 'No se pudo guardar la materia prima.'));
  } finally {
    guardando.value = false;
  }
}

const claseInput =
  'w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-corporativo-rosa/40 focus:border-corporativo-rosa';
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form
        class="w-full max-w-lg rounded-2xl bg-white border border-gray-200 shadow-xl p-6 space-y-4"
        @submit.prevent="guardar"
      >
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold text-gray-900">
            {{ esEdicion ? 'Editar materia prima' : 'Nueva materia prima' }}
          </h3>
          <button type="button" class="p-1 text-gray-400 hover:text-gray-600" @click="emit('cerrar')">
            <X class="h-5 w-5" />
          </button>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">código</label>
            <input v-model="form.codigo" type="text" maxlength="30" placeholder="Ej. TEL-001" :class="claseInput" @input="filtrarFormulario('codigo', 'codigo', 30, $event)" />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
          <input v-model="form.nombre" type="text" maxlength="100" placeholder="Ej. Tela algodón, Hilo negro, Botones" :class="claseInput" @input="filtrarFormulario('nombre', 'comercial', 100, $event)" />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Unidad de medida</label>
          <select v-model="form.unidad_medida_id" :class="claseInput">
            <option value="" disabled>Selecciona una unidad</option>
            <option v-for="u in unidades" :key="u.id" :value="u.id">{{ u.nombre }} ({{ u.abreviatura }})</option>
          </select>
          <p v-if="!unidades.length" class="mt-1 text-xs text-amber-600">
            Primero crea las unidades de medida (metros, unidades, rollos, conos).
          </p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Stock actual</label>
            <input :value="form.stock" type="text" inputmode="numeric" maxlength="7" :class="claseInput" @input="actualizarNumero('stock', 7, 0, $event)" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Stock mínimo</label>
            <input :value="form.stock_min" type="text" inputmode="numeric" maxlength="7" :class="claseInput" @input="actualizarNumero('stock_min', 7, 0, $event)" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Costo unitario (COP)</label>
            <input :value="form.costo_unitario" type="text" inputmode="decimal" maxlength="11" :class="claseInput" @input="actualizarNumero('costo_unitario', 8, 2, $event)" />
          </div>
        </div>

        <div class="flex justify-end gap-2 pt-2">
          <button
            type="button"
            class="rounded-xl border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            @click="emit('cerrar')"
          >
            Cancelar
          </button>
          <button
            type="submit"
            :disabled="guardando"
            class="inline-flex items-center gap-2 rounded-xl bg-corporativo-rosa px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
          >
            <Loader2 v-if="guardando" class="h-4 w-4 animate-spin" />
            {{ esEdicion ? 'Guardar cambios' : 'Crear' }}
          </button>
        </div>
      </form>
    </div>
  </Teleport>
</template>