<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRecargaAutomatica } from '@/composables/useRecargaAutomatica';
import { Plus, Search, Pencil, Trash2, AlertTriangle, Check, X, Ruler } from 'lucide-vue-next';
import {
  materiasPrimasApi,
  unidadesMedidaApi,
  unidadDe,
  mensajeError,
} from '@/services/Produccionservicio';
import { useFormatoMoneda } from '@/composables/useFormatoMoneda';
import { useNotificacion } from '@/composables/useNotificacion';
import ModalMateriaPrima from '@/components/produccion/Modalmateriaprima.vue';
import { filtrarCampo } from '@/utils/validacionCampos';

const { formatearCOP } = useFormatoMoneda();
const { notificarExito, notificarError } = useNotificacion();

const materias = ref([]);
const unidades = ref([]);
const cargando = ref(false);
const busqueda = ref('');
const soloStockBajo = ref(false);

const modal = ref({ abierto: false, materia: null });

// Unidades de medida
const panelUnidades = ref(false);
const nuevaUnidad = ref({ nombre: '', abreviatura: '' });
const unidadEditando = ref(null); // { id, nombre, abreviatura }
const UNIDADES_BASE = [
  { nombre: 'Metro', abreviatura: 'm' },
  { nombre: 'Unidad', abreviatura: 'und' },
  { nombre: 'Rollo', abreviatura: 'rollo' },
  { nombre: 'Cono', abreviatura: 'cono' },
];

function filtrarUnidad(campo, tipo, limite, evento, modelo) {
  const valor = filtrarCampo(evento.target.value, tipo, limite);
  modelo[campo] = valor;
  evento.target.value = valor;
}

const esStockBajo = (m) => Number(m.stock) <= Number(m.stock_min);

const materiasFiltradas = computed(() => {
  const q = busqueda.value.trim().toLowerCase();
  return materias.value.filter((m) => {
    const coincide =
      !q || [m.nombre, m.codigo].some((campo) => (campo ?? '').toLowerCase().includes(q));
    return coincide && (!soloStockBajo.value || esStockBajo(m));
  });
});

const cantidadStockBajo = computed(() => materias.value.filter(esStockBajo).length);

async function cargar() {
  cargando.value = true;
  try {
    [materias.value, unidades.value] = await Promise.all([
      materiasPrimasApi.listar(),
      unidadesMedidaApi.listar(),
    ]);
  } catch (error) {
    notificarError(mensajeError(error, 'No se pudieron cargar las materias primas.'));
  } finally {
    cargando.value = false;
  }
}

function abrirModal(materia = null) {
  modal.value = { abierto: true, materia };
}

async function alGuardar() {
  modal.value.abierto = false;
  await cargar();
  // AVISO GLOBAL
  window.dispatchEvent(new CustomEvent('datos-actualizados'));
}

async function eliminar(m) {
  if (!window.confirm(`Éliminar "${m.nombre}"? Esta accion no se puede deshacer.`)) return;
  try {
    await materiasPrimasApi.eliminar(m.id_material);
    notificarExito('Materia prima eliminada.');
    await cargar();
    // AVISO GLOBAL
    window.dispatchEvent(new CustomEvent('datos-actualizados'));
  } catch (error) {
    notificarError(mensajeError(error, 'No se pudo eliminar (puede estar usada en una fórmula).'));
  }
}

// ---- Unidades de medida ----
async function agregarUnidad() {
  const nombre = nuevaUnidad.value.nombre.trim();
  const abreviatura = nuevaUnidad.value.abreviatura.trim();
  if (!nombre || !abreviatura) {
    notificarError('La unidad necesita nombre y abreviatura.');
    return;
  }
  try {
    await unidadesMedidaApi.crear({ nombre, abreviatura, activa: true });
    nuevaUnidad.value = { nombre: '', abreviatura: '' };
    unidades.value = await unidadesMedidaApi.listar();
    notificarExito('Unidad creada.');
    // AVISO GLOBAL
    window.dispatchEvent(new CustomEvent('datos-actualizados'));
  } catch (error) {
    notificarError(mensajeError(error, 'No se pudo crear la unidad.'));
  }
}

async function cargarUnidadesBase() {
  const existentes = unidades.value.map((u) => (u.nombre ?? '').toLowerCase());
  try {
    for (const base of UNIDADES_BASE.filter((b) => !existentes.includes(b.nombre.toLowerCase()))) {
      await unidadesMedidaApi.crear({ ...base, activa: true });
    }
    unidades.value = await unidadesMedidaApi.listar();
    notificarExito('Unidades base cargadas.');
    // AVISO GLOBAL
    window.dispatchEvent(new CustomEvent('datos-actualizados'));
  } catch (error) {
    notificarError(mensajeError(error, 'No se pudieron cargar las unidades base.'));
  }
}

async function guardarUnidad() {
  const { id, nombre, abreviatura } = unidadEditando.value;
  if (!nombre.trim() || !abreviatura.trim()) {
    notificarError('La unidad necesita nombre y abreviatura.');
    return;
  }
  try {
    await unidadesMedidaApi.actualizar(id, { nombre: nombre.trim(), abreviatura: abreviatura.trim() });
    unidadEditando.value = null;
    await cargar();
    notificarExito('Unidad actualizada.');
    // AVISO GLOBAL
    window.dispatchEvent(new CustomEvent('datos-actualizados'));
  } catch (error) {
    notificarError(mensajeError(error, 'No se pudo actualizar la unidad.'));
  }
}

async function eliminarUnidad(u) {
  if (!window.confirm(`Éliminar la unidad "${u.nombre}"?`)) return;
  try {
    await unidadesMedidaApi.eliminar(u.id);
    unidades.value = await unidadesMedidaApi.listar();
    notificarExito('Unidad eliminada.');
    // AVISO GLOBAL
    window.dispatchEvent(new CustomEvent('datos-actualizados'));
  } catch (error) {
    notificarError(mensajeError(error, 'No se pudo eliminar (puede estar en uso).'));
  }
}

onMounted(cargar);
useRecargaAutomatica(cargar);
</script>

<template>
  <!-- ... TU TEMPLATE SE QUEDA EXACTAMENTE IGUAL ... -->
  <div class="space-y-4">
    <!-- Barra superior -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="relative w-full sm:max-w-xs">
        <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          v-model="busqueda"
          type="text"
          maxlength="100"
          placeholder="Buscar por nombre o código..."
          class="w-full rounded-xl border border-gray-300 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-corporativo-rosa/40 focus:border-corporativo-rosa"
        />
      </div>
      <div class="flex flex-wrap gap-2">
        <button
          class="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          @click="panelUnidades = !panelUnidades"
        >
          <Ruler class="h-4 w-4" /> Unidades de medida
        </button>
        <button
          class="inline-flex items-center gap-2 rounded-xl bg-corporativo-rosa px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          @click="abrirModal()"
        >
          <Plus class="h-4 w-4" /> Nueva materia prima
        </button>
      </div>
    </div>

    <!-- Panel de unidades de medida -->
    <div v-if="panelUnidades" class="rounded-2xl bg-white border border-gray-200 shadow-sm p-4 space-y-3">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-semibold text-gray-900">Unidades de medida</h3>
        <button
          v-if="unidades.length < UNIDADES_BASE.length"
          class="text-xs font-medium text-corporativo-rosa hover:underline"
          @click="cargarUnidadesBase"
        >
          Cargar unidades base (Metro, Unidad, Rollo, Cono)
        </button>
      </div>

      <div class="flex flex-wrap gap-2">
        <div
          v-for="u in unidades"
          :key="u.id"
          class="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-sm"
        >
          <template v-if="unidadEditando?.id === u.id">
            <input
              v-model="unidadEditando.nombre"
              maxlength="50"
              placeholder="Nombre"
              class="w-24 rounded border border-gray-300 px-1 text-sm"
              @input="filtrarUnidad('nombre', 'comercial', 50, $event, unidadEditando)"
              @keyup.enter="guardarUnidad"
            />
            <input
              v-model="unidadEditando.abreviatura"
              maxlength="10"
              placeholder="Abrev."
              class="w-14 rounded border border-gray-300 px-1 text-sm"
              @input="filtrarUnidad('abreviatura', 'abreviatura', 10, $event, unidadEditando)"
              @keyup.enter="guardarUnidad"
            />
            <button class="text-green-600" @click="guardarUnidad"><Check class="h-4 w-4" /></button>
            <button class="text-gray-400" @click="unidadEditando = null"><X class="h-4 w-4" /></button>
          </template>
          <template v-else>
            <span>{{ u.nombre }} <span class="text-gray-400">({{ u.abreviatura }})</span></span>
            <button class="text-gray-400 hover:text-gray-700" @click="unidadEditando = { id: u.id, nombre: u.nombre, abreviatura: u.abreviatura ?? '' }">
              <Pencil class="h-3.5 w-3.5" />
            </button>
            <button class="text-gray-400 hover:text-red-600" @click="eliminarUnidad(u)">
              <Trash2 class="h-3.5 w-3.5" />
            </button>
          </template>
        </div>
        <p v-if="!unidades.length" class="text-sm text-gray-500">Año no hay unidades registradas.</p>
      </div>

      <div class="flex gap-2">
        <input
          v-model="nuevaUnidad.nombre"
          type="text"
          maxlength="50"
          placeholder="Nombre (ej. Metro)"
          class="w-full max-w-[11rem] rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-corporativo-rosa/40"
          @input="filtrarUnidad('nombre', 'comercial', 50, $event, nuevaUnidad)"
          @keyup.enter="agregarUnidad"
        />
        <input
          v-model="nuevaUnidad.abreviatura"
          type="text"
          maxlength="10"
          placeholder="Abrev. (ej. m)"
          class="w-full max-w-[8rem] rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-corporativo-rosa/40"
          @input="filtrarUnidad('abreviatura', 'abreviatura', 10, $event, nuevaUnidad)"
          @keyup.enter="agregarUnidad"
        />
        <button class="rounded-xl bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-800" @click="agregarUnidad">
          Agregar
        </button>
      </div>
    </div>

    <!-- Alerta global de stock bajo -->
    <button
      v-if="cantidadStockBajo"
      class="flex w-full items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-left text-sm text-red-700"
      @click="soloStockBajo = !soloStockBajo"
    >
      <AlertTriangle class="h-4 w-4 shrink-0" />
      <span>
        {{ cantidadStockBajo }} insumo(s) con stock igual o por debajo del minimoimo.
        <span class="underline">{{ soloStockBajo ? 'Ver todos' : 'Ver solo estos' }}</span>
      </span>
    </button>

    <!-- Tabla -->
    <div class="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead class="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th class="px-4 py-3">Insumo</th>
              <th class="px-4 py-3">Unidad</th>
              <th class="px-4 py-3 text-right">Stock</th>
              <th class="px-4 py-3 text-right">Minimoimo</th>
              <th class="px-4 py-3 text-right">Costo unitario</th>
              <th class="px-4 py-3">Estado</th>
              <th class="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-if="cargando">
              <td colspan="7" class="px-4 py-8 text-center text-gray-500">Cargando...</td>
            </tr>
            <tr v-else-if="!materiasFiltradas.length">
              <td colspan="7" class="px-4 py-8 text-center text-gray-500">No hay materias primas para mostrar.</td>
            </tr>
            <tr
              v-for="m in materiasFiltradas"
              :key="m.id_material"
              :class="esStockBajo(m) ? 'bg-red-50/60' : ''"
            >
              <td class="px-4 py-3">
                <div class="font-medium text-gray-900">{{ m.nombre }}</div>
                <div v-if="m.codigo" class="text-xs text-gray-400">{{ m.codigo }}</div>
              </td>
              <td class="px-4 py-3 text-gray-600">{{ unidadDe(m, unidades) || '—' }}</td>
              <td
                class="px-4 py-3 text-right font-semibold"
                :class="esStockBajo(m) ? 'text-red-600' : 'text-gray-900'"
              >
                {{ Number(m.stock).toLocaleString('es-CO') }}
              </td>
              <td class="px-4 py-3 text-right text-gray-600">{{ Number(m.stock_min).toLocaleString('es-CO') }}</td>
              <td class="px-4 py-3 text-right text-gray-900">{{ formatearCOP(m.costo_unitario) }}</td>
              <td class="px-4 py-3">
                <span
                  v-if="esStockBajo(m)"
                  class="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700"
                >
                  <AlertTriangle class="h-3 w-3" /> Stock bajo
                </span>
                <span v-else class="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                  Disponible
                </span>
              </td>
              <td class="px-4 py-3">
                <div class="flex justify-end gap-1">
                  <button class="p-2 text-gray-500 hover:text-corporativo-rosa" title="Editar" @click="abrirModal(m)">
                    <Pencil class="h-4 w-4" />
                  </button>
                  <button class="p-2 text-gray-500 hover:text-red-600" title="Eliminar" @click="eliminar(m)">
                    <Trash2 class="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <ModalMateriaPrima
      v-if="modal.abierto"
      :materia="modal.materia"
      :unidades="unidades"
      @cerrar="modal.abierto = false"
      @guardado="alGuardar"
    />
  </div>
</template>
